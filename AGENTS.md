# Sybil Project: Agent Instructions & Roadmap

This document serves as the master guide for the Sybil project. All agents working on this project must adhere to the principles and roadmap outlined here.

## I. Core Architectural & Prompting Principles

This project is guided by a layered, prompt-as-blueprint framework. The core idea is to separate the agent's reasoning and planning from the provider-specific implementation details.

### 1. The Unified Prompt Framework
All agent interactions should be guided by a modular, structured prompt that is provider-agnostic. The prompt should be broken down into distinct, delimited sections:

-   **`<SYSTEM_INSTRUCTIONS>`**: Defines the agent's persona, high-level objectives, and universal constraints.
-   **`<TOOL_SCHEMA>`**: Provides a machine-readable schema for all available external tools.
-   **`<CONTEXT_BLOCK>`**: A dynamic section for all relevant, user-provided context (e.g., file contents, project structure).
-   **`<USER_REQUEST>`**: The user's direct query.
-   **`<AGENT_STATE_AND_REASONING_LOOP>`**: The core of the prompt, implementing the Thought-Action-Observation loop.
-   **`<OUTPUT_FORMAT>`**: Defines a strict, machine-parsable format for the final output.

### 2. Layered Architecture for Multi-Provider Support
The system must use a dedicated routing layer to manage the differences between LLM providers.

-   **Provider-Agnostic Prompts**: The core prompt templates must NOT contain provider-specific syntax.
-   **Routing Layer**: This layer is responsible for:
    -   **Model Selection**: Choosing the best model for a given task based on complexity, cost, or other criteria.
    -   **Prompt Translation**: Mapping the components of the unified prompt to the specific message roles and API parameters of the chosen provider (e.g., mapping `<SYSTEM_INSTRUCTIONS>` to the `system` parameter).
    -   **Parameter Management**: Handling model-specific parameters like `temperature` and `max_tokens`.

### 3. Foundational Prompting Principles
All prompts must adhere to the following principles to ensure clarity and reliability:

-   **Clarity & Specificity**: Avoid ambiguity. Use objective, measurable constraints. Explicitly define file paths, function names, data types, etc.
-   **Context & Bounded Environments**: Provide all necessary context for a task. The agentic system is responsible for injecting relevant files, project structure, and documentation into the `<CONTEXT_BLOCK>`.
-   **Persona-Based Prompting**: Assign a specific, expert persona to the agent (e.g., "Senior Software Engineer") to ensure a technical and authoritative tone.
-   **Structured Formatting & Guardrails**: Use clear delimiters (e.g., Markdown) to structure prompts. Define explicit rules for what the agent can and cannot do (e.g., do not invent tools, confirm destructive actions).

### 4. Advanced Reasoning Patterns
The agent's operational flow should be built on these advanced reasoning patterns:

-   **ReAct Framework (Reasoning and Acting)**: The agent must follow an iterative `Thought -> Action -> Observation` loop to solve problems. This allows for dynamic interaction with tools and self-correction based on feedback.
-   **Hierarchical Task Decomposition**: Complex tasks must be broken down into smaller, manageable sub-tasks.
-   **Code-then-CoT (Chain-of-Thought)**: For code generation, the primary output should be the code itself, followed by a natural language explanation. The code is the reasoning; the CoT is the explanation.

## II. Project Roadmap

The development of the Sybil project will follow a phased approach, as recommended by the architectural blueprint.

-   **Phase 1: Establish the Foundation (Complete)**
    -   [x] Implement a single-provider system to master core principles.
    -   [x] Ensure clarity, context management, and structured formatting.
    -   [x] Build a predictable and unambiguous agentic system.

-   **Phase 2: Integrate Advanced Patterns (Complete)**
    -   [x] Implement the ReAct loop for iterative problem-solving.
    -   [x] Integrate basic tool use (e.g., `read_file`, `write_file`).
    -   [x] Implement the "Code-then-CoT" approach for code generation.
    -   [x] Add a basic self-correction mechanism using unit tests (via TDD feature).
    -   [x] Improve error handling for core API wrappers.

-   **Phase 3: Build the Multi-Provider Layer (Complete)**
    -   [x] Construct a dedicated routing layer (`ModelManager`).
    -   [x] Handle model selection and API-specific parameter management.
    -   [x] Integrate multiple providers (Anthropic, Google, Cohere, Mistral).

-   **Phase 4: Enhance with Iterative Refinement (Complete)**
    -   [x] **Multi-Agent Collaborative Framework**: Implemented a hierarchical, graph-based system of specialized agents that collaborate to execute complex software projects.
        -   **`SoftwareArchitectAgent`**: Generates a recursive blueprint of the project, defining a dependency graph of nested modules, their components, and implementation tasks.
        -   **`OrchestratorAgent`**: Traverses the blueprint's dependency graph, orchestrating the workflow between other agents and providing them with the full contextual path (global, module, and task-specific context).
        -   **`DeveloperAgent`**: Executes a single task within the full context of its module and dependencies, following a strict TDD workflow.
        -   **`ReviewerAgent`**: Reviews the developer's work for correctness, style, and adherence to the blueprint, with the ability to approve code or reject it with feedback.
    -   [ ] **Long-Term Memory**: Add a mechanism for storing and retrieving information across multiple sessions to handle long-running, complex software projects.

