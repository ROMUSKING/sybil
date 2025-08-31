import * as vscode from 'vscode';
import { UsageTracker } from './usage_tracker';
import { ProviderConfig } from './graph_state';

export class ModelManager {
    private config: any;
    private usageTracker: UsageTracker;
    private verbose: boolean;
    private modelsMap: { [key: string]: ProviderConfig };

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

            // For now, we'll use a simple approach since we don't have litellm in TypeScript
            // In a real implementation, you'd integrate with the actual AI service
            litellmModelNames.push(friendlyName);
        }

        if (!litellmModelNames.length) {
            console.error('No valid models found after checking config.', { friendlyNames: friendlyModelNames });
            return 'Error: No valid models found in config.';
        }

        const primaryModel = litellmModelNames[0];
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

        // For now, return a mock response since we don't have actual AI integration
        // In a real implementation, you'd call the actual AI service here
        const mockResponse = await this.mockAIResponse(prompt, primaryModel!);

        if (this.verbose) {
            console.log('--- Response ---');
            console.log(mockResponse);
            console.log('----------------');
        }

        // Mock usage tracking
        const inputTokens = Math.ceil(prompt.length / 4); // Rough estimation
        const outputTokens = Math.ceil(mockResponse.length / 4);
        const cost = 0.001; // Mock cost

        this.usageTracker.recordUsage('mock_provider', primaryModel!, inputTokens, outputTokens, cost);

        console.log('Received response from model', { modelName: primaryModel, cost });
        return mockResponse;
    }

    private async mockAIResponse(prompt: string, model: string): Promise<string> {
        // This is a mock implementation. In a real scenario, you'd integrate with actual AI services
        // For now, we'll return a simple response based on the prompt content

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
        // This would return provider-specific configuration
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
            google: 'https://generativelanguage.googleapis.com'
        };
        return baseUrls[provider] || '';
    }

    public getProviders(): string[] {
        return Object.keys(this.config.api_keys || {});
    }

    public async validateModel(modelName: string): Promise<boolean> {
        // Mock validation - in real implementation, you'd test the model
        const modelInfo = this.modelsMap[modelName];
        return !!modelInfo;
    }

    public getFreeModels(): Array<{ name: string; provider: string; config: any }> {
        const freeModels: Array<{ name: string; provider: string; config: any }> = [];

        for (const [modelName, modelConfig] of Object.entries(this.modelsMap)) {
            // Check if any provider has this model marked as free
            for (const [provider, providerConfig] of Object.entries(modelConfig as any)) {
                if ((providerConfig as any).isFree) {
                    freeModels.push({
                        name: modelName,
                        provider,
                        config: providerConfig
                    });
                }
            }
        }

        return freeModels;
    }

    public getModelStats(): { [provider: string]: { totalModels: number; freeModels: number } } {
        const stats: { [provider: string]: { totalModels: number; freeModels: number } } = {};

        for (const [modelName, modelConfig] of Object.entries(this.modelsMap)) {
            for (const [provider, providerConfig] of Object.entries(modelConfig as any)) {
                if (!stats[provider]) {
                    stats[provider] = { totalModels: 0, freeModels: 0 };
                }
                stats[provider].totalModels++;
                if ((providerConfig as any).isFree) {
                    stats[provider].freeModels++;
                }
            }
        }

        return stats;
    }
}
