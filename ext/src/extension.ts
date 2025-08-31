import * as vscode from 'vscode';
import { SybilAgent } from './sybilAgent';
import { SessionManager } from './sessionManager';
import { AnalyticsProvider } from './analyticsProvider';
import { FileManager } from './fileManager';
import { TerminalManager } from './terminalManager';
import { DebugManager } from './debugManager';

let sybilAgent: SybilAgent;
let sessionManager: SessionManager;
let analyticsProvider: AnalyticsProvider;
let fileManager: FileManager;
let terminalManager: TerminalManager;
let debugManager: DebugManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('Sybil AI Coding Agent is now active!');

    // Initialize components
    sessionManager = new SessionManager(context);
    analyticsProvider = new AnalyticsProvider(context);
    fileManager = new FileManager(context);
    terminalManager = new TerminalManager(context);
    debugManager = new DebugManager(context);
    sybilAgent = new SybilAgent(context, sessionManager, analyticsProvider, fileManager, terminalManager, debugManager);

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
