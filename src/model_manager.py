import os
import litellm
from src.usage import UsageTracker
from src.logger import logger

class ModelManager:
    def __init__(self, config, usage_tracker: UsageTracker):
        self.config = config
        self.usage_tracker = usage_tracker
        self.models_map = self.config.get("models", {})

        api_keys = self.config.get("api_keys", {})
        for provider, key in api_keys.items():
            env_var_name = f"{provider.upper()}_API_KEY"
            os.environ[env_var_name] = key
            logger.info(f"Set API key for {provider.upper()}", extra={"provider": provider})

        litellm.telemetry = False

    def send_request(self, prompt: str, friendly_model_names: list[str]) -> str:
        if not friendly_model_names:
            return "Error: No models provided to send_request."

        primary_model_name = friendly_model_names[0]
        fallback_model_names = friendly_model_names[1:]

        litellm_model_list = []
        for name in friendly_model_names:
            model_info = self.models_map.get(name)
            if not model_info or not model_info.get("litellm_model_name"):
                logger.warning(f"Model '{name}' not found or misconfigured in config.yaml, skipping.")
                continue
            litellm_model_list.append(model_info["litellm_model_name"])

        if not litellm_model_list:
            return "Error: None of the provided models are configured correctly."

        primary_litellm_model = litellm_model_list[0]
        fallback_litellm_models = litellm_model_list[1:]

        logger.info(
            "Sending request to model with fallbacks",
            extra={"primary_model": primary_litellm_model, "fallbacks": fallback_litellm_models}
        )

        try:
            messages = [{"role": "user", "content": prompt}]

            response = litellm.completion(
                model=primary_litellm_model,
                messages=messages,
                fallbacks=fallback_litellm_models
            )

            # Find the friendly name of the successful model for usage tracking
            successful_model_name = response.model
            successful_friendly_name = primary_model_name
            for name in friendly_model_names:
                if self.models_map.get(name, {}).get("litellm_model_name") == successful_model_name:
                    successful_friendly_name = name
                    break

            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            content = response.choices[0].message.content

            cost = litellm.completion_cost(completion_response=response)

            self.usage_tracker.record_usage(
                "litellm", successful_friendly_name, input_tokens, output_tokens, cost
            )

            logger.info("Received response from model", extra={"model_name": successful_friendly_name, "cost": cost})
            return content

        except Exception as e:
            logger.error("Error calling model via LiteLLM", extra={"models_attempted": litellm_model_list, "error": str(e)})
            return f"Error: {e}"
