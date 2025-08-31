import { ModelManager } from './model_manager';
import { UsageTracker } from './usage_tracker';

// Test configuration using models defined in package.json
// Models include: or-gemini-flash, or-deepseek-0528, or-qwen-coder, hf-deepseek, hf-qwen-coder
const testConfig = {
    api_keys: {
        openrouter: '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', // Replace with real key
        huggingface: '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', // Replace with real key
        openai: 'sk-test-key', // Replace with real key
        anthropic: 'sk-ant-test-key' // Replace with real key
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
        }
    }
};

async function testModelManager() {
    console.log('Testing ModelManager API connections...\n');

    const usageTracker = new UsageTracker();
    const modelManager = new ModelManager(testConfig, usageTracker, true);

    // Test 1: OpenRouter free model
    console.log('=== Test 1: OpenRouter Free Model (Gemini Flash) ===');
    try {
        const response1 = await modelManager.sendRequest(
            'Hello, can you tell me a short joke?',
            ['or-gemini-flash']
        );
        console.log('✅ OpenRouter Response:', response1.substring(0, 100) + '...');
    } catch (error) {
        console.log('❌ OpenRouter Error:', error instanceof Error ? error.message : String(error));
    }

    // Test 2: HuggingFace model
    console.log('\n=== Test 2: HuggingFace Model (DeepSeek) ===');
    try {
        const response2 = await modelManager.sendRequest(
            'What is the capital of France?',
            ['hf-deepseek']
        );
        console.log('✅ HuggingFace Response:', response2.substring(0, 100) + '...');
    } catch (error) {
        console.log('❌ HuggingFace Error:', error instanceof Error ? error.message : String(error));
    }

    // Test 3: Fallback mechanism
    console.log('\n=== Test 3: Fallback Mechanism ===');
    try {
        const response3 = await modelManager.sendRequest(
            'Explain quantum computing in simple terms.',
            ['or-deepseek-0528', 'or-gemini-flash'] // Will try DeepSeek first, fallback to Gemini
        );
        console.log('✅ Fallback Response:', response3.substring(0, 100) + '...');
    } catch (error) {
        console.log('❌ Fallback Error:', error instanceof Error ? error.message : String(error));
    }

    // Test 4: Code generation model
    console.log('\n=== Test 4: Code Generation Model ===');
    try {
        const response4 = await modelManager.sendRequest(
            'Write a simple Python function to calculate fibonacci numbers.',
            ['or-qwen-coder']
        );
        console.log('✅ Code Generation Response:', response4.substring(0, 200) + '...');
    } catch (error) {
        console.log('❌ Code Generation Error:', error instanceof Error ? error.message : String(error));
    }

    // Test 5: Usage tracking
    console.log('\n=== Test 5: Usage Tracking ===');
    const totalCost = usageTracker.getTotalCost();
    console.log('Total API Cost:', totalCost);

    const openRouterUsage = usageTracker.getUsage('openrouter');
    console.log('OpenRouter Usage:', JSON.stringify(openRouterUsage, null, 2));

    const huggingFaceUsage = usageTracker.getUsage('huggingface');
    console.log('HuggingFace Usage:', JSON.stringify(huggingFaceUsage, null, 2));

    console.log('\n=== Test Complete ===');
}

// Run the test
testModelManager().catch(console.error);
