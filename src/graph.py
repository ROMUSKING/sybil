import xml.etree.ElementTree as ET
from typing import Optional
import time
import functools
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph import StateGraph, END
from src.graph_state import GraphState
from src.logger import logger
from src.agents import Agent

class AgentGraph:
    def __init__(self, architect, developer, reviewer, documenter, checkpointer: Optional[BaseCheckpointSaver] = None):
        self.architect = architect
        self.developer = developer
        self.reviewer = reviewer
        self.documenter = documenter
        self.checkpointer = checkpointer
        self.performance_data = {}
        self.graph = self._build_graph()

    def _timed_agent_run(self, agent: Agent, state: GraphState):
        agent_name = agent.__class__.__name__
        start_time = time.time()
        result = agent.run(state)
        end_time = time.time()
        duration = round(end_time - start_time, 2)
        if agent_name not in self.performance_data:
            self.performance_data[agent_name] = []
        self.performance_data[agent_name].append(duration)
        logger.info(f"Agent {agent_name} took {duration}s")
        return result

    def get_performance_report(self):
        return self.performance_data

    def _parse_blueprint(self, blueprint_xml: str):
        # This logic is copied from the old OrchestratorAgent
        root = ET.fromstring(blueprint_xml)
        graph, tasks_map = {}, {}
        for module in root.findall('.//module'):
            name = module.get('name')
            if name not in graph: graph[name], tasks_map[name] = [], []
            for dep in module.findall('./dependencies/dependency'): graph[name].append(dep.text)
            for task in module.findall('./tasks/task'):
                tasks_map[name].append({"description": task.get('description'), "context": f"Module: {name}"})
        return graph, tasks_map

    def _topological_sort(self, graph):
        # This logic is copied from the old OrchestratorAgent
        sorted_modules, visited = [], set()
        def visit(module):
            if module in visited: return
            visited.add(module)
            for dep in graph.get(module, []): visit(dep)
            sorted_modules.append(module)
        for module in graph:
            if module not in visited: visit(module)
        return sorted_modules

    def _prepare_task_queue(self, state: GraphState):
        logger.info("Preparing task queue from blueprint")
        blueprint_xml = state['blueprint_xml']
        if not blueprint_xml:
            logger.error("No blueprint XML found in state")
            return {"error": "Blueprint missing"}
        try:
            dependency_graph, tasks_by_module = self._parse_blueprint(blueprint_xml)
            sorted_modules = self._topological_sort(dependency_graph)
            task_queue = [task for module in sorted_modules for task in tasks_by_module[module]]
            logger.info("Task queue prepared", extra={"queue_size": len(task_queue)})
            return {"task_queue": task_queue}
        except Exception as e:
            logger.error("Failed to parse blueprint", extra={"error": str(e)})
            return {"error": f"Failed to parse blueprint: {e}"}

    def _select_next_task(self, state: GraphState):
        logger.info("Selecting next task")
        task_queue = state['task_queue']
        if not task_queue:
            logger.info("Task queue is empty. Finishing.")
            return {"current_task": None}

        next_task = task_queue.pop(0)
        logger.info("Next task selected", extra={"task": next_task['description']})
        # Reset feedback for the new task
        return {"task_queue": task_queue, "current_task": next_task, "review_feedback": None}

    # Conditional edge logic
    def _should_continue(self, state: GraphState):
        if state.get("error"):
            return "error"
        if state.get("review_feedback") == "approved":
            logger.info("Review approved. Checking for more tasks.")
            if not state['task_queue']:
                return "end"
            else:
                return "continue"
        logger.warning("Review rejected. Returning to developer.")
        return "retry"

    def _handle_error(self, state: GraphState):
        logger.error("Graph execution error", extra={"error": state.get("error")})
        return {}

    def _build_graph(self):
        workflow = StateGraph(GraphState)

        # Nodes
        workflow.add_node("architect", functools.partial(self._timed_agent_run, self.architect))
        workflow.add_node("prepare_tasks", self._prepare_task_queue)
        workflow.add_node("select_task", self._select_next_task)
        workflow.add_node("developer", functools.partial(self._timed_agent_run, self.developer))
        workflow.add_node("reviewer", functools.partial(self._timed_agent_run, self.reviewer))
        workflow.add_node("documenter", functools.partial(self._timed_agent_run, self.documenter))
        workflow.add_node("handle_error", self._handle_error)

        # Edges
        workflow.set_entry_point("architect")

        workflow.add_conditional_edges(
            "architect",
            lambda state: "handle_error" if state.get("error") else "prepare_tasks",
            {"prepare_tasks": "prepare_tasks", "handle_error": "handle_error"}
        )

        workflow.add_conditional_edges(
            "prepare_tasks",
            lambda state: "handle_error" if state.get("error") else "select_task",
            {"select_task": "select_task", "handle_error": "handle_error"}
        )

        workflow.add_conditional_edges(
            "select_task",
            lambda state: "developer" if state.get("current_task") else "documenter",
            {"developer": "developer", "documenter": "documenter"}
        )

        workflow.add_edge("developer", "reviewer")

        workflow.add_conditional_edges(
            "reviewer",
            self._should_continue,
            {
                "continue": "select_task",
                "retry": "developer",
                "end": "documenter", # Route to documenter when done
                "error": "handle_error"
            }
        )

        workflow.add_edge("documenter", END)
        workflow.add_edge("handle_error", END)

        return workflow.compile(checkpointer=self.checkpointer)

    def run(self, initial_request: str, session_id: str):
        logger.info("Starting graph execution", extra={"session_id": session_id})
        config = {"configurable": {"thread_id": session_id}}

        # The initial state is now managed by the checkpointer
        initial_payload = {"initial_request": initial_request}

        final_state = self.graph.invoke(initial_payload, config)
        logger.info("Graph execution finished", extra={"session_id": session_id})
        return final_state
