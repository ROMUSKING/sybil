import re
import xml.etree.ElementTree as ET
from src.model_manager import ModelManager
from src.tools import ToolRegistry, tool_registry as global_tool_registry
from src.logger import logger

class Agent:
    """Base class for all agents."""
    def __init__(self, name: str, model_manager: ModelManager, model_name: str):
        self.name = name
        self.model_manager = model_manager
        self.model_name = model_name

    def run(self, **kwargs):
        raise NotImplementedError

class SoftwareArchitectAgent(Agent):
    """Designs the software architecture and creates a technical blueprint."""
    def _create_system_prompt(self):
        return """You are a Software Architect. Your role is to take a high-level user request and create a detailed, hierarchical technical blueprint.

Your final output must be a single XML block enclosed in `<blueprint>` tags.
The blueprint can contain nested `<module>` elements to represent the project structure.
Each module can specify its dependencies on other modules.
Each module must contain a list of `<task>` elements.

Example of a nested blueprint with dependencies:
<blueprint>
  <module name="Database">
    <tasks>
      <task id="db-1" description="Define the User schema in `src/models/user.py`." />
    </tasks>
  </module>
  <module name="API">
    <dependencies>
      <dependency>Database</dependency>
    </dependencies>
    <tasks>
      <task id="api-1" description="Implement the `/users` endpoint in `src/api/routes.py`. It should use the User model." />
    </tasks>
  </module>
</blueprint>"""

    def run(self, task_description: str) -> str:
        logger.info(f"{self.name} starting task", extra={"agent_name": self.name, "model_name": self.model_name, "task": task_description})
        prompt = self._create_system_prompt()
        full_prompt = f"{prompt}\n\nUser Request: {task_description}"
        raw_response = self.model_manager.send_request(full_prompt, friendly_model_name=self.model_name)
        logger.info(f"Raw response from architect", extra={"response": raw_response})
        blueprint_match = re.search(r"<blueprint>.*</blueprint>", raw_response, re.DOTALL)
        if blueprint_match:
            return blueprint_match.group(0)
        logger.error("Could not generate a valid blueprint from architect response")
        return "Error: Could not generate a valid blueprint."

class DeveloperAgent(Agent):
    """Writes code to implement a single task from the blueprint."""
    def __init__(self, model_manager: ModelManager, model_name: str, tool_registry: ToolRegistry):
        super().__init__("DeveloperAgent", model_manager, model_name)
        self.tool_registry = tool_registry
        self.max_iterations = 10

    def _create_system_prompt(self, task_description, context):
        tool_docs = "".join([f"- {name}: {func.__doc__}\n" for name, func in self.tool_registry._tools.items()])
        return f"""You are a DeveloperAgent. Your goal is to complete the given programming task by following a strict TDD workflow.

**Context from Architect:**
{context}

**Current Task:**
{task_description}

**Available Tools:**
{tool_docs}

When the tests pass and the task is complete, use the `<final_answer>` tag with the file paths you created or modified.
"""

    def run(self, task_description: str, context: str) -> dict:
        logger.info(f"{self.name} starting task", extra={"agent_name": self.name, "model_name": self.model_name, "task": task_description})
        system_prompt = self._create_system_prompt(task_description, context)
        history = [f"Starting development for task: {task_description}"]

        for i in range(self.max_iterations):
            prompt = "\n".join(history)
            full_prompt = f"{system_prompt}\n\n{prompt}"
            raw_response = self.model_manager.send_request(full_prompt, friendly_model_name=self.model_name)

            final_answer_match = re.search(r"<final_answer>(.*?)</final_answer>", raw_response, re.DOTALL)
            if final_answer_match:
                logger.info("DeveloperAgent finished task.", extra={"task": task_description})
                files = re.findall(r"<file>(.*?)</file>", final_answer_match.group(1))
                return {"status": "success", "files": files}

            tool_match = re.search(r"<tool>(.*?)</tool>", raw_response, re.DOTALL)
            if not tool_match:
                history.append("Observation: Invalid action format.")
                continue

            tool_xml = tool_match.group(1)
            tool_name = re.search(r"<tool_name>(.*?)</tool_name>", tool_xml, re.DOTALL).group(1).strip()
            params_xml = re.search(r"<tool_params>(.*?)</tool_params>", tool_xml, re.DOTALL)
            params = {m.group(1): m.group(2) for m in re.finditer(r"<(.*?)>(.*?)</\1>", params_xml.group(1).strip())} if params_xml else {}

            tool_function = self.tool_registry.get_tool(tool_name)
            history.append(f"Action: {tool_match.group(0)}")

            if not tool_function:
                observation = f"Error: Tool '{tool_name}' not found."
            else:
                try: observation = tool_function(**params)
                except Exception as e: observation = f"Error executing tool '{tool_name}': {e}"
            history.append(f"Observation: {observation}")

        logger.error("DeveloperAgent failed to complete task in max iterations", extra={"task": task_description})
        return {"status": "failure", "reason": "Max iterations reached."}

