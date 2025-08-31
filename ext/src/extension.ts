import * as vscode from 'vscode';
import { SybilAgent } from './sybilAgent';
import { SessionManager } from './sessionManager';
import { AnalyticsProvider } from './analyticsProvider';
import { FileManager } from './fileManager';
import { TerminalManager } from './terminalManager';
import { DebugManager } from './debugManager';
import { ModelManager } from './modelManager';

let sybilAgent: SybilAgent;
let sessionManager: SessionManager;
let analyticsProvider: AnalyticsProvider;
let fileManager: FileManager;
let terminalManager: TerminalManager;
let debugManager: DebugManager;
let modelManager: ModelManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('Sybil AI Coding Agent is now active!');

    // Initialize components
    sessionManager = new SessionManager(context);
    analyticsProvider = new AnalyticsProvider(context);
    fileManager = new FileManager(context);
    terminalManager = new TerminalManager(context);
    debugManager = new DebugManager(context);
    modelManager = new ModelManager(context);
    sybilAgent = new SybilAgent(context, sessionManager, analyticsProvider, fileManager, terminalManager, debugManager, modelManager);

    // Helper function to configure API keys
    async function configureProviderApiKey(providerName: string): Promise<void> {
        const currentKey = modelManager.getApiKey(providerName);
        const providerConfig = modelManager.getProviderConfig(providerName);

        const apiKey = await vscode.window.showInputBox({
            prompt: `Enter API key for ${providerConfig?.name || providerName}`,
            placeHolder: currentKey ? 'Current key is set' : 'Enter your API key',
            password: true,
            value: currentKey || ''
        });

        if (apiKey !== undefined) {
            if (apiKey.trim().length === 0) {
                // Remove the API key
                await modelManager.setApiKey(providerName, '');
                vscode.window.showInformationMessage(`API key for ${providerName} has been removed`);
            } else {
                // Set the API key
                await modelManager.setApiKey(providerName, apiKey.trim());
                vscode.window.showInformationMessage(`API key for ${providerName} has been configured`);
            }
        }
    }

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('sybil.startTask', async () => {
            const task = await vscode.window.showInputBox({
                prompt: 'Enter the task description',
                placeHolder: 'e.g., Create a React component for user authentication'
            });

            if (task) {
                await sybilAgent.startTask(task);
            }
        }),

        vscode.commands.registerCommand('sybil.resumeSession', async () => {
            const sessionId = await vscode.window.showQuickPick(
                sessionManager.getAvailableSessions(),
                { placeHolder: 'Select session to resume' }
            );

            if (sessionId) {
                await sybilAgent.resumeSession(sessionId);
            }
        }),

        vscode.commands.registerCommand('sybil.clearSession', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'Are you sure you want to clear the current session?',
                'Yes', 'No'
            );

            if (confirm === 'Yes') {
                await sessionManager.clearCurrentSession();
                vscode.window.showInformationMessage('Session cleared successfully');
            }
        }),

        vscode.commands.registerCommand('sybil.showAnalytics', () => {
            analyticsProvider.showAnalytics();
        }),

        vscode.commands.registerCommand('sybil.configureModels', async () => {
            const providers = modelManager.getProviders();
            const selectedProvider = await vscode.window.showQuickPick(providers, {
                placeHolder: 'Select a provider to configure'
            });

            if (selectedProvider) {
                await configureProviderApiKey(selectedProvider);
            }
        }),

        vscode.commands.registerCommand('sybil.showModelStats', () => {
            const stats = modelManager.getModelStats();
            const statsMessage = Object.entries(stats)
                .map(([provider, data]) => {
                    const statsData = data as { totalModels: number; freeModels: number };
                    return `${provider}: ${statsData.freeModels}/${statsData.totalModels} free models`;
                })
                .join('\n');

            vscode.window.showInformationMessage(`Model Statistics:\n${statsMessage}`);
        }),

        vscode.commands.registerCommand('sybil.validateModels', async () => {
            const freeModels = modelManager.getFreeModels();
            const validModels: string[] = [];
            const invalidModels: string[] = [];

            for (const model of freeModels) {
                const isValid = await modelManager.validateModel(model.name);
                if (isValid) {
                    validModels.push(model.name);
                } else {
                    invalidModels.push(model.name);
                }
            }

            let message = `Validated ${freeModels.length} free models:\n`;
            message += `✅ Valid: ${validModels.length}\n`;
            message += `❌ Invalid: ${invalidModels.length}`;

            if (invalidModels.length > 0) {
                message += `\n\nInvalid models (missing API keys):\n${invalidModels.join(', ')}`;
            }

            vscode.window.showInformationMessage(message);
        })
    );

    // Register tree data provider for sessions view
    vscode.window.registerTreeDataProvider('sybilSessions', sessionManager);

    // Register configuration change listener
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('sybil')) {
                sybilAgent.updateConfiguration();
            }
        })
    );
}

export function deactivate() {
    if (sybilAgent) {
        sybilAgent.dispose();
    }
}
