import datetime
import json
import os

class UsageTracker:
    def __init__(self, persistence_file=None):
        self.usage_data = {}
        self.persistence_file = persistence_file
        if self.persistence_file and os.path.exists(self.persistence_file):
            self.load_from_file()

    def record_usage(self, provider, model, input_tokens, output_tokens, cost):
        if provider not in self.usage_data:
            self.usage_data[provider] = {}
        if model not in self.usage_data[provider]:
            self.usage_data[provider][model] = {
                "total_input_tokens": 0,
                "total_output_tokens": 0,
                "total_cost": 0.0,
                "requests": []
            }

        self.usage_data[provider][model]["total_input_tokens"] += input_tokens
        self.usage_data[provider][model]["total_output_tokens"] += output_tokens
        self.usage_data[provider][model]["total_cost"] += cost
        self.usage_data[provider][model]["requests"].append({
            "timestamp": datetime.datetime.now().isoformat(),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost": cost
        })

        if self.persistence_file:
            self.save_to_file()

    def get_usage(self, provider):
        return self.usage_data.get(provider, {})

    def save_to_file(self):
        with open(self.persistence_file, 'w') as f:
            json.dump(self.usage_data, f, indent=4)

    def load_from_file(self):
        with open(self.persistence_file, 'r') as f:
            self.usage_data = json.load(f)

    def get_total_tokens(self, provider, model):
        provider_usage = self.usage_data.get(provider, {})
        model_usage = provider_usage.get(model, {})
        return (
            model_usage.get("total_input_tokens", 0),
            model_usage.get("total_output_tokens", 0)
        )
