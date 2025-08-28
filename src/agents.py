import re
from src.model_manager import ModelManager
from src.tools import ToolRegistry, tool_registry as global_tool_registry

class Agent:
    def __init__(self, name, model_manager: ModelManager):
        self.name = name
        self.model_manager = model_manager

    def run(self, task_description: str):
        raise NotImplementedError

class ManagerAgent(Agent):
    def __init__(self, model_manager: ModelManager, tool_registry: ToolRegistry = global_tool_registry, max_history_items: int = 5):
        super().__init__("ManagerAgent", model_manager)
        self.tool_registry = tool_registry
        self.max_iterations = 10
        self.max_history_items = max_history_items

    def _create_system_prompt(self):
        tool_docs = ""
        for name, func in self.tool_registry._tools.items():
            tool_docs += f"- {name}: {func.__doc__}\n"

        return f"""You are ManagerAgent, an AI assistant that solves user requests by breaking them down into a series of steps. You must use the following 'Thought -> Action -> Observation' process:

1.  **Thought**: Reason about the user's request and decide what tool to use and how to use it.
2.  **Action**: Choose a tool from the available list and specify the parameters. Your action must be formatted as XML.
3.  **Observation**: After you specify an action, the system will execute it and you will receive the result.

**Available Tools:**
{tool_docs}

**Development Workflow:**
For any coding task, you must follow a strict Test-Driven Development (TDD) process:
1.  **Write a failing test**: Use the `write_file` tool to create a test file (e.g., `test_my_code.py`) that asserts the desired functionality. The test should fail initially.
2.  **Run the test**: Use the `run_tests` tool to confirm that the test fails as expected.
3.  **Write the implementation**: Use the `write_file` tool to create or modify the source code to satisfy the test.
4.  **Run the test again**: Use the `run_tests` tool to confirm that the test now passes.
5.  Repeat this cycle for each piece of functionality.

**Action Format:**
You must output your action in the following XML format.

<tool>
  <tool_name>name_of_the_tool</tool_name>
  <tool_params>
    <param_name>param_value</param_name>
  </tool_params>
</tool>

If you have enough information to answer the user's request, you can use the `<final_answer>` tag.
For tasks involving code, your final answer must follow the "Code-then-CoT" format:

<final_answer>
```python
# Your final, complete, and runnable code block here.
```

**Explanation:**

- A brief explanation of what the code does.
- A summary of the key decisions made during implementation.
</final_answer>
"""

    def _manage_history(self, history: list[str]) -> list[str]:
        """Truncates the history to prevent it from exceeding the context window."""
        # Each cycle adds an Action and an Observation, so 2 items.
        max_len = 1 + (self.max_history_items * 2)
        if len(history) > max_len:
            print(f"--- Truncating history from {len(history)} items to a manageable size ---")
            # Keep the first item (User Request)
            user_request = history[:1]
            # Keep the most recent items
            recent_history = history[-(self.max_history_items * 2):]
            # Combine them with a marker
            return user_request + ["... (history truncated) ..."] + recent_history
        return history

    def run(self, task_description: str):
        print(f"--- ManagerAgent starting task: {task_description} ---")

        system_prompt = self._create_system_prompt()
        history = [f"User Request: {task_description}"]

        for i in range(self.max_iterations):
            print(f"\n--- Iteration {i+1}/{self.max_iterations} ---")

            history = self._manage_history(history)
            prompt = "\n".join(history)

            full_prompt = f"{system_prompt}\n\nPrevious Interactions:\n{prompt}"

            raw_response = self.model_manager.send_request(full_prompt)

            if not raw_response:
                print("--- Agent received no response from model. Halting. ---")
                return "Error: No response from model."

            print(f"Raw response from model:\n{raw_response}")

            final_answer_match = re.search(r"<final_answer>(.*?)</final_answer>", raw_response, re.DOTALL)
            if final_answer_match:
                final_answer = final_answer_match.group(1).strip()
                print(f"--- Final Answer Found ---\n{final_answer}")
                return final_answer

            tool_match = re.search(r"<tool>(.*?)</tool>", raw_response, re.DOTALL)
            if not tool_match:
                print("--- No valid action found in response. Halting. ---")
                history.append(f"Observation: Invalid action format. Please use the correct XML format for tools.")
                continue

            tool_xml = tool_match.group(1)

            tool_name_match = re.search(r"<tool_name>(.*?)</tool_name>", tool_xml, re.DOTALL)
            tool_params_xml_match = re.search(r"<tool_params>(.*?)</tool_params>", tool_xml, re.DOTALL)

            if not tool_name_match or not tool_params_xml_match:
                print("--- Invalid tool format (missing name or params). Halting. ---")
                history.append("Observation: Invalid tool format. You must include <tool_name> and <tool_params>.")
                continue

            tool_name = tool_name_match.group(1).strip()
            tool_params_xml = tool_params_xml_match.group(1).strip()

            params = {}
            param_matches = re.findall(r"<(.*?)>(.*?)</\1>", tool_params_xml, re.DOTALL)
            for key, value in param_matches:
                params[key.strip()] = value.strip()

            tool_function = self.tool_registry.get_tool(tool_name)

            action_str = f"Tool Used: {tool_name} with params: {params}"
            print(action_str)
            history.append(f"Action: {tool_match.group(0)}") # Append the original XML action

            if not tool_function:
                observation = f"Error: Tool '{tool_name}' not found."
            else:
                try:
                    observation = tool_function(**params)
                except Exception as e:
                    observation = f"Error executing tool '{tool_name}': {e}"

            print(f"Observation: {observation}")
            history.append(f"Observation: {observation}")

        print("--- Max iterations reached. Halting. ---")
        return "Agent stopped after reaching max iterations."
