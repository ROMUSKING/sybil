import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { SessionManager } from './sessionManager';
import { AnalyticsProvider } from './analyticsProvider';
import { FileManager } from './fileManager';
import { TerminalManager } from './terminalManager';
import { DebugManager } from './debugManager';
import { ModelManager } from './modelManager';
import { AgentCoordinator } from './agentCoordinator';

export class SybilAgent {
    private context: vscode.ExtensionContext;
    private sessionManager: SessionManager;
    private analyticsProvider: AnalyticsProvider;
    private fileManager: FileManager;
    private terminalManager: TerminalManager;
    private debugManager: DebugManager;
    private modelManager: ModelManager;
    private agentCoordinator: AgentCoordinator;
    private pythonProcess: any;
    private outputChannel: vscode.OutputChannel;

    constructor(
        context: vscode.ExtensionContext,
        sessionManager: SessionManager,
        analyticsProvider: AnalyticsProvider,
        fileManager: FileManager,
        terminalManager: TerminalManager,
        debugManager: DebugManager,
        modelManager: ModelManager
    ) {
        this.context = context;
        this.sessionManager = sessionManager;
        this.analyticsProvider = analyticsProvider;
        this.fileManager = fileManager;
        this.terminalManager = terminalManager;
        this.debugManager = debugManager;
        this.modelManager = modelManager;
        this.outputChannel = vscode.window.createOutputChannel('Sybil Agent');
        this.agentCoordinator = new AgentCoordinator(
            fileManager,
            terminalManager,
            debugManager,
            modelManager,
            this.outputChannel
        );
        this.context.subscriptions.push(this.outputChannel);
    }

    public async startTask(task: string): Promise<void> {
        try {
            this.outputChannel.clear();
            this.outputChannel.show();

            // Validate input
            if (!task || task.trim().length === 0) {
                throw new Error("Task description cannot be empty");
            }

            if (task.length > 1000) {
                throw new Error("Task description is too long (max 1000 characters)");
            }

            // Check if another task is running
            if (this.isTaskRunning()) {
                const continueAnyway = await vscode.window.showWarningMessage(
                    'Another task is currently running. Do you want to start a new task anyway?',
                    'Yes', 'No'
                );
                if (continueAnyway !== 'Yes') {
                    return;
                }
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Sybil AI Agent',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Initializing task...' });

                const sessionId = await this.sessionManager.createNewSession();
                progress.report({ increment: 20, message: 'Session created, starting task...' });

                if (token.isCancellationRequested) {
                    await this.sessionManager.clearCurrentSession();
                    return;
                }

                await this.executeTask(task, sessionId, progress, token);
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            this.logError(`Failed to start task: ${errorMessage}`);
            vscode.window.showErrorMessage(`Sybil: ${errorMessage}`);
        }
    }

    public async resumeSession(sessionId: string): Promise<void> {
        try {
            await this.sessionManager.setCurrentSession(sessionId);
            const task = await this.sessionManager.getSessionTask(sessionId);
            if (task) {
                await this.executeTask(task, sessionId);
            } else {
                vscode.window.showErrorMessage('Could not retrieve task for session');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to resume session: ${error}`);
        }
    }

    private async executeTask(task: string, sessionId: string, progress?: vscode.Progress<{ message?: string; increment?: number }>, token?: vscode.CancellationToken): Promise<void> {
        this.outputChannel.appendLine(`Starting Sybil task: ${task}`);
        this.outputChannel.appendLine(`Session ID: ${sessionId}`);

        try {
            // Update progress if available
            progress?.report({ increment: 40, message: 'Analyzing task requirements...' });

            if (token?.isCancellationRequested) {
                throw new Error('Task was cancelled by user');
            }

            // Use the AgentCoordinator for multi-agent workflow
            const finalState = await this.agentCoordinator.executeTask(task, sessionId);

            progress?.report({ increment: 80, message: 'Finalizing results...' });

            if (finalState.error) {
                this.outputChannel.appendLine(`\nTask failed: ${finalState.error}`);
                vscode.window.showErrorMessage(`Sybil task failed: ${finalState.error}`);
            } else {
                this.outputChannel.appendLine('\nTask completed successfully!');
                await this.sessionManager.clearCurrentSession();
                await this.analyticsProvider.updateAnalytics(sessionId);
                vscode.window.showInformationMessage('Sybil task completed successfully!');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            this.outputChannel.appendLine(`\nError: ${errorMessage}`);
            vscode.window.showErrorMessage(`Sybil task error: ${errorMessage}`);
            throw error; // Re-throw for proper error handling
        }
    }

    public updateConfiguration(): void {
        // Update configuration when VS Code settings change
        // This could trigger reloading of API keys, model configs, etc.
    }

    public dispose(): void {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
        }
        this.outputChannel.dispose();
        this.fileManager.dispose();
        this.terminalManager.dispose();
        this.debugManager.dispose();
    }

    private getPythonPath(): string {
        const config = vscode.workspace.getConfiguration('sybil.dev');
        return config.get('pythonPath', 'python3');
    }

    private getScriptPath(): string {
        // Assume the Python script is in the parent directory's src/main.py
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspacePath) {
            return path.join(workspacePath, 'src', 'main.py');
        }
        return path.join(__dirname, '..', '..', 'src', 'main.py');
    }

    private isTaskRunning(): boolean {
        // Check if there's an active session that hasn't completed
        const currentSessionId = this.sessionManager.getCurrentSessionId();
        return currentSessionId !== null;
    }

    private logError(message: string): void {
        this.outputChannel.appendLine(`[ERROR] ${message}`);
        console.error(`[SybilAgent] ${message}`);
    }

    private logInfo(message: string): void {
        this.outputChannel.appendLine(`[INFO] ${message}`);
        console.log(`[SybilAgent] ${message}`);
    }
}
