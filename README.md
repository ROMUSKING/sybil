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

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure API Keys:**
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

```bash
python -m src.main "Implement a feature that does X"
```

For example:

```bash
python -m src.main "Create a python script that takes a number as input and returns 'fizz' if it's divisible by 3, 'buzz' if divisible by 5, and 'fizzbuzz' if divisible by both."
```

The agent will then start working on the task, and you will see logging output in your console.
