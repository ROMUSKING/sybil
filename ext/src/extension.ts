import * as vscode from 'vscode';
import { SybilAgent } from './sybilAgent';
import { SessionManager } from './sessionManager';
import { AnalyticsProvider } from './analyticsProvider';
import { FileManager } from './fileManager';
import { TerminalManager } from './terminalManager';
import { DebugManager } from './debugManager';
import { ModelManager } from './modelManager';
import { ChatProvider } from './chatProvider';

let sybilAgent: SybilAgent;
let sessionManager: SessionManager;
let analyticsProvider: AnalyticsProvider;
let fileManager: FileManager;
let terminalManager: TerminalManager;
let debugManager: DebugManager;
let modelManager: ModelManager;
let chatProvider: ChatProvider;
let statusBarItem: vscode.StatusBarItem;

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
    chatProvider = new ChatProvider(context.extensionUri, sybilAgent, modelManager);

    // Register chat provider FIRST
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatProvider.viewType, chatProvider)
    );
    console.log('Sybil: Chat provider registered with view type:', ChatProvider.viewType);

    // Register tree data provider for sessions view
    vscode.window.registerTreeDataProvider('sybilSessions', sessionManager);

    // Create status bar item for quick chat access
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'sybil.toggleChat';
    statusBarItem.text = '$(robot)';
    statusBarItem.tooltip = 'Click to toggle Sybil AI Chat (Ctrl+Shift+S)';
    statusBarItem.show();

    context.subscriptions.push(statusBarItem);

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
        }),

        vscode.commands.registerCommand('sybil.openChat', () => {
            vscode.commands.executeCommand('workbench.view.extension.sybilChatContainer');
        }),

        vscode.commands.registerCommand('sybil.toggleChat', async () => {
            // Toggle the chat view in the sidebar
            await vscode.commands.executeCommand('workbench.view.extension.sybilChatContainer');
        })
    );

    // Update status bar item when chat visibility changes
    const updateStatusBarItem = () => {
        // Check if the Sybil Chat view container is visible
        const isChatVisible = vscode.window.tabGroups.all
            .flatMap(tg => tg.tabs)
            .some(tab => (tab.input as any)?.viewType === 'sybilChat');

        if (isChatVisible) {
            statusBarItem.text = '$(robot)';
            statusBarItem.tooltip = 'Sybil AI Chat is open - Click to focus (Ctrl+Shift+S)';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.activeBackground');
        } else {
            statusBarItem.text = '$(robot)';
            statusBarItem.tooltip = 'Click to open Sybil AI Chat (Ctrl+Shift+S)';
            statusBarItem.backgroundColor = undefined;
        }
    };

    // Listen for tab changes to update status bar
    context.subscriptions.push(
        vscode.window.tabGroups.onDidChangeTabs(updateStatusBarItem)
    );

    // Initial update
    updateStatusBarItem();

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
