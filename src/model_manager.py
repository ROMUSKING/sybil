from src.api_wrappers import AnthropicWrapper, GoogleGeminiWrapper, CohereWrapper, MistralWrapper
from src.usage import UsageTracker
from datetime import datetime, timedelta

class ModelManager:
    def __init__(self, config, usage_tracker: UsageTracker):
        self.config = config
        self.usage_tracker = usage_tracker
        self.wrappers = {}
        self._initialize_wrappers()

    def _initialize_wrappers(self):
        for provider_name, provider_config in self.config["providers"].items():
            if provider_name == "anthropic":
                if provider_config.get("api_key") != "YOUR_ANTHROPIC_API_KEY":
                    self.wrappers[provider_name] = AnthropicWrapper(
                        api_key=provider_config["api_key"],
                        usage_tracker=self.usage_tracker
                    )
            elif provider_name == "cohere":
                if provider_config.get("api_key") != "YOUR_COHERE_API_KEY":
                    self.wrappers[provider_name] = CohereWrapper(
                        api_key=provider_config["api_key"],
                        usage_tracker=self.usage_tracker
                    )
            elif provider_name == "mistral":
                if provider_config.get("api_key") != "YOUR_MISTRAL_API_KEY":
                    self.wrappers[provider_name] = MistralWrapper(
                        api_key=provider_config["api_key"],
                        usage_tracker=self.usage_tracker
                    )
            elif provider_name == "google":
                if provider_config.get("api_key") != "YOUR_GOOGLE_API_KEY":
                    self.wrappers[provider_name] = GoogleGeminiWrapper(
                        api_key=provider_config["api_key"],
                        usage_tracker=self.usage_tracker
                    )

    def send_request(self, prompt):
        usable_providers = [p for p in self.config["providers"] if p in self.wrappers]

        if not usable_providers:
            # No API keys are set, so simulate
            print("Simulating API call as no API keys are set.")
            self.usage_tracker.record_usage("anthropic", "claude-3-5-sonnet-20240620", 10, 20)
            return "This is a simulated response."

        for provider_name in usable_providers:
            if self._is_quota_available(provider_name):
                print(f"Using provider: {provider_name}")
                return self.wrappers[provider_name].send_request(prompt)

        return "No available models within quota."


    def _is_quota_available(self, provider_name):
        if provider_name == "anthropic":
            provider_config = self.config["providers"]["anthropic"]
            usage = self.usage_tracker.get_usage("anthropic")
            if not usage:
                return True
            total_cost = 0
            for model_name, model_usage in usage.items():
                model_config = next((m for m in provider_config["models"] if m["name"] == model_name), None)
                if model_config:
                    input_cost = model_usage.get("total_input_tokens", 0) * model_config["cost_per_input_token"]
                    output_cost = model_usage.get("total_output_tokens", 0) * model_config["cost_per_output_token"]
                    total_cost += input_cost + output_cost

            return total_cost < provider_config["free_tier_dollars"]
        elif provider_name == "cohere":
            provider_config = self.config["providers"]["cohere"]
            limit = provider_config["free_tier_calls_per_month"]

            usage = self.usage_tracker.get_usage("cohere")
            if not usage:
                return True

            total_requests = 0
            for model_name, model_usage in usage.items():
                total_requests += len(model_usage.get("requests", []))

            return total_requests < limit
        elif provider_name == "mistral":
            return True
        elif provider_name == "google":
            provider_config = self.config["providers"]["google"]
            limit = provider_config["free_tier_requests_per_minute"]

            usage = self.usage_tracker.get_usage("google")
            if not usage:
                return True

            requests_in_last_minute = 0
            now = datetime.now()
            one_minute_ago = now - timedelta(minutes=1)

            for model_name, model_usage in usage.items():
                for request in model_usage.get("requests", []):
                    request_time = datetime.fromisoformat(request["timestamp"])
                    if request_time > one_minute_ago:
                        requests_in_last_minute += 1

            return requests_in_last_minute < limit

        return True # Default to available
