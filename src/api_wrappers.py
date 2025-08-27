import anthropic
from src.usage import UsageTracker
import time
import httpx

class APIWrapper:
    def __init__(self, api_key, usage_tracker: UsageTracker, max_retries=3, backoff_factor=2):
        self.api_key = api_key
        self.usage_tracker = usage_tracker
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor

    def send_request(self, prompt):
        raise NotImplementedError

class AnthropicWrapper(APIWrapper):
    def __init__(self, api_key, usage_tracker: UsageTracker, max_retries=3, backoff_factor=2):
        super().__init__(api_key, usage_tracker, max_retries, backoff_factor)
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.provider_name = "anthropic"

    def send_request(self, prompt):
        model="claude-3-5-sonnet-20240620"
        retries = 0
        while retries < self.max_retries:
            try:
                message = self.client.messages.create(
                    model=model,
                    max_tokens=1024,
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                )

                # Record usage
                input_tokens = message.usage.input_tokens
                output_tokens = message.usage.output_tokens
                self.usage_tracker.record_usage(
                    self.provider_name, model, input_tokens, output_tokens
                )

                # Return only the text content
                if message.content and isinstance(message.content, list) and len(message.content) > 0:
                    return message.content[0].text
                return ""
            except (anthropic.APIConnectionError, httpx.RequestError) as e:
                retries += 1
                if retries >= self.max_retries:
                    print(f"API request failed after {self.max_retries} retries. Error: {e}")
                    raise
                sleep_time = self.backoff_factor ** retries
                print(f"API request failed. Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)
            except anthropic.APIStatusError as e:
                print(f"Anthropic API error: {e.status_code} - {e.response}")
                raise

        return "API request failed after multiple retries."
