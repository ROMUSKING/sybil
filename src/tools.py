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

    def register_tool(self, name, function):
        self._tools[name] = function

    def get_tool(self, name):
        return self._tools.get(name)

    def list_tools(self):
        return list(self._tools.keys())

def read_file(file_path: str) -> str:
    """Reads the content of a specified file."""
    print(f"--- TOOL: Reading file: {file_path} ---")
    # In a real implementation, we would read the file content.
    # For now, we'll return a placeholder.
    return f"Content of {file_path}"

def write_file(file_path: str, content: str) -> str:
    """Writes content to a specified file."""
    print(f"--- TOOL: Writing to file: {file_path} ---")
    print(f"Content:\n{content}")
    # In a real implementation, we would write to the file.
    return f"Successfully wrote to {file_path}"

def shell_execute(command: str) -> str:
    """Executes a shell command."""
    print(f"--- TOOL: Executing shell command: {command} ---")
    # In a real implementation, we would execute the command.
    # For now, we'll return a placeholder.
    return f"Output of command: {command}"

# Create a global instance for easy access
tool_registry = ToolRegistry()
