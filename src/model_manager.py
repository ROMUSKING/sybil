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

        # Explicitly set the OpenRouter API base if the key is present
        if "openrouter" in api_keys:
            os.environ["OPENROUTER_API_BASE"] = "https://openrouter.ai/api/v1"
            logger.info("Set API base for OpenRouter")

        litellm.telemetry = False

    def send_request(self, prompt: str, friendly_model_name: str) -> str:
        model_info = self.models_map.get(friendly_model_name)
        if not model_info:
            logger.error("Model not found in config.yaml", extra={"model_name": friendly_model_name})
            return f"Error: Model '{friendly_model_name}' not found in config.yaml."

        litellm_model_name = model_info.get("litellm_model_name")
        if not litellm_model_name:
            logger.error("'litellm_model_name' not defined for model", extra={"model_name": friendly_model_name})
            return f"Error: 'litellm_model_name' not defined for model '{friendly_model_name}'."

        messages = [{"role": "user", "content": prompt}]
        logger.info(
            "Sending request to model via LiteLLM",
            extra={
                "friendly_model_name": friendly_model_name,
                "litellm_model_name": litellm_model_name,
                "messages": messages,
            },
        )

        try:
            response = litellm.completion(
                model=litellm_model_name,
                messages=messages
            )

            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            content = response.choices[0].message.content
            cost = litellm.completion_cost(completion_response=response)

            self.usage_tracker.record_usage(
                "litellm", friendly_model_name, input_tokens, output_tokens, cost
            )

            logger.info(
                "Received response from model",
                extra={
                    "model_name": friendly_model_name,
                    "cost": cost,
                    "response_content": content,
                },
            )
            return content

        except Exception as e:
            logger.error("Error calling model via LiteLLM", extra={"model_name": litellm_model_name, "error": str(e)})
            return f"Error: {e}"
