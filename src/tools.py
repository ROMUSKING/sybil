import os
import subprocess
from src.logger import logger

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
    logger.info("Executing tool: read_file", extra={"file_path": file_path})
    try:
        with open(file_path, 'r') as f:
            return f.read()
    except Exception as e:
        logger.error("Error reading file", extra={"file_path": file_path, "error": str(e)})
        return f"Error reading file: {e}"

def write_file(file_path: str, content: str) -> str:
    """Writes content to a specified file."""
    logger.info("Executing tool: write_file", extra={"file_path": file_path, "content": content})
    try:
        with open(file_path, 'w') as f:
            f.write(content)
        return f"Successfully wrote to {file_path}"
    except Exception as e:
        logger.error("Error writing to file", extra={"file_path": file_path, "error": str(e)})
        return f"Error writing to file: {e}"

def shell_execute(command: str) -> str:
    """Executes a shell command."""
    logger.info("Executing tool: shell_execute", extra={"command": command})
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, check=False)
        if result.returncode == 0:
            return result.stdout
        else:
            logger.error("Error executing shell command", extra={"command": command, "error": result.stderr})
            return f"Error executing command: {result.stderr}"
    except Exception as e:
        logger.error("Error executing shell command", extra={"command": command, "error": str(e)})
        return f"Error executing command: {e}"

def run_tests(test_path: str = "") -> str:
    """Runs the pytest test suite. Can optionally run on a specific file or directory."""
    logger.info("Executing tool: run_tests", extra={"test_path": test_path or "all"})
    command = ["python3", "-m", "pytest", test_path]
    try:
        # Using shell=False and a list of args is safer
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        # Combine stdout and stderr to give the agent full context
        output = f"--- pytest STDOUT ---\n{result.stdout}\n"
        if result.stderr:
            output += f"--- pytest STDERR ---\n{result.stderr}\n"
        logger.info("Pytest run complete", extra={"test_path": test_path, "output": output})
        return output
    except Exception as e:
        logger.error("Error running pytest", extra={"test_path": test_path, "error": str(e)})
        return f"Error running pytest: {e}"

# Create a global instance for easy access
tool_registry = ToolRegistry()
