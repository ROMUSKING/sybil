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

-   **Phase 2: Integrate Advanced Patterns (In Progress)**
    -   [ ] Implement the ReAct loop for iterative problem-solving.
    -   [ ] Integrate basic tool use (e.g., `read_file`, `write_file`).
    -   [ ] Implement the "Code-then-CoT" approach for code generation.
    -   [ ] Add a basic self-correction mechanism using unit tests.

-   **Phase 3: Build the Multi-Provider Layer (Complete)**
    -   [x] Construct a dedicated routing layer (`ModelManager`).
    -   [x] Handle model selection and API-specific parameter management.
    -   [x] Integrate multiple providers (Anthropic, Google, Cohere, Mistral).

-   **Phase 4: Enhance with Iterative Refinement (Future)**
    -   [ ] Implement more sophisticated feedback loops (e.g., self-consistency).
    -   [ ] Add long-term memory management for multi-session projects.
    -   [ ] Explore multi-agent collaboration frameworks.

## III. Task Tracker

This section tracks the project's tasks and their status.

### Completed Tasks
-   [x] **Initial Project Scaffolding**: Set up the basic project structure, including `src` directory, `requirements.txt`, and `config.yaml`.
-   [x] **Multi-Provider Integration**:
    -   [x] Implemented API wrapper for Anthropic.
    -   [x] Implemented API wrapper for Google Gemini.
    -   [x] Implemented API wrapper for Cohere.
    -   [x] Implemented API wrapper for Mistral AI.
-   [x] **Quota Management**: Implemented the `ModelManager` to handle model switching based on different quota types (cost-based, RPM, monthly calls).
-   [x] **Usage Persistence**: Implemented `UsageTracker` to persist usage data across sessions.
-   [x] **Basic Agent Framework**: Created a base `Agent` class and a `ManagerAgent`.
-   [x] **CLI**: Built a simple command-line interface for user interaction.
-   [x] **Project Documentation**: Created this `AGENTS.md` file to guide development.

### Next Tasks (Phase 2)
-   [ ] **Implement ReAct Loop**: Refactor the `ManagerAgent` to follow a `Thought -> Action -> Observation` loop.
-   [ ] **Integrate Tools**: Connect the ReAct loop to the existing tool-use infrastructure (e.g., `read_file`, `write_file`).
-   [ ] **Code-then-CoT**: Update the agent's prompting to generate code first, then an explanation.
-   [ ] **Test-Driven Development**: Add the ability for the agent to write and execute unit tests to verify its own code.
