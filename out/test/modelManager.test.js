"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const mocha_1 = require("mocha");
const modelManager_1 = require("../../src/modelManager");
// Mock VS Code API
const mockContext = {
    globalState: {
        get: (key) => undefined,
        update: (key, value) => Promise.resolve()
    }
};
(0, mocha_1.suite)('ModelManager Configuration Tests', () => {
    let modelManager;
    (0, mocha_1.suiteSetup)(() => {
        // Mock vscode.workspace.getConfiguration
        global.vscode = {
            workspace: {
                getConfiguration: (section) => ({
                    get: (key, defaultValue) => {
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
                    update: (key, value) => Promise.resolve()
                })
            }
        };
        modelManager = new modelManager_1.ModelManager(mockContext);
    });
    (0, mocha_1.test)('Should load models from configuration', () => {
        const allModels = modelManager.getAllModels();
        (0, assert_1.strict)(allModels.length > 0, 'Should have loaded models from configuration');
        const geminiModel = allModels.find((m) => m.name === 'or-gemini-flash');
        (0, assert_1.strict)(geminiModel, 'Should find configured Gemini model');
        assert_1.strict.strictEqual(geminiModel.litellmModelName, 'openrouter/google/gemini-2.0-flash-exp:free');
        assert_1.strict.strictEqual(geminiModel.description, 'Test Gemini Flash');
    });
    (0, mocha_1.test)('Should load agent prompts from configuration', () => {
        const architectPrompt = modelManager.getAgentPrompt('architect');
        (0, assert_1.strict)(architectPrompt, 'Should have architect prompt');
        assert_1.strict.strictEqual(architectPrompt.systemPrompt, 'Test architect system prompt');
        assert_1.strict.strictEqual(architectPrompt.taskPrompt, 'Test architect task prompt');
        const developerPrompt = modelManager.getAgentPrompt('developer');
        (0, assert_1.strict)(developerPrompt, 'Should have developer prompt');
        assert_1.strict.strictEqual(developerPrompt.systemPrompt, 'Test developer system prompt');
    });
    (0, mocha_1.test)('Should fallback to default prompts when not configured', () => {
        const reviewerPrompt = modelManager.getAgentPrompt('reviewer');
        (0, assert_1.strict)(reviewerPrompt, 'Should have default reviewer prompt');
        (0, assert_1.strict)(reviewerPrompt.systemPrompt.includes('Code Reviewer'), 'Should contain default reviewer content');
    });
    (0, mocha_1.test)('Should get litellm model name from configuration', () => {
        const litellmName = modelManager.getLitellmModelName('or-gemini-flash');
        assert_1.strict.strictEqual(litellmName, 'openrouter/google/gemini-2.0-flash-exp:free');
    });
    (0, mocha_1.test)('Should get model statistics', () => {
        const stats = modelManager.getModelStatistics();
        (0, assert_1.strict)(stats.total > 0, 'Should have total models');
        (0, assert_1.strict)(stats.free > 0, 'Should have free models');
        (0, assert_1.strict)(stats.byProvider, 'Should have provider breakdown');
    });
});
//# sourceMappingURL=modelManager.test.js.map