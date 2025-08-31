import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { SessionManager } from './sessionManager';
import { AnalyticsProvider } from './analyticsProvider';
import { FileManager } from './fileManager';
import { TerminalManager } from './terminalManager';
import { DebugManager } from './debugManager';

export class SybilAgent {
    private context: vscode.ExtensionContext;
    private sessionManager: SessionManager;
    private analyticsProvider: AnalyticsProvider;
    private fileManager: FileManager;
    private terminalManager: TerminalManager;
    private debugManager: DebugManager;
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
        const pythonPath = this.getPythonPath();
        const scriptPath = this.getScriptPath();

        if (!fs.existsSync(scriptPath)) {
            vscode.window.showErrorMessage('Sybil Python script not found. Please ensure the Python backend is properly set up.');
            return;
        }

        this.outputChannel.show();
        this.outputChannel.appendLine(`Starting Sybil task: ${task}`);
        this.outputChannel.appendLine(`Session ID: ${sessionId}`);

        const args = [
            scriptPath,
            task,
            '--session-id', sessionId
        ];

        if (this.getVerboseSetting()) {
            args.push('--verbose');
        }

        this.pythonProcess = spawn(pythonPath, args, {
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.pythonProcess.stdout.on('data', (data: Buffer) => {
            this.outputChannel.append(data.toString());
        });

        this.pythonProcess.stderr.on('data', (data: Buffer) => {
            this.outputChannel.append(data.toString());
        });

        this.pythonProcess.on('close', async (code: number) => {
            if (code === 0) {
                this.outputChannel.appendLine('\nTask completed successfully!');
                await this.sessionManager.clearCurrentSession();
                await this.analyticsProvider.updateAnalytics(sessionId);
                vscode.window.showInformationMessage('Sybil task completed successfully!');
            } else {
                this.outputChannel.appendLine(`\nTask failed with exit code ${code}`);
                vscode.window.showErrorMessage('Sybil task failed. Check the output channel for details.');
            }
            this.pythonProcess = null;
        });

        this.pythonProcess.on('error', (error: Error) => {
            this.outputChannel.appendLine(`\nError: ${error.message}`);
            vscode.window.showErrorMessage(`Sybil process error: ${error.message}`);
        });
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
