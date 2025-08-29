# sybil
Polyagentic software development quorum

## About

Sybil is a polyagentic (multi-agent) software development framework designed to automate complex coding tasks. It leverages a hierarchical system of specialized AI agents that collaborate to understand requirements, architect a solution, write code, and review it. The system is designed to be provider-agnostic, allowing you to use different LLM providers like OpenAI, Anthropic, and others.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/sybil.git
    cd sybil
    ```

2.  **Create and activate a virtual environment (Optional but recommended):**
    ```bash
    # On macOS and Linux
    python3 -m venv venv
    source venv/bin/activate

    # On Windows
    # python -m venv venv
    # .\venv\Scripts\activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure API Keys:**
    -   Create a copy of the example configuration file:
        ```bash
        cp config.yaml.example config.yaml
        ```
    -   Open `config.yaml` and add your API keys for the desired LLM providers.

    ```yaml
    # Generic section for API keys. The key name (e.g., 'openai') should correspond
    # to the environment variable LiteLLM expects (e.g., OPENAI_API_KEY).
    api_keys:
      openai: "YOUR_OPENAI_KEY"
      anthropic: "YOUR_ANTHROPIC_KEY"
      openrouter: "YOUR_OPENROUTER_KEY"
      # Add other providers or proxies here, e.g.:
      # together_ai: "YOUR_TOGETHER_AI_KEY"

    # ... rest of the config
    ```

## Usage

To run Sybil, you execute the `main.py` script from the root of the project, passing the desired task as a command-line argument.

### Starting a New Project
To start a new project, simply provide the task description. A unique session ID will be generated for you.
```bash
python -m src.main "Implement a feature that does X"
```

For example:
```bash
python -m src.main "Create a python script that takes a number as input and returns 'fizz' if it's divisible by 3, 'buzz' if divisible by 5, and 'fizzbuzz' if divisible by both."
```

The agent will then start working on the task, and you will see logging output in your console, including the session ID for your project.

### Resuming a Project
You can resume a project at any time by providing its session ID using the `--session-id` flag.

```bash
python -m src.main "Continue with the previous task." --session-id "your-session-id-here"
```

## Long-Term Memory and Sessions

Sybil is equipped with long-term memory, allowing it to handle complex, multi-session development tasks. This is achieved through a persistent checkpointing system built on top of LangGraph.

### How it Works
- **Sessions**: Every project is treated as a session, identified by a unique session ID. When you start a new task without specifying a session ID, a new one is created.
- **Checkpointing**: The entire state of the project is automatically saved at every step of the development process. These checkpoints are stored on disk.
- **Resuming**: When you provide a session ID, Sybil loads the latest checkpoint for that session and seamlessly resumes the workflow.

This ensures that no progress is lost and allows you to continue, review, or debug long-running projects over multiple interactions. Checkpoints are stored in the `.checkpoints/langgraph/` directory.
