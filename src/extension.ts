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
    console.log('=== SYBIL EXTENSION ACTIVATION START ===');
    console.log('Sybil AI Coding Agent is now active!');
    console.log('Sybil: Extension context:', context.extension.id);
    console.log('Sybil: Extension URI:', context.extensionUri.toString());
    console.log('Sybil: Extension path:', context.extensionPath);
    console.log('Sybil: VS Code version:', vscode.version);
    console.log('Sybil: Platform:', process.platform);

    // Check if we're in development mode
    const isDev = context.extensionMode === vscode.ExtensionMode.Development;
    console.log('Sybil: Extension mode:', isDev ? 'Development' : 'Production');

    // Initialize components
    console.log('Sybil: Initializing components...');
    try {
        sessionManager = new SessionManager(context);
        console.log('Sybil: SessionManager initialized');

        analyticsProvider = new AnalyticsProvider(context);
        console.log('Sybil: AnalyticsProvider initialized');

        fileManager = new FileManager(context);
        console.log('Sybil: FileManager initialized');

        terminalManager = new TerminalManager(context);
        console.log('Sybil: TerminalManager initialized');

        debugManager = new DebugManager(context);
        console.log('Sybil: DebugManager initialized');

        modelManager = new ModelManager(context);
        console.log('Sybil: ModelManager initialized');

        sybilAgent = new SybilAgent(context, sessionManager, analyticsProvider, fileManager, terminalManager, debugManager, modelManager);
        console.log('Sybil: SybilAgent initialized');

        chatProvider = new ChatProvider(context.extensionUri, sybilAgent, modelManager);
        console.log('Sybil: ChatProvider initialized');

        console.log('Sybil: All components initialized successfully');
    } catch (error) {
        console.error('Sybil: ERROR during component initialization:', error);
        throw error;
    }

    // Register chat provider FIRST
    console.log('Sybil: Registering chat provider...');
    console.log('Sybil: ChatProvider.viewType:', ChatProvider.viewType);

    try {
        const chatProviderDisposable = vscode.window.registerWebviewViewProvider(ChatProvider.viewType, chatProvider);
        context.subscriptions.push(chatProviderDisposable);
        console.log('Sybil: ✅ Chat provider registered successfully for view type:', ChatProvider.viewType);

        // Verify the provider was registered
        const registeredProviders = (vscode.window as any).registeredWebviewViewProviders || [];
        console.log('Sybil: Currently registered webview providers:', registeredProviders);

    } catch (error) {
        console.error('Sybil: ❌ ERROR registering chat provider:', error);
        throw error;
    }

    // Register tree data provider for sessions view
    console.log('Sybil: Registering session manager as tree data provider');
    try {
        const sessionProviderDisposable = vscode.window.registerTreeDataProvider('sybil.devSessions', sessionManager);
        context.subscriptions.push(sessionProviderDisposable);
        console.log('Sybil: ✅ Session manager registered successfully');
    } catch (error) {
        console.error('Sybil: ❌ ERROR registering session manager:', error);
        throw error;
    }

    // Create status bar item for quick chat access
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'sybil.devOpenChat';
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
        vscode.commands.registerCommand('sybil.devStartTask', async () => {
            const task = await vscode.window.showInputBox({
                prompt: 'Enter the task description',
                placeHolder: 'e.g., Create a React component for user authentication'
            });

            if (task) {
                await sybilAgent.startTask(task);
            }
        }),

        vscode.commands.registerCommand('sybil.devResumeSession', async () => {
            const sessionId = await vscode.window.showQuickPick(
                sessionManager.getAvailableSessions(),
                { placeHolder: 'Select session to resume' }
            );

            if (sessionId) {
                await sybilAgent.resumeSession(sessionId);
            }
        }),

        vscode.commands.registerCommand('sybil.devClearSession', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'Are you sure you want to clear the current session?',
                'Yes', 'No'
            );

            if (confirm === 'Yes') {
                await sessionManager.clearCurrentSession();
                vscode.window.showInformationMessage('Session cleared successfully');
            }
        }),

        vscode.commands.registerCommand('sybil.devShowAnalytics', () => {
            analyticsProvider.showAnalytics();
        }),

        vscode.commands.registerCommand('sybil.devConfigureModels', async () => {
            const providers = modelManager.getProviders();
            const selectedProvider = await vscode.window.showQuickPick(providers, {
                placeHolder: 'Select a provider to configure'
            });

            if (selectedProvider) {
                await configureProviderApiKey(selectedProvider);
            }
        }),

        vscode.commands.registerCommand('sybil.devShowModelStats', () => {
            const stats = modelManager.getModelStats();
            const statsMessage = Object.entries(stats)
                .map(([provider, data]) => {
                    const statsData = data as { totalModels: number; freeModels: number };
                    return `${provider}: ${statsData.freeModels}/${statsData.totalModels} free models`;
                })
                .join('\n');

            vscode.window.showInformationMessage(`Model Statistics:\n${statsMessage}`);
        }),

        vscode.commands.registerCommand('sybil.devValidateModels', async () => {
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

        vscode.commands.registerCommand('sybil.devOpenChat', () => {
            vscode.commands.executeCommand('workbench.view.extension.sybil-dev-chat-container');
        }),

        vscode.commands.registerCommand('sybil.devTestWebview', () => {
            console.log('=== SYBIL WEBVIEW TEST ===');
            if (chatProvider && chatProvider['_view']) {
                console.log('✅ Webview exists and is ready');
                chatProvider['_view'].webview.postMessage({
                    type: 'testMessage',
                    message: 'Webview test successful!'
                });
                vscode.window.showInformationMessage('Webview test: SUCCESS - Webview is active!');
            } else {
                console.log('❌ Webview does not exist or is not ready');
                vscode.window.showErrorMessage('Webview test: FAILED - Webview not found. Try opening the chat panel first.');
            }
        }),
    );

    // Update status bar item when chat visibility changes
    const updateStatusBarItem = () => {
        // Check if the Sybil Chat view container is visible
        const isChatVisible = vscode.window.tabGroups.all
            .flatMap(tg => tg.tabs)
            .some(tab => (tab.input as any)?.viewType === 'sybil.devChat');

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
            if (e.affectsConfiguration('sybil.dev')) {
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
