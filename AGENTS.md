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

-   **Phase 5: OpenRouter Integration & Refactoring (In Progress)**
    -   [ ] **Integrate OpenRouter**: Refactor the project to use OpenRouter as a unified proxy for all model providers, simplifying the configuration and model management systems. This will involve using a library like `litellm`.
    -   [ ] **Implement Role-Based Model Specialization**: Update the `OrchestratorAgent` to assign specific, specialized models from OpenRouter to each agent based on its role (e.g., fast model for development, powerful model for review).
    -   [ ] **(Future) Investigate AutoGen**: Explore replacing the manual `OrchestratorAgent` loop with a more robust, event-driven framework like AutoGen for managing multi-agent conversations.

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

#### Phase 5: OpenRouter Integration
-   [x] **Integrate OpenRouter and Refactor Model Management**: Added `litellm` as a dependency. Overhauled `config.yaml`, `model_manager.py`, and deleted `api_wrappers.py` to use OpenRouter as a unified proxy.
-   [x] **Implement Role-Based Model Specialization**: Updated agent classes to be initialized with specific, role-appropriate models from OpenRouter, as defined in `config.yaml`.

#### Provider Integrations
-   [ ] Research and add hosted provider for Llama.
-   [ ] Research and add wrapper for Grok.