class ReviewerAgent(Agent):
    """Reviews code for correctness, style, and adherence to the plan."""
    def _create_system_prompt(self, task_description, context, files_content):
        return f"""You are a ReviewerAgent. Your job is to review the submitted code.

**Context from Architect:**
{context}

**Original Task for this Code:**
{task_description}

**Submitted Files:**
{files_content}

Your final output must be a single XML block `<review><status>approved/rejected</status><comment>...</comment></review>`.
"""

    def run(self, task_description: str, context: str, files: list[str]) -> dict:
        logger.info(f"{self.name} starting review", extra={"agent_name": self.name, "model_name": self.model_name, "task": task_description})
        files_content = ""
        for file_path in files:
            try:
                with open(file_path, 'r') as f: content = f.read()
                files_content += f"\n--- {file_path} ---\n{content}\n"
            except Exception as e:
                logger.error("Reviewer could not read file", extra={"file_path": file_path, "error": str(e)})
                return {"status": "error", "comment": f"Could not read file {file_path}: {e}"}

        prompt = self._create_system_prompt(task_description, context, files_content)
        raw_response = self.model_manager.send_request(prompt, friendly_model_name=self.model_name)

        review_match = re.search(r"<review>(.*?)</review>", raw_response, re.DOTALL)
        if review_match:
            status = re.search(r"<status>(.*?)</status>", review_match.group(1)).group(1).strip()
            comment = re.search(r"<comment>(.*?)</comment>", review_match.group(1)).group(1).strip()
            return {"status": status, "comment": comment}

        logger.error("Could not parse review from reviewer response", extra={"response": raw_response})
        return {"status": "error", "comment": "Could not parse review."}

class OrchestratorAgent(Agent):
    """Orchestrates the workflow between other specialized agents."""
    def __init__(self, model_manager: ModelManager, config: dict):
        super().__init__("OrchestratorAgent", model_manager, "n/a")
        agent_models = config.get("agent_models", {})
        self.architect = SoftwareArchitectAgent("SoftwareArchitectAgent", model_manager, agent_models.get("architect"))
        self.developer = DeveloperAgent(model_manager, agent_models.get("developer"), global_tool_registry)
        self.reviewer = ReviewerAgent("ReviewerAgent", model_manager, agent_models.get("reviewer"))

    def _parse_blueprint(self, blueprint_xml: str):
        # ... (same as before)
        root = ET.fromstring(blueprint_xml)
        graph, tasks_map = {}, {}
        for module in root.findall('.//module'):
            name = module.get('name')
            if name not in graph: graph[name], tasks_map[name] = [], []
            for dep in module.findall('./dependencies/dependency'): graph[name].append(dep.text)
            for task in module.findall('./tasks/task'): tasks_map[name].append(task.get('description'))
        return graph, tasks_map

    def _topological_sort(self, graph):
        # ... (same as before)
        sorted_modules, visited = [], set()
        def visit(module):
            if module in visited: return
            visited.add(module)
            for dep in graph.get(module, []): visit(dep)
            sorted_modules.append(module)
        for module in graph:
            if module not in visited: visit(module)
        return sorted_modules

    def run(self, task_description: str):
        logger.info("Orchestrator starting task.", extra={"task": task_description})
        blueprint_xml = self.architect.run(task_description)
        logger.info("Blueprint received from Architect.", extra={"blueprint": blueprint_xml})
        try:
            graph, tasks_map = self._parse_blueprint(blueprint_xml)
            sorted_modules = self._topological_sort(graph)
        except Exception as e:
            logger.error("Failed to parse blueprint", extra={"error": str(e)})
            return "Orchestration failed: Could not parse blueprint."

        logger.info("Determined module execution order.", extra={"order": sorted_modules})
        for module_name in sorted_modules:
            logger.info(f"Starting module", extra={"module_name": module_name})
            for task in tasks_map[module_name]:
                max_retries, current_task_description = 3, task
                for i in range(max_retries):
                    logger.info(f"Attempt {i+1}/{max_retries} for task.", extra={"task": task})
                    context = f"Module: {module_name}"
                    dev_result = self.developer.run(task_description=current_task_description, context=context)
                    if dev_result.get("status") == "success":
                        review_result = self.reviewer.run(task_description=task, context=context, files=dev_result.get("files", []))
                        if review_result.get("status") == "approved":
                            logger.info("Task approved.", extra={"task": task})
                            break
                        else:
                            feedback = review_result.get('comment', 'No comment provided.')
                            logger.warning("Task rejected.", extra={"task": task, "feedback": feedback})
                            current_task_description = f"{task}\n\nPlease address the following feedback:\n{feedback}"
                    else:
                        logger.error("Development failed for task.", extra={"task": task})
                        return "Orchestration failed during development."
                else:
                    logger.error("Task failed after max retries.", extra={"task": task})
                    return "Orchestration failed: Task could not be completed successfully."

        logger.info("Orchestration complete.")
        return "Orchestration complete."
