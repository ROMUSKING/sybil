import yaml
import argparse
from src.usage import UsageTracker
from src.model_manager import ModelManager
from src.agents import ManagerAgent

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

    # Simulate exceeding Anthropic, Google and Cohere quotas
    print("--- Simulating Anthropic, Google and Cohere quotas exceeded ---")
    usage_tracker.record_usage("anthropic", "claude-3-5-sonnet-20240620", 3000000, 100000)
    for _ in range(60):
        usage_tracker.record_usage("google", "gemini-pro", 1, 1)
    for _ in range(1000):
        usage_tracker.record_usage("cohere", "command-r", 1, 1)

    model_manager = ModelManager(config, usage_tracker)
    manager_agent = ManagerAgent(model_manager)

    try:
        result = manager_agent.run(args.task)
        print(f"Result: {result}")
    except Exception as e:
        print(f"Caught exception: {e}")

    print("\n--- Final Usage ---")
    print(f"Usage: {usage_tracker.usage_data}")

if __name__ == "__main__":
    main()
