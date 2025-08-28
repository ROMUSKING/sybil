import os
import litellm
from src.usage import UsageTracker

class ModelManager:
    def __init__(self, config, usage_tracker: UsageTracker):
        self.config = config
        self.usage_tracker = usage_tracker
        self.models_map = self.config.get("models", {})

        # Set API keys as environment variables for LiteLLM
        api_keys = self.config.get("api_keys", {})
        for provider, key in api_keys.items():
            env_var_name = f"{provider.upper()}_API_KEY"
            os.environ[env_var_name] = key
            print(f"Set API key for {provider.upper()}")

        litellm.telemetry = False

    def send_request(self, prompt: str, friendly_model_name: str) -> str:
        """
        Sends a request to the specified model using LiteLLM as a unified interface.
        """
        model_info = self.models_map.get(friendly_model_name)
        if not model_info:
            return f"Error: Model '{friendly_model_name}' not found in config.yaml."

        litellm_model_name = model_info.get("litellm_model_name")
        if not litellm_model_name:
            return f"Error: 'litellm_model_name' not defined for model '{friendly_model_name}'."

        print(f"--- Sending request to '{friendly_model_name}' (using litellm model: '{litellm_model_name}') ---")

        try:
            messages = [{"role": "user", "content": prompt}]

            response = litellm.completion(
                model=litellm_model_name,
                messages=messages
            )

            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            content = response.choices[0].message.content

            # Track usage by the friendly model name
            self.usage_tracker.record_usage(
                "litellm", friendly_model_name, input_tokens, output_tokens
            )

            return content

        except Exception as e:
            print(f"An error occurred while calling the model '{litellm_model_name}': {e}")
            return f"Error: {e}"
