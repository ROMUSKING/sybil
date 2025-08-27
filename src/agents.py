from src.model_manager import ModelManager

class Agent:
    def __init__(self, name, model_manager: ModelManager):
        self.name = name
        self.model_manager = model_manager

    def run(self, task_description):
        raise NotImplementedError

class ManagerAgent(Agent):
    def __init__(self, model_manager: ModelManager):
        super().__init__("ManagerAgent", model_manager)

    def run(self, task_description):
        print(f"ManagerAgent received task: {task_description}")
        prompt = f"As the ManagerAgent, your task is to handle the following request: {task_description}"
        response = self.model_manager.send_request(prompt)
        return response
