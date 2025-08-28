import os
import litellm
from src.usage import UsageTracker

class ModelManager:
    def __init__(self, config, usage_tracker: UsageTracker):
        self.config = config
        self.usage_tracker = usage_tracker
        # Set the API key for OpenRouter
        os.environ["OPENROUTER_API_KEY"] = self.config.get("openrouter", {}).get("api_key", "")
        # Disable litellm's built-in telemetry
        litellm.telemetry = False

    def send_request(self, prompt, model):
        """
        Sends a request to the specified model via OpenRouter and tracks usage.
        """
        if not os.environ.get("OPENROUTER_API_KEY"):
            print("--- SIMULATION MODE: No OpenRouter API key found. ---")
            # In simulation mode, we just return a placeholder and don't track usage.
            return f"Simulated response for model {model}."

        print(f"--- Sending request to {model} via OpenRouter ---")

        try:
            # For simplicity, we'll assume the prompt is the user's message.
            # A more robust implementation would handle system prompts separately.
            messages = [{"role": "user", "content": prompt}]

            response = litellm.completion(
                model=model,
                messages=messages,
                api_base="https://openrouter.ai/api/v1" # As per OpenRouter docs
            )

            # Extract usage info and content
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            content = response.choices[0].message.content

            # Track usage
            # The provider is always 'openrouter', but we track usage by model
            self.usage_tracker.record_usage(
                "openrouter", model, input_tokens, output_tokens
            )

            return content

        except Exception as e:
            # LiteLLM raises exceptions from the underlying provider (e.g., openai.RateLimitError)
            # or its own exceptions. We can catch them here.
            print(f"An error occurred while calling the model: {e}")
            return f"Error: {e}"
