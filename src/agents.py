import re
from src.model_manager import ModelManager
from src.tools import ToolRegistry, tool_registry as global_tool_registry

class Agent:
    """Base class for all agents."""
    def __init__(self, name, model_manager: ModelManager):
        self.name = name
        self.model_manager = model_manager

    def run(self, task_description: str):
        raise NotImplementedError

class SoftwareArchitectAgent(Agent):
    """
    An agent that designs the software architecture and creates a technical blueprint.
    """
    def __init__(self, model_manager: ModelManager):
        super().__init__("SoftwareArchitectAgent", model_manager)

    def _create_system_prompt(self):
        return """You are a Software Architect. Your role is to take a high-level user request and create a detailed technical blueprint for the development team.

You must decompose the request into a series of logical, sequential tasks. You must also define the necessary file structure and dependencies.

Your final output must be a single XML block enclosed in `<blueprint>` tags. The blueprint must contain a list of `<task>` elements. Each task should be a clear, actionable instruction for the DeveloperAgent.

Example Blueprint:
<blueprint>
  <files>
    <file>src/main.py</file>
    <file>src/utils.py</file>
    <file>tests/test_utils.py</file>
  </files>
  <dependencies>
    <dependency>flask</dependency>
    <dependency>pytest</dependency>
  </dependencies>
  <tasks>
    <task id="1" description="Create the basic Flask app structure in src/main.py." />
    <task id="2" description="Implement a utility function `is_prime` in src/utils.py." />
    <task id="3" description="Write a unit test for the `is_prime` function in tests/test_utils.py." />
  </tasks>
</blueprint>
"""

    def run(self, task_description: str) -> str:
        print(f"--- {self.name} starting task: Design architecture for '{task_description}' ---")
        prompt = self._create_system_prompt()
        full_prompt = f"{prompt}\n\nUser Request: {task_description}"

        raw_response = self.model_manager.send_request(full_prompt)
        print(f"Raw response from architect:\n{raw_response}")

        blueprint_match = re.search(r"<blueprint>(.*?)</blueprint>", raw_response, re.DOTALL)
        if blueprint_match:
            blueprint = blueprint_match.group(1).strip()
            return f"<blueprint>{blueprint}</blueprint>"
        else:
            return "Error: Could not generate a valid blueprint."

class DeveloperAgent(Agent):
    """A placeholder for the agent that will write the code."""
    def __init__(self, model_manager: ModelManager):
        super().__init__("DeveloperAgent", model_manager)

    def run(self, task_description: str):
        print(f"--- {self.name} received task: {task_description} ---")
        return "Code for the task would be generated here."

class ReviewerAgent(Agent):
    """A placeholder for the agent that will review the code."""
    def __init__(self, model_manager: ModelManager):
        super().__init__("ReviewerAgent", model_manager)

    def run(self, code_to_review: str):
        print(f"--- {self.name} received code for review ---")
        return "Code review feedback would be generated here."

class OrchestratorAgent(Agent):
    """
    The main agent that orchestrates the workflow between other specialized agents.
    """
    def __init__(self, model_manager: ModelManager, tool_registry: ToolRegistry = global_tool_registry):
        super().__init__("OrchestratorAgent", model_manager)
        self.tool_registry = tool_registry
        self.architect = SoftwareArchitectAgent(model_manager)
        self.developer = DeveloperAgent(model_manager)
        self.reviewer = ReviewerAgent(model_manager)

    def run(self, task_description: str):
        print(f"--- {self.name} starting task: {task_description} ---")

        # Step 1: Call the Architect to get the blueprint
        blueprint_xml = self.architect.run(task_description)

        print("\n--- Blueprint received from Architect ---")
        print(blueprint_xml)

        # The rest of the orchestration logic will be implemented in future steps.
        # For now, we just demonstrate the first step of the new workflow.

        return "Orchestration complete. Blueprint generated."
