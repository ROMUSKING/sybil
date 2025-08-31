import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { SessionManager } from './sessionManager';
import { AnalyticsProvider } from './analyticsProvider';
import { FileManager } from './fileManager';
import { TerminalManager } from './terminalManager';
import { DebugManager } from './debugManager';
import { AgentCoordinator } from './agentCoordinator';

export class SybilAgent {
    private context: vscode.ExtensionContext;
    private sessionManager: SessionManager;
    private analyticsProvider: AnalyticsProvider;
    private fileManager: FileManager;
    private terminalManager: TerminalManager;
    private debugManager: DebugManager;
    private agentCoordinator: AgentCoordinator;
    private pythonProcess: any;
    private outputChannel: vscode.OutputChannel;

    constructor(
        context: vscode.ExtensionContext,
        sessionManager: SessionManager,
        analyticsProvider: AnalyticsProvider,
        fileManager: FileManager,
        terminalManager: TerminalManager,
        debugManager: DebugManager
    ) {
        this.context = context;
        this.sessionManager = sessionManager;
        this.analyticsProvider = analyticsProvider;
        this.fileManager = fileManager;
        this.terminalManager = terminalManager;
        this.debugManager = debugManager;
        this.outputChannel = vscode.window.createOutputChannel('Sybil Agent');
        this.agentCoordinator = new AgentCoordinator(
            fileManager,
            terminalManager,
            debugManager,
            this.outputChannel
        );
        this.context.subscriptions.push(this.outputChannel);
    }

    public async startTask(task: string): Promise<void> {
        try {
            const sessionId = await this.sessionManager.createNewSession();
            await this.executeTask(task, sessionId);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start task: ${error}`);
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

    private async executeTask(task: string, sessionId: string): Promise<void> {
        this.outputChannel.show();
        this.outputChannel.appendLine(`Starting Sybil task: ${task}`);
        this.outputChannel.appendLine(`Session ID: ${sessionId}`);

        try {
            // Use the AgentCoordinator for multi-agent workflow
            const finalState = await this.agentCoordinator.executeTask(task, sessionId);

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
            this.outputChannel.appendLine(`\nError: ${error}`);
            vscode.window.showErrorMessage(`Sybil task error: ${error}`);
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
        const config = vscode.workspace.getConfiguration('sybil');
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

    private getVerboseSetting(): boolean {
        const config = vscode.workspace.getConfiguration('sybil');
        return config.get('verbose', false);
    }
}
