import yaml
import argparse
from src.usage import UsageTracker
from src.model_manager import ModelManager
from src.agents import OrchestratorAgent
from src.logger import logger

USAGE_FILE = "usage.json"

def load_config(config_path="config.yaml"):
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

def main():
    parser = argparse.ArgumentParser(description="Sybil - A polyagentic software development tool.")
    parser.add_argument("task", type=str, help="The task for the agent to perform.")
    args = parser.parse_args()

    logger.info("Sybil starting.", extra={"task": args.task})

    config = load_config()
    usage_tracker = UsageTracker(persistence_file=USAGE_FILE)
    model_manager = ModelManager(config, usage_tracker)
    orchestrator_agent = OrchestratorAgent(model_manager, config)

    result = orchestrator_agent.run(args.task)

    logger.info("Sybil finished.", extra={"task_result": result})
    logger.info("Final usage.", extra={"usage_data": usage_tracker.usage_data})


if __name__ == "__main__":
    main()
