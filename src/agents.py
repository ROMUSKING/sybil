import re
import time
import xml.etree.ElementTree as ET
import uuid
from typing import Optional
from src.model_manager import ModelManager
from src.tools import ToolRegistry, tool_registry as global_tool_registry
from src.logger import logger
from src.graph_state import GraphState

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

    def run(self, state: GraphState) -> dict:
        task_description = state['initial_request']
        logger.info(f"{self.name} starting task", extra={"agent_name": self.name, "model_name": self.model_name, "task": task_description})
        prompt = self._create_system_prompt()
        full_prompt = f"{prompt}\n\nUser Request: {task_description}"
        raw_response = self.model_manager.send_request(full_prompt, friendly_model_name=self.model_name)
        logger.info(f"Raw response from architect", extra={"response": raw_response})
        blueprint_match = re.search(r"<blueprint>.*</blueprint>", raw_response, re.DOTALL)
        if blueprint_match:
            return {"blueprint_xml": blueprint_match.group(0)}
        else:
            logger.error("Could not generate a valid blueprint from architect response")
            return {"error": "Could not generate a valid blueprint."}

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

    def run(self, state: GraphState) -> dict:
        task_description = state['current_task']['description']
        context = state['current_task']['context']
        feedback = state.get('review_feedback')

        if feedback and feedback != "approved":
            task_with_feedback = f"{task_description}\n\nPlease address the following feedback:\n{feedback}"
        else:
            task_with_feedback = task_description

        logger.info(f"{self.name} starting task", extra={"agent_name": self.name, "model_name": self.model_name, "task": task_with_feedback})
        system_prompt = self._create_system_prompt(task_with_feedback, context)
        history = [f"Starting development for task: {task_with_feedback}"]

        for i in range(self.max_iterations):
            prompt = "\n".join(history)
            full_prompt = f"{system_prompt}\n\n{prompt}"
            raw_response = self.model_manager.send_request(full_prompt, friendly_model_name=self.model_name)

            final_answer_match = re.search(r"<final_answer>(.*?)</final_answer>", raw_response, re.DOTALL)
            if final_answer_match:
                logger.info("DeveloperAgent finished task.", extra={"task": task_description})
                files = re.findall(r"<file>(.*?)</file>", final_answer_match.group(1))
                return {"current_files": files}

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
                logger.error("Tool not found", extra={"tool_name": tool_name})
            else:
                logger.info("DeveloperAgent is calling tool", extra={"tool_name": tool_name, "params": params})
                try:
                    observation = tool_function(**params)
                except Exception as e:
                    observation = f"Error executing tool '{tool_name}': {e}"
                    logger.error("Error executing tool", extra={"tool_name": tool_name, "params": params, "error": str(e)})

            logger.info("Tool observation", extra={"tool_name": tool_name, "observation": observation})
            history.append(f"Observation: {observation}")

        logger.error("DeveloperAgent failed to complete task in max iterations", extra={"task": task_description})
        return {"error": "Developer failed to complete task in max iterations."}

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

    def run(self, state: GraphState) -> dict:
        task_description = state['current_task']['description']
        context = state['current_task']['context']
        files = state['current_files']

        logger.info(f"{self.name} starting review", extra={"agent_name": self.name, "model_name": self.model_name, "task": task_description})
        files_content = ""
        read_file_tool = global_tool_registry.get_tool("read_file")
        for file_path in files:
            content = read_file_tool(file_path)
            if "Error reading file" in content:
                logger.error("Reviewer could not read file", extra={"file_path": file_path, "error": content})
                return {"error": f"Could not read file {file_path}: {content}"}
            files_content += f"\n--- {file_path} ---\n{content}\n"

        prompt = self._create_system_prompt(task_description, context, files_content)
        raw_response = self.model_manager.send_request(prompt, friendly_model_name=self.model_name)

        review_match = re.search(r"<review>(.*?)</review>", raw_response, re.DOTALL)
        if review_match:
            review_content = review_match.group(1)
            status_match = re.search(r"<status>(.*?)</status>", review_content)
            comment_match = re.search(r"<comment>(.*?)</comment>", review_content)

            status = status_match.group(1).strip() if status_match else "rejected"
            comment = comment_match.group(1).strip() if comment_match else "No comment provided."

            if status == "approved":
                return {"review_feedback": "approved"}
            else:
                return {"review_feedback": comment}

        logger.error("Could not parse review from reviewer response", extra={"response": raw_response})
        return {"error": "Could not parse review from reviewer response."}

