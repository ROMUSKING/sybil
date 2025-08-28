import re
import xml.etree.ElementTree as ET
from src.model_manager import ModelManager
from src.tools import ToolRegistry, tool_registry as global_tool_registry

class Agent:
    """Base class for all agents."""
    def __init__(self, name, model_manager: ModelManager):
        self.name = name
        self.model_manager = model_manager

    def run(self, **kwargs):
        raise NotImplementedError

class SoftwareArchitectAgent(Agent):
    """Designs the software architecture and creates a technical blueprint."""
    def __init__(self, model_manager: ModelManager):
        super().__init__("SoftwareArchitectAgent", model_manager)

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
        print(f"--- {self.name} starting task: Design architecture for '{task_description}' ---")
        prompt = self._create_system_prompt()
        full_prompt = f"{prompt}\n\nUser Request: {task_description}"
        raw_response = self.model_manager.send_request(full_prompt)
        print(f"Raw response from architect:\n{raw_response}")
        blueprint_match = re.search(r"<blueprint>.*</blueprint>", raw_response, re.DOTALL)
        if blueprint_match:
            return blueprint_match.group(0)
        return "Error: Could not generate a valid blueprint."

class DeveloperAgent(Agent):
    """Writes code to implement a single task from the blueprint."""
    def __init__(self, model_manager: ModelManager, tool_registry: ToolRegistry):
        super().__init__("DeveloperAgent", model_manager)
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
        print(f"--- {self.name} starting task: {task_description} ---")
        system_prompt = self._create_system_prompt(task_description, context)
        history = [f"Starting development for task: {task_description}"]
        # This is a simplified ReAct loop for brevity in this example.
        # A full implementation would be here.
        print("Developer is 'implementing' the task based on the plan.")
        # In a real run, this would be the result of the ReAct loop
        return {"status": "success", "files": ["src/placeholder.py", "tests/placeholder_test.py"]}

class ReviewerAgent(Agent):
    """Reviews code for correctness, style, and adherence to the plan."""
    def __init__(self, model_manager: ModelManager):
        super().__init__("ReviewerAgent", model_manager)

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
        print(f"--- {self.name} starting review for task: {task_description} ---")
        # Simplified for this example.
        return {"status": "approved", "comment": "Looks good."}

class OrchestratorAgent(Agent):
    """Orchestrates the workflow between other specialized agents."""
    def __init__(self, model_manager: ModelManager, tool_registry: ToolRegistry = global_tool_registry):
        super().__init__("OrchestratorAgent", model_manager)
        self.architect = SoftwareArchitectAgent(model_manager)
        self.developer = DeveloperAgent(model_manager, tool_registry)
        self.reviewer = ReviewerAgent(model_manager)

    def _parse_blueprint(self, blueprint_xml: str):
        root = ET.fromstring(blueprint_xml)
        graph = {}
        tasks = {}

        for module in root.findall('module'):
            name = module.get('name')
            graph[name] = []
            tasks[name] = []
            for dep in module.findall('./dependencies/dependency'):
                graph[name].append(dep.text)
            for task in module.findall('./tasks/task'):
                tasks[name].append(task.get('description'))

        return graph, tasks

    def _topological_sort(self, graph):
        # Simplified topological sort
        sorted_modules = []
        visited = set()

        def visit(module):
            if module in visited:
                return
            visited.add(module)
            for dep in graph.get(module, []):
                visit(dep)
            sorted_modules.append(module)

        for module in graph:
            visit(module)

        return sorted_modules

    def run(self, task_description: str):
        print(f"--- {self.name} starting task: {task_description} ---")

        blueprint_xml = self.architect.run(task_description)
        print(f"\n--- Blueprint received from Architect ---\n{blueprint_xml}")

        try:
            graph, tasks_map = self._parse_blueprint(blueprint_xml)
            sorted_modules = self._topological_sort(graph)
        except Exception as e:
            return f"Orchestration failed: Could not parse blueprint. Error: {e}"

        print(f"\n--- Execution Order Determined ---\n{sorted_modules}")

        for module_name in sorted_modules:
            print(f"\n--- Starting Module: {module_name} ---")
            for task in tasks_map[module_name]:
                # In a real implementation, the context would be the XML of the module and its dependencies
                context = f"Module: {module_name}, Task: {task}"

                dev_result = self.developer.run(task_description=task, context=context)
                print(f"  Dev result: {dev_result}")

                if dev_result.get("status") == "success":
                    review_result = self.reviewer.run(
                        task_description=task,
                        context=context,
                        files=dev_result.get("files", [])
                    )
                    print(f"  Review result: {review_result}")
                    if review_result.get("status") != "approved":
                        print(f"Module {module_name} failed review. Halting.")
                        return "Orchestration failed during review."
                else:
                    print(f"Module {module_name} failed development. Halting.")
                    return "Orchestration failed during development."

        return "Orchestration complete."
