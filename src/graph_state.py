from typing import TypedDict, List, Dict, Optional

class AgentState(TypedDict):
    """
    Represents the shared state of the multi-agent workflow.
    """
    task_description: str
    blueprint: Optional[str]
    task_queue: List[Dict[str, str]] # List of tasks from the blueprint
    current_task: Optional[Dict[str, str]]
    completed_tasks: List[Dict[str, str]]
    files: Optional[List[str]]
    review: Optional[Dict[str, str]]
    feedback: Optional[str]
    retries: int