class DocumenterAgent(Agent):
    """Analyzes the completed session and updates documentation."""
    def __init__(self, model_manager: ModelManager, model_name: str, tool_registry: ToolRegistry):
        super().__init__("DocumenterAgent", model_manager, model_name)
        self.tool_registry = tool_registry

    def _create_system_prompt(self, session_summary: str, readme_content: str) -> str:
        return f"""You are a DocumenterAgent. Your task is to update the project's README.md file based on a summary of the work completed in the most recent session.

**Session Summary:**
{session_summary}

**Current README.md content:**
```markdown
{readme_content}
```

Your goal is to integrate the session summary into the README.md in a clear and concise way. You can add a new section, update an existing one, or simply append the summary. The final output must be the complete, updated content of the README.md file, enclosed in `<readme>` tags.
"""

    def run(self, state: GraphState) -> dict:
        logger.info(f"{self.name} starting task.", extra={"agent_name": self.name})

        read_file = self.tool_registry.get_tool("read_file")
        write_file = self.tool_registry.get_tool("write_file")

        readme_content = read_file("README.md")
        if "Error reading file" in readme_content:
            logger.error("Could not read README.md", extra={"error": readme_content})
            return {"error": "Could not read README.md"}

        # Create a summary of the session
        session_summary = f"""
- Initial Request: {state.get('initial_request')}
- Blueprint: {state.get('blueprint_xml')}
- Final Files: {state.get('current_files')}
- Errors Encountered: {state.get('error')}
"""

        prompt = self._create_system_prompt(session_summary, readme_content)
        raw_response = self.model_manager.send_request(prompt, friendly_model_name=self.model_name)

        readme_match = re.search(r"<readme>(.*?)</readme>", raw_response, re.DOTALL)
        if readme_match:
            new_readme_content = readme_match.group(1).strip()
            result = write_file("README.md", new_readme_content)
            if "Error writing to file" in result:
                logger.error("Could not write to README.md", extra={"error": result})
                return {"error": "Could not write to README.md"}
            logger.info("README.md updated successfully.")
            return {} # End of workflow
        else:
            logger.error("Could not parse new README content from response", extra={"response": raw_response})
            return {"error": "Could not parse new README content."}


from src.graph import AgentGraph

class OrchestratorAgent(Agent):
    """Orchestrates the workflow between other specialized agents using a state graph."""
    def __init__(self, model_manager: ModelManager, config: dict):
        super().__init__("OrchestratorAgent", model_manager, "n/a")
        agent_models = config.get("agent_models", {})

        # Still need to instantiate agents to pass them to the graph
        architect = SoftwareArchitectAgent("SoftwareArchitectAgent", model_manager, agent_models.get("architect"))
        developer = DeveloperAgent(model_manager, agent_models.get("developer"), global_tool_registry)
        reviewer = ReviewerAgent("ReviewerAgent", model_manager, agent_models.get("reviewer"))
        documenter = DocumenterAgent(model_manager, agent_models.get("documenter"), global_tool_registry)

        self.agent_graph = AgentGraph(architect, developer, reviewer, documenter)
        # Note: Performance tracking would need to be re-implemented, perhaps via LangSmith or graph callbacks.
        self.performance_data = {}

    def get_performance_report(self):
        # This is now a stub. Real performance tracking would need a new implementation.
        logger.warning("Performance tracking is not fully implemented in the new graph-based orchestrator.")
        return self.performance_data

    def run(self, task_description: str, session_id: Optional[str] = None):
        logger.info("Orchestrator starting task.", extra={"task": task_description})

        # If no session_id is provided, create a new one.
        session_id = session_id or str(uuid.uuid4())
        logger.info(f"Using session ID: {session_id}")


        final_state = self.agent_graph.run(task_description, session_id)

        if final_state.get("error"):
            logger.error("Orchestration failed.", extra={"error": final_state["error"]})
            return f"Orchestration failed: {final_state['error']}"

        logger.info("Orchestration complete.")
        return "Orchestration complete."
