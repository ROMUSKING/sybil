import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { OpenAI } from 'openai';
import { UsageTracker } from './usage_tracker';
import { ProviderConfig } from './graph_state';

interface ModelConfig {
    litellmModelName: string;
    isFree?: boolean;
    contextWindow?: number;
    description?: string;
}

interface APIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    model: string;
}

export class ModelManager {
    private config: any;
    private usageTracker: UsageTracker;
    private verbose: boolean;
    private modelsMap: { [key: string]: ModelConfig };

    constructor(config: any, usageTracker: UsageTracker, verbose: boolean = false) {
        this.config = config;
        this.usageTracker = usageTracker;
        this.verbose = verbose;
        this.modelsMap = this.config.models || {};

        // Set API keys as environment variables
        const apiKeys = this.config.api_keys || {};
        for (const [provider, key] of Object.entries(apiKeys)) {
            if (typeof key === 'string') {
                process.env[`${provider.toUpperCase()}_API_KEY`] = key;
                console.log(`Set API key for ${provider}`);
            }
        }

        // Set OpenRouter API base if present
        if (apiKeys.openrouter) {
            process.env['OPENROUTER_API_BASE'] = 'https://openrouter.ai/api/v1';
            console.log('Set API base for OpenRouter');
        }
    }

    public async sendRequest(prompt: string, friendlyModelNames: string[]): Promise<string> {
        if (!friendlyModelNames.length) {
            console.error('No models provided to sendRequest');
            return 'Error: No models provided.';
        }

        const litellmModelNames: string[] = [];

        for (const friendlyName of friendlyModelNames) {
            const modelInfo = this.modelsMap[friendlyName];
            if (!modelInfo) {
                console.warn(`Model '${friendlyName}' not found in config, skipping.`);
                continue;
            }

            if (!modelInfo.litellmModelName) {
                console.warn(`'litellmModelName' not defined for model '${friendlyName}', skipping.`);
                continue;
            }

            litellmModelNames.push(modelInfo.litellmModelName);
        }

        if (!litellmModelNames.length) {
            console.error('No valid models found after checking config.', { friendlyNames: friendlyModelNames });
            return 'Error: No valid models found in config.';
        }

        const primaryModel = litellmModelNames[0];
        if (!primaryModel) {
            console.error('No primary model available');
            return 'Error: No primary model available.';
        }
        const fallbackModels = litellmModelNames.slice(1);

        console.log('Sending request to model with fallbacks', {
            primaryModel,
            fallbacks: fallbackModels
        });

        if (this.verbose) {
            console.log('--- Request ---');
            console.log(prompt);
            console.log('---------------');
        }

        try {
            const response = await this.callAIProvider(primaryModel, prompt);

            if (this.verbose) {
                console.log('--- Response ---');
                console.log(response.content);
                console.log('----------------');
            }

            // Track usage
            this.usageTracker.recordUsage(
                this.getProviderFromModel(primaryModel),
                this.getFriendlyNameFromModel(primaryModel),
                response.usage.prompt_tokens,
                response.usage.completion_tokens,
                this.calculateCost(primaryModel, response.usage.prompt_tokens, response.usage.completion_tokens)
            );

            console.log('Received response from model', {
                modelName: this.getFriendlyNameFromModel(primaryModel),
                cost: this.calculateCost(primaryModel, response.usage.prompt_tokens, response.usage.completion_tokens)
            });

            return response.content;

        } catch (primaryError) {
            console.warn(`Primary model ${primaryModel} failed, trying fallbacks...`, primaryError);

            // Try fallback models
            for (const fallbackModel of fallbackModels) {
                try {
                    console.log(`Trying fallback model: ${fallbackModel}`);
                    const response = await this.callAIProvider(fallbackModel, prompt);

                    if (this.verbose) {
                        console.log('--- Fallback Response ---');
                        console.log(response.content);
                        console.log('----------------');
                    }

                    // Track usage for fallback
                    this.usageTracker.recordUsage(
                        this.getProviderFromModel(fallbackModel),
                        this.getFriendlyNameFromModel(fallbackModel),
                        response.usage.prompt_tokens,
                        response.usage.completion_tokens,
                        this.calculateCost(fallbackModel, response.usage.prompt_tokens, response.usage.completion_tokens)
                    );

                    console.log('Received response from fallback model', {
                        modelName: this.getFriendlyNameFromModel(fallbackModel),
                        cost: this.calculateCost(fallbackModel, response.usage.prompt_tokens, response.usage.completion_tokens)
                    });

                    return response.content;

                } catch (fallbackError) {
                    console.warn(`Fallback model ${fallbackModel} also failed`, fallbackError);
                    continue;
                }
            }

            // All models failed
            console.error('All models failed, returning error message');
            return `Error: All AI models failed. Primary error: ${primaryError instanceof Error ? primaryError.message : 'Unknown error'}`;
        }
    }

