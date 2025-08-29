# Sybil Project: Agent Instructions & Roadmap

This document serves as the master guide for the Sybil project. All agents working on this project must adhere to the principles and roadmap outlined here.

## II. Project Roadmap

-   **Phase 1: Establish the Foundation (Complete)**
-   **Phase 2: Integrate Advanced Patterns (Complete)**
-   **Phase 3: Build the Multi-Provider Layer (Complete)**
-   **Phase 4: Enhance with Iterative Refinement (Complete)**
-   **Phase 5: Hybrid Model Management with LiteLLM (Complete)**
-   **Phase 6: Observability & Performance Optimization (Complete)**
-   **Phase 7: Advanced Orchestration & Context (In Progress)**
    -   [ ] **Migrate Orchestrator to LangGraph**: Evolve the `OrchestratorAgent` from a manual loop to a formal graph-based system using a library like LangGraph. This will enable more complex, stateful, and conditional workflows (e.g., conditional agent calls, escalation paths).
    -   [ ] **Implement Codebase Knowledge Graph**: Implement a mechanism for the `SoftwareArchitectAgent` to build a graph representation of the existing codebase before planning. This will enable more intelligent refactoring and feature addition.

## III. Task Tracker

### Completed Tasks
-   All tasks from Phase 1 through 6 are considered complete.

### Next Tasks

#### Phase 7: Advanced Orchestration with LangGraph
-   [x] **Add Dependencies and Define State**: Added `langgraph` to `requirements.txt` and defined the `AgentState` in `src/graph_state.py`.
-   [In Progress] **Convert Agents to Graph Nodes**: Refactor the `run` logic of the `Architect`, `Developer`, and `Reviewer` agents into node functions that operate on the shared state object.
-   [ ] **Build and Compile the StateGraph**: Re-implement the `OrchestratorAgent` to define the graph, add the nodes, and wire them together with standard and conditional edges to create the full consistency loop.
-   [ ] **Test the LangGraph Implementation**: Create a new simulation to test the full, stateful, graph-based workflow from end to end.
