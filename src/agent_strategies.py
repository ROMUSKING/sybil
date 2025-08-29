# Lightweight helper utilities for integrating Power-of-10 and tiger_style into agents.
# These helpers are provider-agnostic and intended to be imported by agents
# (DeveloperAgent, OrchestratorAgent, ReviewerAgent).
#
# Purpose: provide machine-friendly prompt fragments and a loop orchestration
# function so agents can follow iterative fidelity levels and enforce tiger_style invariants.

from typing import List, Dict, Callable, Optional
import time
import uuid
import logging

logger = logging.getLogger(__name__)

DEFAULT_MAX_ITERATIONS = 8
DEFAULT_MAX_LOCAL_REPAIRS = 3

def generate_tiger_style_contract() -> str:
    """
    Returns a short, machine-embeddable tiger_style contract string to append to agent prompts.
    Agents should enforce these constraints and reviewers should check them.
    """
    rules = [
        "tiger_style:invariant: Declare and preserve explicit invariants for the module.",
        "tiger_style:determinism: No hidden randomness in core logic; any randomness must be seeded and documented.",
        "tiger_style:mutability: Avoid global mutable state; pass state explicitly or use immutable data objects.",
        "tiger_style:small_funcs: Keep functions single-responsibility; prefer 20-80 LOC max (configurable).",
        "tiger_style:error_handling: Do not swallow exceptions; return explicit error objects or raise documented exceptions.",
        "tiger_style:idempotency: Core operations must be idempotent or have clear idempotency keys.",
        "tiger_style:observability: Add logs for critical state transitions and failures.",
        "tiger_style:tests: Provide unit + minimal property tests demonstrating invariants."
    ]
    return "\n".join(f"- {r}" for r in rules)

def create_power_of_10_prompt_fragment(fidelity_level: int, max_fidelity: int, task_description: str) -> str:
    """
    Create a prompt fragment that instructs the agent what a given fidelity level means.
    The agent should implement only the delta required to achieve this level.
    """
    return (
        f"POWER-OF-10: This task is split into {max_fidelity} fidelity levels. "
        f"You are executing fidelity level {fidelity_level}/{max_fidelity}.\n"
        f"Implement only the changes required to satisfy this level's acceptance criteria.\n"
        f"Task: {task_description}\n"
        "- Return a concise machine-parsable progress report at the end:\n"
        "  <iteration id=\"{id}\">\n"
        "    <fidelity>{level}</fidelity>\n"
        "    <files_added>...</files_added>\n"
        "    <files_modified>...</files_modified>\n"
        "    <tests_run>...</tests_run>\n"
        "    <tests_passed>...</tests_passed>\n"
        "    <invariant_violations>...</invariant_violations>\n"
        "    <status>passed|failed|blocked</status>\n"
        "  </iteration>\n"
    ).format(id=str(uuid.uuid4()), level=fidelity_level)

def run_power_of_10_loop(
    developer_run_fn: Callable[[str, Dict], Dict],
    task_description: str,
    context: Dict,
    max_fidelity: int = 5,
    max_iterations: int = DEFAULT_MAX_ITERATIONS
) -> Dict:
    """
    Orchestrates the Power-of-10 loop for a developer-style agent.

    - developer_run_fn: a callable that accepts (prompt_fragment, context) and returns a dict with machine-parsable keys
      like 'files_added', 'tests_passed', 'invariant_violations', 'status'.
    - Returns aggregated result metadata and last successful checkpoint id.
    """
    aggregated = {
        "iterations": [],
        "last_successful_checkpoint": None,
        "overall_status": "incomplete"
    }

    for fidelity in range(1, max_fidelity + 1):
        prompt_frag = create_power_of_10_prompt_fragment(fidelity, max_fidelity, task_description)
        # Append tiger_style contract into the context's prompt area
        extra_contract = generate_tiger_style_contract()
        run_context = dict(context)
        run_context.setdefault("extra_prompt", "")
        run_context["extra_prompt"] += "\n\n" + extra_contract + "\n\n" + prompt_frag

        start = time.time()
        try:
            result = developer_run_fn(prompt_frag, run_context)
        except Exception as exc:
            logger.exception("Developer run function raised exception.")
            result = {"status": "failed", "error": str(exc), "invariant_violations": ["exception"]}

        duration = time.time() - start
        iteration_metadata = {
            "fidelity": fidelity,
            "duration_s": duration,
            "result": result
        }
        aggregated["iterations"].append(iteration_metadata)

        status = result.get("status", "failed")
        violations = result.get("invariant_violations", []) or []
        if status == "passed" and not violations:
            # save checkpoint id if provided
            checkpoint = result.get("checkpoint_id")
            aggregated["last_successful_checkpoint"] = checkpoint
            # if this fidelity is the final level, succeed early
            if fidelity == max_fidelity:
                aggregated["overall_status"] = "succeeded"
                return aggregated
            # otherwise continue to next fidelity
            continue
        else:
            # If violated, attempt local repairs up to small limit (left to developer_run_fn to implement)
            aggregated["overall_status"] = "blocked"
            # Stop loop and return aggregated result for orchestrator to handle (it can choose to resume or backtrack)
            return aggregated

    # Completed loop without final 'succeeded'
    aggregated["overall_status"] = "partial"
    return aggregated
