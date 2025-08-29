"""
"""
Integration helpers that adapt a DeveloperAgent-like object to run_power_of_10_loop.

Expectations for developer_agent:
- developer_agent.run(prompt: str, context: dict) -> dict
  Where returned dict contains machine-parsable keys:
    - 'status': 'passed'|'failed'|'blocked'
    - optional 'files_added', 'files_modified', 'tests_run', 'tests_passed'
    - optional 'invariant_violations' (list)
    - optional 'checkpoint_id' (string)
"""

from typing import Callable, Dict, Any
from src.agent_strategies import run_power_of_10_loop, generate_tiger_style_contract

def _make_developer_runner(developer_agent: Any) -> Callable[[str, Dict[str, Any]], Dict[str, Any]]:
    """
    Wrap a developer_agent into the developer_run_fn expected by run_power_of_10_loop.
    This wrapper composes the prompt fragment and the agent's context and calls developer_agent.run.
    """

    def developer_run_fn(prompt_fragment: str, context: Dict[str, Any]) -> Dict[str, Any]:
        # Compose the agent prompt: prefer context['prompt'] as base if present.
        base_prompt = context.get("prompt", "")
        extra_prompt = context.get("extra_prompt", "")
        full_prompt = "\n\n".join(p for p in [base_prompt, extra_prompt, prompt_fragment] if p)
        # developer_agent may accept different method names; try run(), execute(), or call.
        run_callable = None
        for attr in ("run", "execute", "__call__"):
            if hasattr(developer_agent, attr):
                run_callable = getattr(developer_agent, attr)
                break
        if run_callable is None:
            raise RuntimeError("developer_agent has no run/execute interface")

        # Call the agent and expect a machine-parsable dict back.
        # Prefer keyword prompt if supported, otherwise positional.
        try:
            # Some callables (bound methods) may not expose __code__; be defensive.
            supports_prompt_kw = False
            try:
                supports_prompt_kw = "prompt" in getattr(run_callable, "__code__", {}).co_varnames
            except Exception:
                supports_prompt_kw = False

            if supports_prompt_kw:
                result = run_callable(prompt=full_prompt, context=context)
            else:
                result = run_callable(full_prompt, context)
        except Exception as exc:
            return {"status": "failed", "error": str(exc)}

        if not isinstance(result, dict):
            return {"status": "failed", "error": "developer_agent returned non-dict result", "raw": str(result)}
        return result

    return developer_run_fn

def run_integration(developer_agent: Any, task_description: str, context: Dict[str, Any], max_fidelity: int = 5) -> Dict[str, Any]:
    """
    Convenience entrypoint to run the Power-of-10 loop using a developer_agent instance.
    Returns the aggregated result from run_power_of_10_loop.
    """
    dev_runner = _make_developer_runner(developer_agent)
    # Ensure tiger_style contract is visible to the agent (integration-level convenience)
    context = dict(context)
    context.setdefault("extra_prompt", "")
    context["extra_prompt"] += "\n\n" + generate_tiger_style_contract()
    return run_power_of_10_loop(dev_runner, task_description, context, max_fidelity=max_fidelity)