import os
import litellm
from src.usage import UsageTracker
from src.logger import logger

class ModelManager:
    def __init__(self, config, usage_tracker: UsageTracker, verbose: bool = False):
        self.config = config
        self.usage_tracker = usage_tracker
        self.verbose = verbose
        self.models_map = self.config.get("models", {})

        api_keys = self.config.get("api_keys", {})
        for provider, key in api_keys.items():
            env_var_name = f"{provider.upper()}_API_KEY"
            os.environ[env_var_name] = key
            logger.info(f"Set API key for {provider.upper()}", extra={"provider": provider})

        # Explicitly set the OpenRouter API base if the key is present
        if "openrouter" in api_keys:
            os.environ["OPENROUTER_API_BASE"] = "https://openrouter.ai/api/v1"
            logger.info("Set API base for OpenRouter")

        litellm.telemetry = False

    def send_request(self, prompt: str, friendly_model_names: list[str]) -> str:
        if not friendly_model_names:
            logger.error("No models provided to send_request")
            return "Error: No models provided."

        litellm_model_names = []
        for friendly_name in friendly_model_names:
            model_info = self.models_map.get(friendly_name)
            if not model_info:
                logger.warning(f"Model '{friendly_name}' not found in config.yaml, skipping.")
                continue

            litellm_name = model_info.get("litellm_model_name")
            if not litellm_name:
                logger.warning(f"'litellm_model_name' not defined for model '{friendly_name}', skipping.")
                continue

            litellm_model_names.append(litellm_name)

        if not litellm_model_names:
            logger.error("No valid models found after checking config.", extra={"friendly_names": friendly_model_names})
            return "Error: No valid models found in config."

        primary_model = litellm_model_names[0]
        fallback_models = litellm_model_names[1:]

        logger.info(
            "Sending request to model with fallbacks",
            extra={"primary_model": primary_model, "fallbacks": fallback_models}
        )

        messages = [{"role": "user", "content": prompt}]
        if self.verbose:
            print("--- Request ---")
            print(prompt)
            print("---------------")

        response = litellm.completion(
            model=primary_model,
            messages=messages,
            fallbacks=fallback_models
        )

        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens
        content = response.choices[0].message.content
        response_model = response.model # Get the actual model used

        if self.verbose:
            print("--- Response ---")
            print(content)
            print("----------------")

        try:
            cost = litellm.completion_cost(completion_response=response)
        except Exception as e:
            logger.warning(f"Could not calculate cost for model {response_model}: {e}")
            cost = 0

        # Find the friendly name of the model that was actually used
        used_friendly_name = "unknown"
        for friendly_name, model_info in self.models_map.items():
            if model_info.get("litellm_model_name") == response_model:
                used_friendly_name = friendly_name
                break

        self.usage_tracker.record_usage(
            "litellm", used_friendly_name, input_tokens, output_tokens, cost
        )

        logger.info("Received response from model", extra={"model_name": used_friendly_name, "cost": cost})
        return content
