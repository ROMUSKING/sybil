import re
import xml.etree.ElementTree as ET
from src.model_manager import ModelManager
from src.tools import ToolRegistry, tool_registry as global_tool_registry

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
        return """You are a Software Architect...""" # Prompt is simplified for this example

    def run(self, task_description: str) -> str:
        print(f"--- {self.name} ({self.model_name}) starting task: Design architecture ---")
        prompt = self._create_system_prompt()
        full_prompt = f"{prompt}\n\nUser Request: {task_description}"
        raw_response = self.model_manager.send_request(full_prompt, model=self.model_name)
        blueprint_match = re.search(r"<blueprint>.*</blueprint>", raw_response, re.DOTALL)
        if blueprint_match:
            return blueprint_match.group(0)
        return "Error: Could not generate a valid blueprint."

class DeveloperAgent(Agent):
    """Writes code to implement a single task from the blueprint."""
    def __init__(self, name: str, model_manager: ModelManager, model_name: str, tool_registry: ToolRegistry):
        super().__init__(name, model_manager, model_name)
        self.tool_registry = tool_registry

    def run(self, task_description: str, context: str) -> dict:
        # Simplified for brevity. The full ReAct loop would be here.
        print(f"--- {self.name} ({self.model_name}) starting task: {task_description} ---")
        prompt = f"You are a developer. Your task is: {task_description}. The context is: {context}"
        response = self.model_manager.send_request(prompt, model=self.model_name)
        files = re.findall(r"<file>(.*?)</file>", response)
        return {"status": "success", "files": files}

class ReviewerAgent(Agent):
    """Reviews code for correctness, style, and adherence to the plan."""
    def run(self, task_description: str, context: str, files: list[str]) -> dict:
        print(f"--- {self.name} ({self.model_name}) starting review: {task_description} ---")
        files_content = " ".join(files)
        prompt = f"You are a reviewer. Review these files: {files_content}"
        response = self.model_manager.send_request(prompt, model=self.model_name)
        status = re.search(r"<status>(.*?)</status>", response).group(1).strip()
        comment = re.search(r"<comment>(.*?)</comment>", response).group(1).strip()
        return {"status": status, "comment": comment}

class OrchestratorAgent(Agent):
    """Orchestrates the workflow between other specialized agents."""
    def __init__(self, model_manager: ModelManager, config: dict):
        super().__init__("OrchestratorAgent", model_manager, "n/a")
        agent_models = config.get("agent_models", {})
        self.architect = SoftwareArchitectAgent(
            model_manager=model_manager,
            model_name=agent_models.get("architect", "mistralai/mixtral-8x7b-instruct")
        )
        self.developer = DeveloperAgent(
            name="DeveloperAgent",
            model_manager=model_manager,
            model_name=agent_models.get("developer", "mistralai/mixtral-8x7b-instruct"),
            tool_registry=global_tool_registry
        )
        self.reviewer = ReviewerAgent(
            name="ReviewerAgent",
            model_manager=model_manager,
            model_name=agent_models.get("reviewer", "anthropic/claude-3-opus")
        )

    def _parse_blueprint(self, blueprint_xml: str):
        # ... (parsing logic remains the same)
        root = ET.fromstring(blueprint_xml)
        graph = {}
        tasks_map = {}
        for module in root.findall('.//module'):
            name = module.get('name')
            if name not in graph:
                graph[name] = []
                tasks_map[name] = []
            for dep in module.findall('./dependencies/dependency'):
                graph[name].append(dep.text)
            for task in module.findall('./tasks/task'):
                tasks_map[name].append(task.get('description'))
        return graph, tasks_map

    def _topological_sort(self, graph):
        # ... (sorting logic remains the same)
        sorted_modules = []
        visited = set()
        def visit(module):
            if module in visited: return
            visited.add(module)
            for dep in graph.get(module, []): visit(dep)
            sorted_modules.append(module)
        for module in graph:
            if module not in visited: visit(module)
        return sorted_modules

    def run(self, task_description: str):
        print(f"--- {self.name} starting task: {task_description} ---")
        blueprint_xml = self.architect.run(task_description)
        print(f"\n--- Blueprint received ---\n{blueprint_xml}")
        # ... (rest of the orchestration loop remains the same)
        return "Orchestration complete."
