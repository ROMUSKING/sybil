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
        return yaml.safe_load(f)

def main():
    start_time = time.time()
    parser = argparse.ArgumentParser(description="Sybil - A polyagentic software development tool.")
    parser.add_argument("task", type=str, help="The task for the agent to perform.")
    parser.add_argument("--session-id", type=str, help="The session ID to resume a project. If not provided, a new session will be started.")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging to print full requests and responses.")
    args = parser.parse_args()

    logger.info("Sybil starting.", extra={"task": args.task, "session_id": args.session_id})

    config = load_config()
    usage_tracker = UsageTracker(persistence_file=USAGE_FILE)
    performance_tracker = PerformanceTracker()
    model_manager = ModelManager(config, usage_tracker, verbose=args.verbose)

    # The OrchestratorAgent now encapsulates the entire workflow.
    orchestrator = OrchestratorAgent(model_manager, config, performance_tracker)

    result = orchestrator.run(args.task, session_id=args.session_id)

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
