import os
import subprocess

class ToolRegistry:
    def __init__(self):
        self._tools = {}
        self._register_default_tools()

    def _register_default_tools(self):
        self.register_tool("read_file", read_file)
        self.register_tool("write_file", write_file)
        self.register_tool("shell_execute", shell_execute)
        self.register_tool("run_tests", run_tests)

    def register_tool(self, name, function):
        self._tools[name] = function

    def get_tool(self, name):
        return self._tools.get(name)

    def list_tools(self):
        return list(self._tools.keys())

def read_file(file_path: str) -> str:
    """Reads the content of a specified file."""
    print(f"--- TOOL: Reading file: {file_path} ---")
    try:
        with open(file_path, 'r') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {e}"

def write_file(file_path: str, content: str) -> str:
    """Writes content to a specified file."""
    print(f"--- TOOL: Writing to file: {file_path} ---")
    print(f"Content:\n{content}")
    try:
        with open(file_path, 'w') as f:
            f.write(content)
        return f"Successfully wrote to {file_path}"
    except Exception as e:
        return f"Error writing to file: {e}"

def shell_execute(command: str) -> str:
    """Executes a shell command."""
    print(f"--- TOOL: Executing shell command: {command} ---")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, check=False)
        if result.returncode == 0:
            return result.stdout
        else:
            return f"Error executing command: {result.stderr}"
    except Exception as e:
        return f"Error executing command: {e}"

def run_tests(test_path: str = "") -> str:
    """Runs the pytest test suite. Can optionally run on a specific file or directory."""
    print(f"--- TOOL: Running tests on path: '{test_path or 'all'}' ---")
    command = ["python3", "-m", "pytest", test_path]
    try:
        # Using shell=False and a list of args is safer
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        # Combine stdout and stderr to give the agent full context
        output = f"--- pytest STDOUT ---\n{result.stdout}\n"
        if result.stderr:
            output += f"--- pytest STDERR ---\n{result.stderr}\n"
        return output
    except Exception as e:
        return f"Error running pytest: {e}"

# Create a global instance for easy access
tool_registry = ToolRegistry()
