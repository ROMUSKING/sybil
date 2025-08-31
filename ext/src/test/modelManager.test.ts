import { strict as assert } from 'assert';
import { ModelManager } from '../../src/modelManager';
import * as vscode from 'vscode';

// Mock VS Code API
const mockContext = {
    globalState: {
        get: (key: string) => undefined,
        update: (key: string, value: any) => Promise.resolve()
    }
} as any;

suite('ModelManager Configuration Tests', () => {
    let modelManager: ModelManager;

    suiteSetup(() => {
        // Mock vscode.workspace.getConfiguration
        (global as any).vscode = {
            workspace: {
                getConfiguration: (section: string) => ({
                    get: (key: string, defaultValue?: any) => {
                        if (section === 'sybil' && key === 'models') {
                            return {
                                openrouter: {
                                    'or-gemini-flash': {
                                        litellmModelName: 'openrouter/google/gemini-2.0-flash-exp:free',
                                        isFree: true,
                                        contextWindow: 1048576,
                                        description: 'Test Gemini Flash'
                                    }
                                },
                                huggingface: {
                                    'hf-deepseek': {
                                        litellmModelName: 'huggingface/deepseek-ai/DeepSeek-V3:fireworks-ai',
                                        isFree: true,
                                        contextWindow: 32768,
                                        description: 'Test DeepSeek'
                                    }
                                }
                            };
                        }
                        if (section === 'sybil' && key === 'agentPrompts') {
                            return {
                                architect: {
                                    systemPrompt: 'Test architect system prompt',
                                    taskPrompt: 'Test architect task prompt'
                                },
                                developer: {
                                    systemPrompt: 'Test developer system prompt',
                                    taskPrompt: 'Test developer task prompt'
                                }
                            };
                        }
                        return defaultValue;
                    },
                    update: (key: string, value: any) => Promise.resolve()
                })
            }
        };

        modelManager = new ModelManager(mockContext);
    });

    test('Should load models from configuration', () => {
        const allModels = modelManager.getAllModels();
        assert(allModels.length > 0, 'Should have loaded models from configuration');

        const geminiModel = allModels.find((m: any) => m.name === 'or-gemini-flash');
        assert(geminiModel, 'Should find configured Gemini model');
        assert.strictEqual(geminiModel!.litellmModelName, 'openrouter/google/gemini-2.0-flash-exp:free');
        assert.strictEqual(geminiModel!.description, 'Test Gemini Flash');
    });

    test('Should load agent prompts from configuration', () => {
        const architectPrompt = modelManager.getAgentPrompt('architect');
        assert(architectPrompt, 'Should have architect prompt');
        assert.strictEqual(architectPrompt.systemPrompt, 'Test architect system prompt');
        assert.strictEqual(architectPrompt.taskPrompt, 'Test architect task prompt');

        const developerPrompt = modelManager.getAgentPrompt('developer');
        assert(developerPrompt, 'Should have developer prompt');
        assert.strictEqual(developerPrompt.systemPrompt, 'Test developer system prompt');
    });

    test('Should fallback to default prompts when not configured', () => {
        const reviewerPrompt = modelManager.getAgentPrompt('reviewer');
        assert(reviewerPrompt, 'Should have default reviewer prompt');
        assert(reviewerPrompt.systemPrompt.includes('Code Reviewer'), 'Should contain default reviewer content');
    });

    test('Should get litellm model name from configuration', () => {
        const litellmName = modelManager.getLitellmModelName('or-gemini-flash');
        assert.strictEqual(litellmName, 'openrouter/google/gemini-2.0-flash-exp:free');
    });

    test('Should get model statistics', () => {
        const stats = modelManager.getModelStatistics();
        assert(stats.total > 0, 'Should have total models');
        assert(stats.free > 0, 'Should have free models');
        assert(stats.byProvider, 'Should have provider breakdown');
    });
});