    private async callAIProvider(modelName: string, prompt: string): Promise<{ content: string; usage: any; model: string }> {
        const [provider, model] = this.parseModelName(modelName);

        switch (provider) {
            case 'openrouter':
                return await this.callOpenRouter(model, prompt);
            case 'huggingface':
                return await this.callHuggingFace(model, prompt);
            case 'openai':
                return await this.callOpenAI(model, prompt);
            case 'anthropic':
                return await this.callAnthropic(model, prompt);
            case 'gemini':
                return await this.callGeminiDirect(model, prompt);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    private async callOpenRouter(model: string, prompt: string): Promise<{ content: string; usage: any; model: string }> {
        const apiKey = process.env['OPENROUTER_API_KEY'];
        if (!apiKey) {
            throw new Error('OpenRouter API key not found');
        }

        const requestBody = {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 4096
        };

        const response = await this.makeHttpRequest('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://sybil-extension',
                'X-Title': 'Sybil AI Assistant'
            },
            body: JSON.stringify(requestBody)
        });

        const data: APIResponse = JSON.parse(response);
        return {
            content: data.choices[0]?.message?.content || '',
            usage: data.usage,
            model: data.model || model
        };
    }

    private async callHuggingFace(model: string, prompt: string): Promise<{ content: string; usage: any; model: string }> {
        const apiKey = process.env['HUGGINGFACE_API_KEY'];
        if (!apiKey) {
            throw new Error('HuggingFace API key not found');
        }

        // Use OpenAI SDK with HuggingFace router
        const client = new OpenAI({
            baseURL: "https://router.huggingface.co/v1",
            apiKey: apiKey,
        });

        try {
            const chatCompletion = await client.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 4096,
            });

            const content = chatCompletion.choices[0]?.message?.content || '';
            const usage = chatCompletion.usage;

