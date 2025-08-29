import yaml
import argparse
import time
import uuid
from src.usage import UsageTracker
from src.model_manager import ModelManager
from src.agents import OrchestratorAgent
from src.logger import logger

USAGE_FILE = "usage.json"

def load_config(config_path="config.yaml"):
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

def main():
    start_time = time.time()
    parser = argparse.ArgumentParser(description="Sybil - A polyagentic software development tool.")
    parser.add_argument("task", type=str, help="The task for the agent to perform.")
    parser.add_argument("--session-id", type=str, help="The session ID to resume a project. If not provided, a new session will be started.")
    args = parser.parse_args()

    logger.info("Sybil starting.", extra={"task": args.task, "session_id": args.session_id})

    config = load_config()
    usage_tracker = UsageTracker(persistence_file=USAGE_FILE)
    model_manager = ModelManager(config, usage_tracker)

    # The OrchestratorAgent now encapsulates the entire workflow.
    orchestrator = OrchestratorAgent(model_manager, config)

    result = orchestrator.run(args.task, session_id=args.session_id)

    end_time = time.time()
    total_runtime = end_time - start_time

    logger.info("Sybil finished.", extra={"task_result": result})

    # --- Final Analytics Report ---
    performance_report = orchestrator.get_performance_report()
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
