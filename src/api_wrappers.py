import anthropic
from src.usage import UsageTracker
import time
import httpx
import google.generativeai as genai
import cohere
from mistralai.models import UserMessage
from mistralai.sdk import Mistral
import openai
from huggingface_hub import InferenceClient

class APIWrapper:
    def __init__(self, api_key, usage_tracker: UsageTracker, max_retries=3, backoff_factor=2):
        self.api_key = api_key
        self.usage_tracker = usage_tracker
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor

    def send_request(self, prompt, model):
        raise NotImplementedError

class AnthropicWrapper(APIWrapper):
    def __init__(self, api_key, usage_tracker: UsageTracker, max_retries=3, backoff_factor=2):
        super().__init__(api_key, usage_tracker, max_retries, backoff_factor)
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.provider_name = "anthropic"

    def send_request(self, prompt, model):
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

                input_tokens = message.usage.input_tokens
                output_tokens = message.usage.output_tokens
                self.usage_tracker.record_usage(
                    self.provider_name, model, input_tokens, output_tokens
                )

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

class HuggingFaceWrapper(APIWrapper):
    def __init__(self, api_key, usage_tracker: UsageTracker, max_retries=3, backoff_factor=2):
        super().__init__(api_key, usage_tracker, max_retries, backoff_factor)
        self.client = InferenceClient(token=self.api_key, provider="hf-inference")
        self.provider_name = "huggingface"

    def send_request(self, prompt, model):
        retries = 0
        while retries < self.max_retries:
            try:
                response = self.client.chat_completion(
                    messages=[{"role": "user", "content": prompt}],
                    model=model,
                )

                # NOTE: The Hugging Face Inference API for chat completion does not
                # currently provide token usage information in the response.
                # Therefore, we cannot track usage for these models.
                # We will record 0 for now.
                input_tokens = 0
                output_tokens = 0

                self.usage_tracker.record_usage(
                    self.provider_name, model, input_tokens, output_tokens
                )

                return response.choices[0].message.content
            except Exception as e:
                retries += 1
                if retries >= self.max_retries:
                    print(f"API request failed after {self.max_retries} retries. Error: {e}")
                    raise e
                sleep_time = self.backoff_factor ** retries
                print(f"API request failed. Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)

        return "API request failed after multiple retries."

class QwenWrapper(APIWrapper):
    def __init__(self, api_key, usage_tracker: UsageTracker, max_retries=3, backoff_factor=2):
        super().__init__(api_key, usage_tracker, max_retries, backoff_factor)
        self.client = openai.OpenAI(
            api_key=self.api_key,
            base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
        )
        self.provider_name = "qwen"

    def send_request(self, prompt, model):
        retries = 0
        while retries < self.max_retries:
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}]
                )

                input_tokens = response.usage.prompt_tokens
                output_tokens = response.usage.completion_tokens
                self.usage_tracker.record_usage(
                    self.provider_name, model, input_tokens, output_tokens
                )

                return response.choices[0].message.content
            except Exception as e:
                retries += 1
                if retries >= self.max_retries:
                    print(f"API request failed after {self.max_retries} retries. Error: {e}")
                    raise
                sleep_time = self.backoff_factor ** retries
                print(f"API request failed. Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)

        return "API request failed after multiple retries."

class OpenAIWrapper(APIWrapper):
    def __init__(self, api_key, usage_tracker: UsageTracker, max_retries=3, backoff_factor=2):
        super().__init__(api_key, usage_tracker, max_retries, backoff_factor)
        self.client = openai.OpenAI(api_key=self.api_key)
        self.provider_name = "openai"

    def send_request(self, prompt, model):
        retries = 0
        while retries < self.max_retries:
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}]
                )

                input_tokens = response.usage.prompt_tokens
                output_tokens = response.usage.completion_tokens
                self.usage_tracker.record_usage(
                    self.provider_name, model, input_tokens, output_tokens
                )

                return response.choices[0].message.content
            except Exception as e:
                retries += 1
                if retries >= self.max_retries:
                    print(f"API request failed after {self.max_retries} retries. Error: {e}")
                    raise
                sleep_time = self.backoff_factor ** retries
                print(f"API request failed. Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)

        return "API request failed after multiple retries."

class DeepSeekWrapper(APIWrapper):
    def __init__(self, api_key, usage_tracker: UsageTracker, max_retries=3, backoff_factor=2):
        super().__init__(api_key, usage_tracker, max_retries, backoff_factor)
        self.client = openai.OpenAI(
            api_key=self.api_key,
            base_url="https://api.deepseek.com"
        )
        self.provider_name = "deepseek"

    def send_request(self, prompt, model):
        retries = 0
        while retries < self.max_retries:
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}]
                )

                input_tokens = response.usage.prompt_tokens
                output_tokens = response.usage.completion_tokens
                self.usage_tracker.record_usage(
                    self.provider_name, model, input_tokens, output_tokens
                )

                return response.choices[0].message.content
            except Exception as e:
                retries += 1
                if retries >= self.max_retries:
                    print(f"API request failed after {self.max_retries} retries. Error: {e}")
                    raise
                sleep_time = self.backoff_factor ** retries
                print(f"API request failed. Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)

        return "API request failed after multiple retries."

class MistralWrapper(APIWrapper):
    def __init__(self, api_key, usage_tracker: UsageTracker, max_retries=3, backoff_factor=2):
        super().__init__(api_key, usage_tracker, max_retries, backoff_factor)
        self.client = Mistral(api_key=self.api_key)
        self.provider_name = "mistral"

    def send_request(self, prompt, model):
        retries = 0
        while retries < self.max_retries:
            try:
                messages = [UserMessage(content=prompt)]

                response = self.client.chat.complete(
                    model=model,
                    messages=messages
                )

                input_tokens = response.usage.prompt_tokens
                output_tokens = response.usage.completion_tokens
                self.usage_tracker.record_usage(
                    self.provider_name, model, input_tokens, output_tokens
                )

                return response.choices[0].message.content
            except Exception as e:
                retries += 1
                if retries >= self.max_retries:
                    print(f"API request failed after {self.max_retries} retries. Error: {e}")
                    raise e
                sleep_time = self.backoff_factor ** retries
                print(f"API request failed. Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)

        return "API request failed after multiple retries."

class CohereWrapper(APIWrapper):
    def __init__(self, api_key, usage_tracker: UsageTracker, max_retries=3, backoff_factor=2):
        super().__init__(api_key, usage_tracker, max_retries, backoff_factor)
        self.client = cohere.Client(api_key=self.api_key)
        self.provider_name = "cohere"

    def send_request(self, prompt, model):
        retries = 0
        while retries < self.max_retries:
            try:
                response = self.client.chat(
                    model=model,
                    messages=[{"role": "user", "content": prompt}]
                )

                input_tokens = response.meta['billed_units']['input_tokens']
                output_tokens = response.meta['billed_units']['output_tokens']
                self.usage_tracker.record_usage(
                    self.provider_name, model, input_tokens, output_tokens
                )

                return response.text
            except Exception as e:
                retries += 1
                if retries >= self.max_retries:
                    print(f"API request failed after {self.max_retries} retries. Error: {e}")
                    raise
                sleep_time = self.backoff_factor ** retries
                print(f"API request failed. Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)

        return "API request failed after multiple retries."

class GoogleGeminiWrapper(APIWrapper):
    def __init__(self, api_key, usage_tracker: UsageTracker, max_retries=3, backoff_factor=2):
        super().__init__(api_key, usage_tracker, max_retries, backoff_factor)
        genai.configure(api_key=self.api_key)
        self.provider_name = "google"

    def send_request(self, prompt, model):
        retries = 0
        while retries < self.max_retries:
            try:
                client = genai.GenerativeModel(model)
                response = client.generate_content(prompt)

                usage_metadata = response.usage_metadata
                input_tokens = usage_metadata.prompt_token_count
                output_tokens = usage_metadata.candidates_token_count
                self.usage_tracker.record_usage(
                    self.provider_name, model, input_tokens, output_tokens
                )

                return response.text
            except Exception as e:
                retries += 1
                if retries >= self.max_retries:
                    print(f"API request failed after {self.max_retries} retries. Error: {e}")
                    raise
                sleep_time = self.backoff_factor ** retries
                print(f"API request failed. Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)

        return "API request failed after multiple retries."
