"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelManager = void 0;
const vscode = __importStar(require("vscode"));
class ModelManager {
    constructor(context) {
        this.providers = new Map();
        this.agentPrompts = new Map();
        this.context = context;
        this.initializeProviders();
        this.loadAgentPrompts();
    }
    initializeProviders() {
        // Load models from configuration instead of hardcoded values
        const config = vscode.workspace.getConfiguration('sybil');
        const modelsConfig = config.get('models', {});
        // OpenRouter configuration
        const openRouterModels = [];
        if (modelsConfig.openrouter) {
            for (const [modelName, modelConfig] of Object.entries(modelsConfig.openrouter)) {
                openRouterModels.push({
                    name: modelName,
                    provider: 'openrouter',
                    model: modelName,
                    litellmModelName: modelConfig.litellmModelName || `openrouter/${modelName}`,
                    isFree: modelConfig.isFree !== false,
                    contextWindow: modelConfig.contextWindow || 32768,
                    description: modelConfig.description || `${modelName} model`
                });
            }
        }
        // HuggingFace configuration
        const huggingFaceModels = [];
        if (modelsConfig.huggingface) {
            for (const [modelName, modelConfig] of Object.entries(modelsConfig.huggingface)) {
                huggingFaceModels.push({
                    name: modelName,
                    provider: 'huggingface',
                    model: modelName,
                    litellmModelName: modelConfig.litellmModelName || `huggingface/${modelName}`,
                    isFree: modelConfig.isFree !== false,
                    contextWindow: modelConfig.contextWindow || 32768,
                    description: modelConfig.description || `${modelName} model`
                });
            }
        }
        // Set up providers with loaded models
        if (openRouterModels.length > 0) {
            this.providers.set('openrouter', {
                name: 'OpenRouter',
                baseUrl: 'https://openrouter.ai/api/v1',
                apiKeyRequired: true,
                models: openRouterModels
            });
        }
        if (huggingFaceModels.length > 0) {
            this.providers.set('huggingface', {
                name: 'HuggingFace',
                baseUrl: 'https://api-inference.huggingface.co',
                apiKeyRequired: true,
                models: huggingFaceModels
            });
        }
        // Fallback to default models if no configuration is found
        if (this.providers.size === 0) {
            this.loadDefaultModels();
        }
    }
    loadDefaultModels() {
        // OpenRouter Free Models (fallback defaults)
        const openRouterConfig = {
            name: 'OpenRouter',
            baseUrl: 'https://openrouter.ai/api/v1',
            apiKeyRequired: true,
            models: [
                {
                    name: 'or-gemini-flash',
                    provider: 'openrouter',
                    model: 'google/gemini-2.0-flash-exp:free',
                    litellmModelName: 'openrouter/google/gemini-2.0-flash-exp:free',
                    isFree: true,
                    contextWindow: 1048576,
                    description: 'Google Gemini 2.0 Flash Experimental - Fast and efficient'
                },
                {
                    name: 'or-deepseek-0528',
                    provider: 'openrouter',
                    model: 'deepseek/deepseek-r1-0528:free',
                    litellmModelName: 'openrouter/deepseek/deepseek-r1-0528:free',
                    isFree: true,
                    contextWindow: 32768,
                    description: 'DeepSeek R1 - Advanced reasoning model'
                },
                {
                    name: 'or-qwen-coder',
                    provider: 'openrouter',
                    model: 'qwen/qwen3-coder:free',
                    litellmModelName: 'openrouter/qwen/qwen3-coder:free',
                    isFree: true,
                    contextWindow: 32768,
                    description: 'Qwen3 Coder - Specialized for code generation'
                }
            ]
        };
        // HuggingFace Models (fallback defaults)
        const huggingFaceConfig = {
            name: 'HuggingFace',
            baseUrl: 'https://api-inference.huggingface.co',
            apiKeyRequired: true,
            models: [
                {
                    name: 'hf-deepseek',
                    provider: 'huggingface',
                    model: 'deepseek-ai/DeepSeek-V3',
                    litellmModelName: 'huggingface/deepseek-ai/DeepSeek-V3:fireworks-ai',
                    isFree: true,
                    contextWindow: 32768,
                    description: 'DeepSeek V3 - Advanced reasoning via Fireworks AI'
                },
                {
                    name: 'hf-qwen-coder',
                    provider: 'huggingface',
                    model: 'Qwen/Qwen2.5-Coder-32B-Instruct',
                    litellmModelName: 'huggingface/Qwen/Qwen2.5-Coder-32B-Instruct:fireworks-ai',
                    isFree: true,
                    contextWindow: 32768,
                    description: 'Qwen2.5 Coder 32B - Code generation specialist'
                }
            ]
        };
        this.providers.set('openrouter', openRouterConfig);
        this.providers.set('huggingface', huggingFaceConfig);
    }
    loadAgentPrompts() {
        const config = vscode.workspace.getConfiguration('sybil');
        const promptsConfig = config.get('agentPrompts', {});
        // Load configured prompts or use defaults
        const defaultPrompts = {
            architect: {
                systemPrompt: "You are a Software Architect. Your role is to take a high-level user request and create a detailed, hierarchical technical blueprint.\n\nYour final output must be a single XML block enclosed in `<blueprint>` tags.\nThe blueprint can contain nested `<module>` elements to represent the project structure.\nEach module can specify its dependencies on other modules.\nEach module must contain a list of `<task>` elements.",
                taskPrompt: "Create a detailed technical blueprint for the following task:"
            },
            developer: {
                systemPrompt: "You are a Software Developer. Your role is to implement code based on the blueprint and task specifications provided.\n\nYou should:\n1. Write clean, well-documented code\n2. Follow best practices for the programming language\n3. Handle error cases appropriately\n4. Create modular, reusable components\n5. Include necessary imports and dependencies",
                taskPrompt: "Implement the following task based on the blueprint:"
            },
            reviewer: {
                systemPrompt: "You are a Code Reviewer. Your role is to analyze code quality, identify potential issues, and ensure best practices are followed.\n\nYou should check for:\n1. Code correctness and logic errors\n2. Security vulnerabilities\n3. Performance issues\n4. Code style and consistency\n5. Documentation quality\n6. Test coverage considerations",
                taskPrompt: "Review the following code implementation:"
            },
            documenter: {
                systemPrompt: "You are a Technical Documentation Specialist. Your role is to create comprehensive documentation for the implemented features.\n\nYou should:\n1. Write clear, concise documentation\n2. Include code examples and usage instructions\n3. Document API endpoints, functions, and classes\n4. Provide setup and configuration instructions\n5. Create user-friendly guides and tutorials",
                taskPrompt: "Create documentation for the following implementation:"
            }
        };
        for (const [agentType, defaultPrompt] of Object.entries(defaultPrompts)) {
            const configuredPrompt = promptsConfig[agentType];
            this.agentPrompts.set(agentType, configuredPrompt || defaultPrompt);
        }
    }
    /**
     * Get all available providers
     */
    getProviders() {
        return Array.from(this.providers.keys());
    }
    /**
     * Get provider configuration
     */
    getProviderConfig(providerName) {
        return this.providers.get(providerName);
    }
    /**
     * Get all free models across all providers
     */
    getFreeModels() {
        const freeModels = [];
        for (const provider of this.providers.values()) {
            freeModels.push(...provider.models.filter(model => model.isFree));
        }
        return freeModels;
    }
    /**
     * Get models for a specific provider
     */
    getModelsForProvider(providerName) {
        const provider = this.providers.get(providerName);
        return provider ? provider.models : [];
    }
    /**
     * Get model by name
     */
    getModelByName(modelName) {
        for (const provider of this.providers.values()) {
            const model = provider.models.find(m => m.name === modelName);
            if (model)
                return model;
        }
        return undefined;
    }
    /**
     * Get recommended models for each agent type
     */
    getRecommendedModels() {
        const architectModels = this.getModelsByNames([
            'or-gemini-flash',
            'hf-deepseek',
            'or-deepseek-0528',
            'or-llama3.3-instruct'
        ]);
        const developerModels = this.getModelsByNames([
            'or-qwen-coder',
            'hf-qwen-coder',
            'hf-deepseek',
            'featherless-gemma',
            'hyperbolic-qwen',
            'or-gemini-flash'
        ]);
        const reviewerModels = this.getModelsByNames([
            'hf-deepseek',
            'cohere-command-a',
            'or-deepseek-chimera',
            'or-mistral-small-3.2'
        ]);
        const documenterModels = this.getModelsByNames([
            'hf-deepseek',
            'or-gemini-flash',
            'or-llama3.3-instruct',
            'or-glm4.5-air'
        ]);
        return {
            architect: architectModels,
            developer: developerModels,
            reviewer: reviewerModels,
            documenter: documenterModels
        };
    }
    /**
     * Get models by their names
     */
    getModelsByNames(names) {
        return names.map(name => this.getModelByName(name)).filter((model) => model !== undefined);
    }
    /**
     * Get API key for a provider (maps provider names correctly)
     */
    getApiKey(providerName) {
        const config = vscode.workspace.getConfiguration('sybil');
        const apiKeys = config.get('apiKeys', {});
        // Map provider names to API key names
        const keyMapping = {
            'openrouter': 'openrouter',
            'huggingface': 'huggingface',
            'cohere': 'cohere'
        };
        const apiKeyName = keyMapping[providerName] || providerName;
        return apiKeys[apiKeyName];
    }
    /**
     * Set API key for a provider
     */
    async setApiKey(providerName, apiKey) {
        const config = vscode.workspace.getConfiguration('sybil');
        const apiKeys = config.get('apiKeys', {});
        // Map provider names to API key names
        const keyMapping = {
            'openrouter': 'openrouter',
            'huggingface': 'huggingface',
            'cohere': 'cohere'
        };
        const apiKeyName = keyMapping[providerName] || providerName;
        apiKeys[apiKeyName] = apiKey;
        await config.update('apiKeys', apiKeys, vscode.ConfigurationTarget.Global);
    }
    /**
     * Check if provider has valid API key
     */
    hasValidApiKey(providerName) {
        const apiKey = this.getApiKey(providerName);
        return apiKey !== undefined && apiKey.trim().length > 0;
    }
    /**
     * Get connection string for a provider
     */
    getConnectionString(providerName) {
        const provider = this.providers.get(providerName);
        if (!provider)
            return undefined;
        const apiKey = this.getApiKey(providerName);
        if (!apiKey)
            return undefined;
        // Return the base URL for the provider
        return provider.baseUrl;
    }
    /**
     * Setup environment variables for a provider (matching Python implementation)
     */
    setupEnvironment(providerName) {
        const apiKey = this.getApiKey(providerName);
        if (!apiKey)
            return false;
        // Set environment variables matching Python implementation
        if (providerName === 'openrouter') {
            process.env['OPENROUTER_API_KEY'] = apiKey;
            process.env['OPENROUTER_API_BASE'] = 'https://openrouter.ai/api/v1';
        }
        else if (providerName === 'huggingface') {
            process.env['HUGGINGFACE_API_KEY'] = apiKey;
        }
        else if (providerName === 'cohere') {
            process.env['COHERE_API_KEY'] = apiKey;
        }
        return true;
    }
    /**
     * Get model usage statistics
     */
    getModelStats() {
        const stats = {};
        for (const [providerName, provider] of this.providers) {
            const totalModels = provider.models.length;
            const freeModels = provider.models.filter(m => m.isFree).length;
            stats[providerName] = { totalModels, freeModels };
        }
        return stats;
    }
    /**
     * Validate model availability
     */
    async validateModel(modelName) {
        const model = this.getModelByName(modelName);
        if (!model)
            return false;
        const provider = this.providers.get(model.provider);
        if (!provider)
            return false;
        // Check if API key is available for providers that require it
        if (provider.apiKeyRequired && !this.hasValidApiKey(model.provider)) {
            return false;
        }
        return true;
    }
    /**
     * Get the litellm model name for a given model
     */
    getLitellmModelName(modelName) {
        const model = this.getModelByName(modelName);
        return model?.litellmModelName;
    }
    /**
     * Get all models with their full configuration
     */
    getAllModels() {
        const allModels = [];
        for (const provider of this.providers.values()) {
            allModels.push(...provider.models);
        }
        return allModels;
    }
    /**
     * Get model configuration by litellm name
     */
    getModelByLitellmName(litellmName) {
        for (const provider of this.providers.values()) {
            const model = provider.models.find(m => m.litellmModelName === litellmName);
            if (model)
                return model;
        }
        return undefined;
    }
    /**
     * Get agent prompt for a specific agent type
     */
    getAgentPrompt(agentType) {
        const prompt = this.agentPrompts.get(agentType);
        if (!prompt) {
            throw new Error(`Agent prompt not found for type ${agentType}`);
        }
        return prompt;
    }
    /**
     * Get all agent prompts
     */
    getAllAgentPrompts() {
        return new Map(this.agentPrompts);
    }
    /**
     * Update agent prompt for a specific agent type
     */
    async updateAgentPrompt(agentType, prompts) {
        this.agentPrompts.set(agentType, prompts);
        // Optionally persist to configuration
        const config = vscode.workspace.getConfiguration('sybil');
        const currentPrompts = config.get('agentPrompts', {});
        currentPrompts[agentType] = prompts;
        await config.update('agentPrompts', currentPrompts, vscode.ConfigurationTarget.Global);
    }
    /**
     * Get model statistics
     */
    getModelStatistics() {
        const allModels = this.getAllModels();
        const byProvider = {};
        let free = 0;
        for (const model of allModels) {
            byProvider[model.provider] = (byProvider[model.provider] || 0) + 1;
            if (model.isFree) {
                free++;
            }
        }
        return {
            total: allModels.length,
            byProvider,
            free
        };
    }
}
exports.ModelManager = ModelManager;
//# sourceMappingURL=modelManager.js.map