            return {
                content,
                usage: {
                    prompt_tokens: usage?.prompt_tokens || 0,
                    completion_tokens: usage?.completion_tokens || 0,
                    total_tokens: usage?.total_tokens || 0
                },
                model: chatCompletion.model || model
            };
        } catch (error) {
            // Fallback to direct API call if OpenAI SDK fails
            console.warn('OpenAI SDK failed for HuggingFace, falling back to direct API call:', error);
            return await this.callHuggingFaceDirect(model, prompt);
        }
    }

    private async callHuggingFaceDirect(model: string, prompt: string): Promise<{ content: string; usage: any; model: string }> {
        const apiKey = process.env['HUGGINGFACE_API_KEY'];
        if (!apiKey) {
            throw new Error('HuggingFace API key not found');
        }

        // Parse HuggingFace model format: "model_name:provider"
        const [modelName, provider] = model.split(':');

        const requestBody = {
            inputs: prompt,
            parameters: {
                max_new_tokens: 4096,
                temperature: 0.7,
                do_sample: true
            }
        };

        const url = `https://api-inference.huggingface.co/models/${modelName}`;
        const response = await this.makeHttpRequest(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = JSON.parse(response);

        // HuggingFace response format is different
        let content = '';
        if (Array.isArray(data) && data.length > 0) {
            content = data[0].generated_text || '';
        } else if (data.generated_text) {
            content = data.generated_text;
        }

        // Estimate token usage (rough approximation)
        const estimatedInputTokens = Math.ceil(prompt.length / 4);
        const estimatedOutputTokens = Math.ceil(content.length / 4);

        return {
            content,
            usage: {
                prompt_tokens: estimatedInputTokens,
                completion_tokens: estimatedOutputTokens,
                total_tokens: estimatedInputTokens + estimatedOutputTokens
            },
            model: modelName || model
        };
    }

    private async callOpenAI(model: string, prompt: string): Promise<{ content: string; usage: any; model: string }> {
        const apiKey = process.env['OPENAI_API_KEY'];
        if (!apiKey) {
            throw new Error('OpenAI API key not found');
        }

        const requestBody = {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 4096
        };

        const response = await this.makeHttpRequest('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data: APIResponse = JSON.parse(response);
        return {
            content: data.choices[0]?.message?.content || '',
            usage: data.usage,
            model: data.model || model
        };
    }

    private async callAnthropic(model: string, prompt: string): Promise<{ content: string; usage: any; model: string }> {
        const apiKey = process.env['ANTHROPIC_API_KEY'];
        if (!apiKey) {
            throw new Error('Anthropic API key not found');
        }

        const requestBody = {
            model: model,
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }]
        };

        const response = await this.makeHttpRequest('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = JSON.parse(response);

        // Estimate token usage for Anthropic
        const estimatedInputTokens = Math.ceil(prompt.length / 4);
        const estimatedOutputTokens = Math.ceil((data.content?.[0]?.text || '').length / 4);

        return {
            content: data.content?.[0]?.text || '',
            usage: {
                prompt_tokens: estimatedInputTokens,
                completion_tokens: estimatedOutputTokens,
                total_tokens: estimatedInputTokens + estimatedOutputTokens
            },
            model: data.model || model
        };
    }

    private async callGeminiDirect(model: string, prompt: string): Promise<{ content: string; usage: any; model: string }> {
        const apiKey = process.env['GOOGLE_API_KEY'];
        if (!apiKey) {
            throw new Error('Google API key not found');
        }

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
                topP: 0.8,
                topK: 10
            }
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await this.makeHttpRequest(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = JSON.parse(response);

        if (data.error) {
            throw new Error(`Gemini API error: ${data.error.message}`);
        }

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Estimate token usage for Gemini
        const estimatedInputTokens = Math.ceil(prompt.length / 4);
        const estimatedOutputTokens = Math.ceil(content.length / 4);

        return {
            content,
            usage: {
                prompt_tokens: estimatedInputTokens,
                completion_tokens: estimatedOutputTokens,
                total_tokens: estimatedInputTokens + estimatedOutputTokens
            },
            model: model
        };
    }

    private async makeHttpRequest(url: string, options: any): Promise<string> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;

            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: options.headers || {}
            };

            const req = client.request(requestOptions, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (options.body) {
                req.write(options.body);
            }

            req.end();
        });
    }

    private parseModelName(modelName: string): [string, string] {
        if (modelName.includes('/')) {
            const parts = modelName.split('/');
            if (parts.length >= 2 && parts[0]) {
                return [parts[0], parts.slice(1).join('/')];
            }
        }
        return ['openai', modelName]; // Default to OpenAI
    }

    private getProviderFromModel(modelName: string): string {
        const [provider] = this.parseModelName(modelName);
        return provider;
    }

    private getFriendlyNameFromModel(modelName: string): string {
        for (const [friendlyName, modelInfo] of Object.entries(this.modelsMap)) {
            if (modelInfo.litellmModelName === modelName) {
                return friendlyName;
            }
        }
        return modelName;
    }

    private calculateCost(modelName: string, inputTokens: number, outputTokens: number): number {
        // Simplified cost calculation - in production, you'd use actual pricing
        const [provider] = this.parseModelName(modelName);

        const rates: { [key: string]: { input: number; output: number } } = {
            'openrouter': { input: 0.000001, output: 0.000002 }, // Very low for free models
            'huggingface': { input: 0.0000005, output: 0.000001 },
            'openai': { input: 0.0000015, output: 0.000002 },
            'anthropic': { input: 0.000003, output: 0.000015 },
            'gemini': { input: 0.0000005, output: 0.0000015 } // Gemini Flash pricing
        };

        const rate = rates[provider] || { input: 0.000001, output: 0.000002 };
        return (inputTokens * rate.input) + (outputTokens * rate.output);
    }

    // Keep the existing mock methods for backward compatibility during testing
    private async mockAIResponse(prompt: string, model: string): Promise<string> {
        // This is kept for fallback during development
        const lowerPrompt = prompt.toLowerCase();

        if (lowerPrompt.includes('architect') || lowerPrompt.includes('blueprint')) {
            return `<blueprint>
  <module name="UserManagement">
    <tasks>
      <task id="user-1" description="Create user model in src/models/user.ts" />
      <task id="user-2" description="Implement user authentication in src/auth/auth.ts" />
    </tasks>
  </module>
  <module name="API">
    <dependencies>
      <dependency>UserManagement</dependency>
    </dependencies>
    <tasks>
      <task id="api-1" description="Create REST API endpoints in src/api/routes.ts" />
    </tasks>
  </module>
</blueprint>`;
        }

        if (lowerPrompt.includes('developer') || lowerPrompt.includes('implement')) {
            return `<final_answer>
<file>src/models/user.ts</file>
<file>src/auth/auth.ts</file>
</final_answer>`;
        }

        if (lowerPrompt.includes('review')) {
            return `<review>
<status>approved</status>
<comment>Code looks good and follows best practices.</comment>
</review>`;
        }

        if (lowerPrompt.includes('document')) {
            return `## User Management System

### Features Added:
- User model with TypeScript interfaces
- Authentication system with JWT
- REST API endpoints for user operations

### Files Modified:
- \`src/models/user.ts\` - User data model
- \`src/auth/auth.ts\` - Authentication logic
- \`src/api/routes.ts\` - API endpoints

### Next Steps:
- Add input validation
- Implement password hashing
- Add unit tests`;
        }

        return `I've analyzed your request and created a comprehensive solution. The implementation includes proper error handling, type safety, and follows best practices for the given technology stack.`;
    }

    public getApiKey(provider: string): string {
        return this.config.api_keys?.[provider] || '';
    }

    public setApiKey(provider: string, key: string): void {
        if (!this.config.api_keys) {
            this.config.api_keys = {};
        }
        this.config.api_keys[provider] = key;
    }

    public getProviderConfig(provider: string): any {
        return {
            name: provider.charAt(0).toUpperCase() + provider.slice(1),
            baseUrl: this.getProviderBaseUrl(provider)
        };
    }

    private getProviderBaseUrl(provider: string): string {
        const baseUrls: { [key: string]: string } = {
            openrouter: 'https://openrouter.ai/api/v1',
            openai: 'https://api.openai.com/v1',
            anthropic: 'https://api.anthropic.com',
            huggingface: 'https://api-inference.huggingface.co',
            google: 'https://generativelanguage.googleapis.com'
        };
        return baseUrls[provider] || '';
    }

    public getProviders(): string[] {
        return Object.keys(this.config.api_keys || {});
    }

    public async validateModel(modelName: string): Promise<boolean> {
        const modelInfo = this.modelsMap[modelName];
        return !!modelInfo;
    }

    public getFreeModels(): Array<{ name: string; provider: string; config: any }> {
        const freeModels: Array<{ name: string; provider: string; config: any }> = [];

        for (const [modelName, modelConfig] of Object.entries(this.modelsMap)) {
            if (modelConfig.isFree) {
                const [provider] = this.parseModelName(modelConfig.litellmModelName);
                freeModels.push({
                    name: modelName,
                    provider,
                    config: modelConfig
                });
            }
        }

        return freeModels;
    }

    public getModelStats(): { [provider: string]: { totalModels: number; freeModels: number } } {
        const stats: { [provider: string]: { totalModels: number; freeModels: number } } = {};

        for (const [modelName, modelConfig] of Object.entries(this.modelsMap)) {
            const [provider] = this.parseModelName(modelConfig.litellmModelName);
            if (!stats[provider]) {
                stats[provider] = { totalModels: 0, freeModels: 0 };
            }
            stats[provider]!.totalModels++;
            if (modelConfig.isFree) {
                stats[provider]!.freeModels++;
            }
        }

        return stats;
    }
}