-   **Phase 5: Hybrid Model Management with LiteLLM (Complete)**
    -   [x] **Implement Hybrid Provider Strategy**: Refactored the entire model management system to use `litellm` as a unified interface. This architecture supports both direct API calls to providers and proxied calls through services like OpenRouter, Together AI, etc.
    -   [x] **Flexible Configuration**: The `config.yaml` has been overhauled to support a generic `api_keys` section and a `models` mapping, allowing users to define any combination of direct or proxied models and assign them to agent roles.
    -   [x] **Smart Routing**: The `ModelManager` has been re-implemented as a smart router that sets the appropriate API keys as environment variables and dispatches requests to `litellm`, which handles the underlying provider logic.

-   **Phase 6: Observability & Performance Optimization (In Progress)**
    -   [x] **Implement Structured Logging**: Replace all `print()` statements with a proper, structured logging framework to capture key events in a machine-readable format.
    -   [ ] **Integrate Cost Tracking**: Enhance the `UsageTracker` by integrating `litellm.completion_cost()` to store the actual cost of each API call.
    -   [ ] **Add Performance Benchmarking**: Add timing mechanisms to the `OrchestratorAgent` to measure the execution time of each agent and task.
    -   [ ] **Create Analytics Report**: Generate a comprehensive summary report at the end of each run with cost, performance, and usage metrics.

## III. Task Tracker

This section tracks the project's tasks and their status.

### Completed Tasks
-   [x] **Initial Project Scaffolding**: Set up the basic project structure, including `src` directory, `requirements.txt`, and `config.yaml`.
-   [x] **Multi-Provider Integration**:
    -   [x] Implemented API wrapper for Anthropic.
    -   [x] Implemented API wrapper for Google Gemini.
    -   [x] Implemented API wrapper for Cohere.
    -   [x] Implemented API wrapper for Mistral AI.
    -   [x] Implemented API wrapper for DeepSeek.
    -   [x] Implemented API wrapper for OpenAI.
    -   [x] Implemented API wrapper for Qwen.
    -   [x] Implemented API wrapper for Hugging Face.
-   [x] **Quota Management**: Implemented the `ModelManager` to handle model switching based on different quota types (cost-based, RPM, monthly calls).
-   [x] **Usage Persistence**: Implemented `UsageTracker` to persist usage data across sessions.
-   [x] **Basic Agent Framework**: Created a base `Agent` class and a `ManagerAgent`.
-   [x] **CLI**: Built a simple command-line interface for user interaction.
-   [x] **Project Documentation**: Created this `AGENTS.md` file to guide development.
-   [x] **ReAct Implementation**: Refactored the `ManagerAgent` to follow a `Thought -> Action -> Observation` loop and connected it to a tool registry.
-   [x] **Short-Term Memory**: Implemented a history truncation mechanism in `ManagerAgent` to manage context window size.
-   [x] **Test-Driven Development**: Added a `run_tests` tool and updated the agent's prompt to support a TDD workflow.
-   [x] **Code-then-CoT**: Updated the agent's prompt to require final code answers to be in "Code-then-Chain-of-Thought" format.
-   [x] **Error Handling**: Refactored core API wrappers (`OpenAI`, `Anthropic`, etc.) to handle specific exceptions like rate limiting and authentication errors.

### Next Tasks

#### Phase 6: Observability & Performance
-   [x] **Implement Structured Logging**: Created a `src/logger.py` module and replaced all `print()` statements throughout the application with structured, configurable logging.
-   [In Progress] **Integrate Cost & Performance Tracking**: Enhance `UsageTracker` with cost data from `litellm` and add timing mechanisms to the `OrchestratorAgent` to benchmark agent performance.
-   [In Progress] **Create Analytics Report**: Add logic to `main.py` to generate and log a final report summarizing the run.

#### Provider Integrations
-   [ ] Research and add hosted provider for Llama.
-   [ ] Research and add wrapper for Grok.

## IV. Development Workflow & Coding Style

This section outlines specific development utilities and coding standards for the project.

### Power-of-10 Iterative Development
The repository includes utilities to support a "Power-of-10" iterative development workflow.

-   **Files of Interest**:
    -   `src/agent_strategies.py`: Power-of-10 loop orchestration and tiger_style contract generator.
    -   `src/tools/checkpoint.py`: Simple JSON checkpointing helper (writes to `.checkpoints/`).
    -   `src/agent_integrations/power10_integration.py`: Adapter helpers to run the Power-of-10 loop with `DeveloperAgent`-like objects.
-   **Quick Start**:
    1.  Obtain a `DeveloperAgent` instance that exposes a `run(prompt: str, context: dict) -> dict` interface.
    2.  Build a context dictionary with any project-specific state.
    3.  Call `run_integration(dev_agent, "Implement feature X", context, max_fidelity=5)` from `src.agent_integrations.power10_integration`.
-   **Checkpointing**:
    -   Checkpoints are saved to `.checkpoints/{id}.json`.
    -   Use `save_checkpoint(payload, metadata)` to persist intermediate state.

### "tiger_style" Coding Contract
All code should adhere to the following `tiger_style` contract for quality and review.

-   **Invariants**: Every module should declare its invariants and provide tests that demonstrate them.
-   **No Hidden Randomness**: All sources of randomness in core logic must be seeded and documented.
-   **Small, Focused Functions**: Prefer small, single-responsibility functions.
-   **Error Handling**: Clearly handle errors and avoid using global mutable state.

