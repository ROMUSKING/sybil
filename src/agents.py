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
    def __init__(self, name: str, model_manager: ModelManager, model_names: list[str]):
        self.name = name
        self.model_manager = model_manager
        self.model_names = model_names

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
        logger.info(f"{self.name} starting task", extra={"agent_name": self.name, "model_names": self.model_names, "task": task_description})
        prompt = self._create_system_prompt()
        full_prompt = f"{prompt}\n\nUser Request: {task_description}"
        raw_response = self.model_manager.send_request(full_prompt, friendly_model_names=self.model_names)
        logger.info(f"Raw response from architect", extra={"response": raw_response})
        blueprint_match = re.search(r"<blueprint>.*</blueprint>", raw_response, re.DOTALL)
        if blueprint_match:
            return {"blueprint_xml": blueprint_match.group(0)}
        else:
            logger.error("Could not generate a valid blueprint from architect response")
            return {"error": "Could not generate a valid blueprint."}

class DeveloperAgent(Agent):
    """Writes code to implement a single task from the blueprint."""
    def __init__(self, model_manager: ModelManager, model_names: list[str], tool_registry: ToolRegistry):
        super().__init__("DeveloperAgent", model_manager, model_names)
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

        logger.info(f"{self.name} starting task", extra={"agent_name": self.name, "model_names": self.model_names, "task": task_with_feedback})
        system_prompt = self._create_system_prompt(task_with_feedback, context)
        history = [f"Starting development for task: {task_with_feedback}"]

        for i in range(self.max_iterations):
            prompt = "\n".join(history)
            full_prompt = f"{system_prompt}\n\n{prompt}"
            raw_response = self.model_manager.send_request(full_prompt, friendly_model_names=self.model_names)

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
            else:
                try: observation = tool_function(**params)
                except Exception as e: observation = f"Error executing tool '{tool_name}': {e}"
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

        logger.info(f"{self.name} starting review", extra={"agent_name": self.name, "model_names": self.model_names, "task": task_description})
        files_content = ""
        for file_path in files:
            try:
                # In a real scenario, you'd use a tool to read files
                with open(file_path, 'r') as f: content = f.read()
                files_content += f"\n--- {file_path} ---\n{content}\n"
            except Exception as e:
                logger.error("Reviewer could not read file", extra={"file_path": file_path, "error": str(e)})
                return {"error": f"Could not read file {file_path}: {e}"}

        prompt = self._create_system_prompt(task_description, context, files_content)
        raw_response = self.model_manager.send_request(prompt, friendly_model_names=self.model_names)

        review_match = re.search(r"<review>(.*?)</review>", raw_response, re.DOTALL)
        if review_match:
            review_content = review_match.group(1)
            status_match = re.search(r"<status>(.*?)</status>", review_content, re.DOTALL)
            comment_match = re.search(r"<comment>(.*?)</comment>", review_content, re.DOTALL)

            status = status_match.group(1).strip() if status_match else "rejected"
            comment = comment_match.group(1).strip() if comment_match else "No comment provided."

            if status == "approved":
                return {"review_feedback": "approved"}
            else:
                return {"review_feedback": comment}

        logger.error("Could not parse review from reviewer response", extra={"response": raw_response})
        return {"error": "Could not parse review from reviewer response."}

class DocumenterAgent(Agent):
    """Generates documentation for the completed task."""
    def _create_system_prompt(self, task_description: str, files: list[str]):
        return f"""You are a DocumenterAgent. Your job is to write a brief summary of a completed development task for inclusion in a project's documentation. Update the documentation based on progress and issues found.

**Original Task:**
{task_description}

**Files Created or Modified:**
{', '.join(files)}

Based on the information above, write a short summary of the changes. The summary should be suitable for a "Development Log" or "Changelog" section in a README.md file. Your output should be just the summary text, without any extra formatting or XML tags.
"""

    def run(self, state: GraphState) -> dict:
        task_description = state['initial_request']
        files = state.get('completed_files', [])

        logger.info(f"{self.name} starting documentation", extra={"agent_name": self.name, "model_names": self.model_names, "task": task_description})

        prompt = self._create_system_prompt(task_description, files)
        summary = self.model_manager.send_request(prompt, friendly_model_names=self.model_names)

        try:
            with open("README.md", "a") as f:
                f.write(f"\n\n### Session Summary: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(summary)
            logger.info("Documentation updated successfully.")
        except Exception as e:
            logger.error("Failed to update documentation", extra={"error": str(e)})
            return {"error": f"Failed to update documentation: {e}"}

        return {}

from src.graph import AgentGraph
from src.performance import PerformanceTracker
from src.persistance import FileCheckpointer

class OrchestratorAgent(Agent):
    """Orchestrates the workflow between other specialized agents using a state graph."""
    def __init__(self, model_manager: ModelManager, config: dict, performance_tracker: PerformanceTracker):
        super().__init__("OrchestratorAgent", model_manager, "n/a")
        agent_models = config.get("agent_models", {})

        # Still need to instantiate agents to pass them to the graph
        architect = SoftwareArchitectAgent("SoftwareArchitectAgent", model_manager, agent_models.get("architect", []))
        developer = DeveloperAgent(model_manager, agent_models.get("developer", []), global_tool_registry)
        reviewer = ReviewerAgent("ReviewerAgent", model_manager, agent_models.get("reviewer", []))
        documenter = DocumenterAgent("DocumenterAgent", model_manager, agent_models.get("documenter", []))

        self.checkpointer = FileCheckpointer()
        self.agent_graph = AgentGraph(architect, developer, reviewer, documenter, performance_tracker, self.checkpointer)

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
