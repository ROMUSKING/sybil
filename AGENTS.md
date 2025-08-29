# Agent Integration Notes

This repository contains small utilities to support a "Power-of-10" iterative development workflow and a compact "tiger_style" contract for agent-driven development.

Files of interest:
- src/agent_strategies.py — Power-of-10 loop orchestration and tiger_style contract generator.
- src/tools/checkpoint.py — Simple JSON checkpointing helper (.checkpoints/).
- src/agent_integrations/power10_integration.py — Adapter helpers to run the Power-of-10 loop with DeveloperAgent-like objects.

Quick start (manual):
1. Create/obtain a DeveloperAgent instance that exposes a run(prompt: str, context: dict) -> dict interface.
2. Build a context dict with any project-specific state; include `prompt` if you want a base prompt.
3. Call:
   from src.agent_integrations.power10_integration import run_integration
   result = run_integration(dev_agent, "Implement feature X", context, max_fidelity=5)

Expected result:
- The returned dict contains iteration metadata and overall_status field.
- Each successful iteration may produce a checkpoint_id which you can load via src/tools/checkpoint.load_checkpoint(checkpoint_id).

Checkpointing:
- Checkpoints are written to `.checkpoints/{id}.json`. They are simple JSON objects with `payload` and `metadata`.
- Use save_checkpoint(payload, metadata) to persist intermediate state.

Reviewer expectations (tiger_style):
- Every module should declare invariants and tests demonstrating them.
- No hidden randomness in core logic; seed and document any randomness.
- Prefer small, single-responsibility functions; clearly handle errors and avoid global mutable state.

Notes:
- These helpers are intentionally small and provider-agnostic. They assume that the actual DeveloperAgent and OrchestratorAgent orchestrate file I/O, commits, and CI/test runs.
- Add CI tests and lints as follow-ups. Consider integrating the checkpoint directory into CI caches or artifact storage for larger runs.