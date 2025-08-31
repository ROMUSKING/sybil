import yaml
import argparse
import time
import uuid
from src.usage import UsageTracker
from src.model_manager import ModelManager
from src.agents import OrchestratorAgent
from src.logger import logger
from src.performance import PerformanceTracker

USAGE_FILE = "usage.json"

def load_config(config_path="config.yaml"):
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    config.setdefault("session", {"current_session_id": None})
    return config

def save_config(config, config_path="config.yaml"):
    with open(config_path, 'w') as f:
        yaml.safe_dump(config, f)

def main():
    start_time = time.time()
    parser = argparse.ArgumentParser(description="Sybil - A polyagentic software development tool.")
    parser.add_argument("task", type=str, help="The task for the agent to perform.")
    parser.add_argument("--session-id", type=str, help="The session ID to resume a project. If not provided, a new session will be started.")
    parser.add_argument("--clear-session", action="store_true", help="Clear the stored session ID.")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging to print full requests and responses.")
    args = parser.parse_args()

    logger.info("Sybil starting.", extra={"task": args.task, "session_id": args.session_id})

    config = load_config()

    if args.clear_session:
        config["session"]["current_session_id"] = None
        save_config(config)
        logger.info("Session cleared.")
        return

    usage_tracker = UsageTracker(persistence_file=USAGE_FILE)
    performance_tracker = PerformanceTracker()
    model_manager = ModelManager(config, usage_tracker, verbose=args.verbose)

    # Handle session ID
    if args.session_id:
        session_id = args.session_id
        update_config = False
    else:
        stored_session = config.get("session", {}).get("current_session_id")
        if stored_session:
            session_id = stored_session
            update_config = True
            logger.info(f"Resuming stored session: {session_id}")
        else:
            session_id = str(uuid.uuid4())
            config["session"]["current_session_id"] = session_id
            save_config(config)
            update_config = True
            logger.info(f"Created new session: {session_id}")

    # The OrchestratorAgent now encapsulates the entire workflow.
    orchestrator = OrchestratorAgent(model_manager, config, performance_tracker)

    result = orchestrator.run(args.task, session_id=session_id)

    # Update session in config based on result, only if we didn't provide --session-id
    if update_config:
        if "error" in result.lower() or "failed" in result.lower():
            # Keep the session for potential retry
            config["session"]["current_session_id"] = session_id
        else:
            # Success, clear the session
            config["session"]["current_session_id"] = None
        save_config(config)

    end_time = time.time()
    total_runtime = end_time - start_time

    logger.info("Sybil finished.", extra={"task_result": result})

    # --- Final Analytics Report ---
    try:
        performance_tracker.save()
    except Exception as e:
        logger.error(f"Failed to save performance data: {e}", exc_info=True)
    performance_report = performance_tracker.get_report()
    final_usage = usage_tracker.usage_data

    # Calculate total cost
    total_cost = sum(
        model_data.get("total_cost", 0)
        for provider_data in final_usage.values()
        for model_data in provider_data.values()
    )

    analytics_summary = {
        "total_runtime_seconds": round(total_runtime, 2),
        "total_cost_usd": round(total_cost, 6),
        "performance_by_agent": performance_report,
        "usage_by_model": final_usage
    }

    logger.info("--- Analytics Summary ---", extra=analytics_summary)


if __name__ == "__main__":
    main()
