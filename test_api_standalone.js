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
const https = __importStar(require("https"));
const http = __importStar(require("http"));
class MockUsageTracker {
    constructor() {
        this.usageData = {};
    }
    recordUsage(provider, model, inputTokens, outputTokens, cost) {
        if (!this.usageData[provider]) {
            this.usageData[provider] = {};
        }
        if (!this.usageData[provider][model]) {
            this.usageData[provider][model] = {
                total_input_tokens: 0,
                total_output_tokens: 0,
                total_cost: 0,
                requests: []
            };
        }
        const modelData = this.usageData[provider][model];
        modelData.total_input_tokens += inputTokens;
        modelData.total_output_tokens += outputTokens;
        modelData.total_cost += cost;
        modelData.requests.push({
            timestamp: new Date().toISOString(),
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cost: cost
        });
        console.log(`Recorded usage: ${provider}/${model} - Input: ${inputTokens}, Output: ${outputTokens}, Cost: $${cost.toFixed(6)}`);
    }
    getTotalCost() {
        let totalCost = 0;
        for (const provider of Object.values(this.usageData)) {
            for (const model of Object.values(provider)) {
                totalCost += model.total_cost;
            }
        }
        return totalCost;
    }
}
class TestModelManager {
    constructor(config, usageTracker) {
        this.config = config;
        this.usageTracker = usageTracker;
        // Set API keys as environment variables
        const apiKeys = this.config.api_keys || {};
        for (const [provider, key] of Object.entries(apiKeys)) {
            if (typeof key === 'string') {
                process.env[`${provider.toUpperCase()}_API_KEY`] = key;
                console.log(`Set API key for ${provider}`);
            }
        }
    }
    async makeHttpRequest(url, options) {
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
                    }
                    else {
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
    async callOpenRouter(model, prompt) {
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
        const data = JSON.parse(response);
        return {
            content: data.choices[0]?.message?.content || '',
            usage: data.usage,
            model: data.model || model
        };
    }
    async callHuggingFace(model, prompt) {
        const apiKey = process.env['HUGGINGFACE_API_KEY'];
        if (!apiKey) {
            throw new Error('HuggingFace API key not found');
        }
        // Parse HuggingFace model format: "model_name:provider"
        const [modelName] = model.split(':');
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
        }
        else if (data.generated_text) {
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
    async callGeminiDirect(model, prompt) {
        const apiKey = process.env['GEMINI_API_KEY'];
        if (!apiKey) {
            throw new Error('Gemini API key not found');
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
            model: model
        };
    }
    parseModelName(modelName) {
        if (modelName.includes('/')) {
            const parts = modelName.split('/');
            if (parts.length >= 2 && parts[0]) {
                return [parts[0], parts.slice(1).join('/')];
            }
        }
        return ['openai', modelName]; // Default to OpenAI
    }
    calculateCost(modelName, inputTokens, outputTokens) {
        // Simplified cost calculation - in production, you'd use actual pricing
        const [provider] = this.parseModelName(modelName);
        const rates = {
            'openrouter': { input: 0.000001, output: 0.000002 },
            'huggingface': { input: 0.0000005, output: 0.000001 },
            'openai': { input: 0.0000015, output: 0.000002 },
            'anthropic': { input: 0.000003, output: 0.000015 },
            'gemini': { input: 0.00000025, output: 0.000001 } // Gemini pricing (very low)
        };
        const rate = rates[provider] || { input: 0.000001, output: 0.000002 };
        return (inputTokens * rate.input) + (outputTokens * rate.output);
    }
    async sendRequest(prompt, friendlyModelNames) {
        if (!friendlyModelNames.length) {
            console.error('No models provided to sendRequest');
            return 'Error: No models provided.';
        }
        const litellmModelNames = [];
        for (const friendlyName of friendlyModelNames) {
            const modelInfo = this.config.models[friendlyName];
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
        console.log('--- Request ---');
        console.log(prompt);
        console.log('---------------');
        try {
            const response = await this.callAIProvider(primaryModel, prompt);
            console.log('--- Response ---');
            console.log(response.content);
            console.log('----------------');
            // Track usage
            this.usageTracker.recordUsage(this.getProviderFromModel(primaryModel), this.getFriendlyNameFromModel(primaryModel), response.usage.prompt_tokens, response.usage.completion_tokens, this.calculateCost(primaryModel, response.usage.prompt_tokens, response.usage.completion_tokens));
            console.log('Received response from model', {
                modelName: this.getFriendlyNameFromModel(primaryModel),
                cost: this.calculateCost(primaryModel, response.usage.prompt_tokens, response.usage.completion_tokens)
            });
            return response.content;
        }
        catch (primaryError) {
            console.warn(`Primary model ${primaryModel} failed, trying fallbacks...`, primaryError);
            // Try fallback models
            for (const fallbackModel of fallbackModels) {
                try {
                    console.log(`Trying fallback model: ${fallbackModel}`);
                    const response = await this.callAIProvider(fallbackModel, prompt);
                    console.log('--- Fallback Response ---');
                    console.log(response.content);
                    console.log('----------------');
                    // Track usage for fallback
                    this.usageTracker.recordUsage(this.getProviderFromModel(fallbackModel), this.getFriendlyNameFromModel(fallbackModel), response.usage.prompt_tokens, response.usage.completion_tokens, this.calculateCost(fallbackModel, response.usage.prompt_tokens, response.usage.completion_tokens));
                    console.log('Received response from fallback model', {
                        modelName: this.getFriendlyNameFromModel(fallbackModel),
                        cost: this.calculateCost(fallbackModel, response.usage.prompt_tokens, response.usage.completion_tokens)
                    });
                    return response.content;
                }
                catch (fallbackError) {
                    console.warn(`Fallback model ${fallbackModel} also failed`, fallbackError);
                    continue;
                }
            }
            // All models failed
            console.error('All models failed, returning error message');
            return `Error: All AI models failed. Primary error: ${primaryError instanceof Error ? primaryError.message : 'Unknown error'}`;
        }
    }
    async callAIProvider(modelName, prompt) {
        const [provider, model] = this.parseModelName(modelName);
        switch (provider) {
            case 'openrouter':
                return await this.callOpenRouter(model, prompt);
            case 'huggingface':
                return await this.callHuggingFace(model, prompt);
            case 'gemini':
                return await this.callGeminiDirect(model, prompt);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }
    getProviderFromModel(modelName) {
        const [provider] = this.parseModelName(modelName);
        return provider;
    }
    getFriendlyNameFromModel(modelName) {
        for (const [friendlyName, modelInfo] of Object.entries(this.config.models)) {
            if (modelInfo.litellmModelName === modelName) {
                return friendlyName;
            }
        }
        return modelName;
    }
}
// Test configuration using models defined in package.json
// Models include: or-gemini-flash, or-deepseek-0528, or-qwen-coder, hf-deepseek, hf-qwen-coder
// NOTE: For real testing, create config.local.json with your actual API keys
// Try to load local config if it exists
let localConfig = null;
try {
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, 'config.local.json');
    if (fs.existsSync(configPath)) {
        localConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('✅ Loaded local config from config.local.json');
    }
}
catch (error) {
    console.log('⚠️  Could not load config.local.json, using default test config');
}
const testConfig = localConfig || {
    api_keys: {
        openrouter: process.env.OPENROUTER_API_KEY || 'sk-or-v1-test-key',
        huggingface: process.env.HUGGINGFACE_API_KEY || 'hf_test_key',
        gemini: process.env.GEMINI_API_KEY || 'gemini_test_key', // Replace with real key or use config.local.json
    },
    models: {
        'or-gemini-flash': {
            litellmModelName: 'openrouter/google/gemini-2.0-flash-exp:free',
            isFree: true,
            contextWindow: 1048576,
            description: 'Google Gemini 2.0 Flash Experimental - Fast and efficient'
        },
        'or-deepseek-0528': {
            litellmModelName: 'openrouter/deepseek/deepseek-r1-0528:free',
            isFree: true,
            contextWindow: 32768,
            description: 'DeepSeek R1 - Advanced reasoning model'
        },
        'or-qwen-coder': {
            litellmModelName: 'openrouter/qwen/qwen3-coder:free',
            isFree: true,
            contextWindow: 32768,
            description: 'Qwen3 Coder - Specialized for code generation'
        },
        'hf-deepseek': {
            litellmModelName: 'huggingface/deepseek-ai/DeepSeek-V3:fireworks-ai',
            isFree: true,
            contextWindow: 32768,
            description: 'DeepSeek V3 - Advanced reasoning via Fireworks AI'
        },
        'hf-qwen-coder': {
            litellmModelName: 'huggingface/Qwen/Qwen2.5-Coder-32B-Instruct:fireworks-ai',
            isFree: true,
            contextWindow: 32768,
            description: 'Qwen2.5 Coder 32B - Code generation specialist'
        },
        'gemini-flash-direct': {
            litellmModelName: 'gemini/gemini-2.0-flash-exp',
            isFree: false,
            contextWindow: 1048576,
            description: 'Direct Google Gemini 2.0 Flash - Maximum performance'
        }
    }
};
async function testAPIConnections() {
    console.log('Testing API connections...\n');
    const usageTracker = new MockUsageTracker();
    const modelManager = new TestModelManager(testConfig, usageTracker);
    // Test 1: OpenRouter free model
    console.log('=== Test 1: OpenRouter Free Model (Gemini Flash) ===');
    try {
        const response1 = await modelManager.sendRequest('Hello, can you tell me a short joke?', ['or-gemini-flash']);
        console.log('✅ OpenRouter Response:', response1.substring(0, 100) + '...');
    }
    catch (error) {
        console.log('❌ OpenRouter Error:', error instanceof Error ? error.message : String(error));
    }
    // Test 2: Direct Gemini API
    console.log('\n=== Test 2: Direct Gemini API ===');
    try {
        const response2 = await modelManager.sendRequest('What is the capital of France?', ['gemini-flash-direct']);
        console.log('✅ Direct Gemini Response:', response2.substring(0, 100) + '...');
    }
    catch (error) {
        console.log('❌ Direct Gemini Error:', error instanceof Error ? error.message : String(error));
    }
    // Test 3: HuggingFace model
    console.log('\n=== Test 3: HuggingFace Model (DeepSeek) ===');
    try {
        const response3 = await modelManager.sendRequest('Explain quantum computing in simple terms.', ['hf-deepseek']);
        console.log('✅ HuggingFace Response:', response3.substring(0, 100) + '...');
    }
    catch (error) {
        console.log('❌ HuggingFace Error:', error instanceof Error ? error.message : String(error));
    }
    // Test 4: Fallback mechanism
    console.log('\n=== Test 4: Fallback Mechanism ===');
    try {
        const response4 = await modelManager.sendRequest('Write a simple Python function to calculate fibonacci numbers.', ['or-deepseek-0528', 'or-gemini-flash', 'hf-qwen-coder']);
        console.log('✅ Fallback Response:', response4.substring(0, 200) + '...');
    }
    catch (error) {
        console.log('❌ Fallback Error:', error instanceof Error ? error.message : String(error));
    }
    // Test 5: Code generation models
    console.log('\n=== Test 5: Code Generation Models ===');
    try {
        const response5 = await modelManager.sendRequest('Create a React component for a todo list.', ['or-qwen-coder', 'featherless-gemma']);
        console.log('✅ Code Generation Response:', response5.substring(0, 200) + '...');
    }
    catch (error) {
        console.log('❌ Code Generation Error:', error instanceof Error ? error.message : String(error));
    }
    // Test 6: Usage tracking
    console.log('\n=== Test 6: Usage Tracking ===');
    const totalCost = usageTracker.getTotalCost();
    console.log('Total API Cost:', totalCost);
    console.log('\n=== Test Complete ===');
}
// Run the test
testAPIConnections().catch(console.error);
//# sourceMappingURL=test_api_standalone.js.map