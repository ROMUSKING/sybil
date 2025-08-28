import yaml
import argparse
from src.usage import UsageTracker
from src.model_manager import ModelManager
from src.agents import OrchestratorAgent

USAGE_FILE = "usage.json"

def load_config(config_path="config.yaml"):
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

def main():
    parser = argparse.ArgumentParser(description="Sybil - A polyagentic software development tool.")
    parser.add_argument("task", type=str, help="The task for the agent to perform.")
    args = parser.parse_args()

    config = load_config()
    usage_tracker = UsageTracker(persistence_file=USAGE_FILE)
    model_manager = ModelManager(config, usage_tracker)
    orchestrator_agent = OrchestratorAgent(model_manager)

    result = orchestrator_agent.run(args.task)

    print("\n--- Task Result ---")
    print(result)

    print("\n--- Final Usage ---")
    print(f"Usage: {usage_tracker.usage_data}")

if __name__ == "__main__":
    main()
