"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SybilAgent = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const agentCoordinator_1 = require("./agentCoordinator");
class SybilAgent {
    constructor(context, sessionManager, analyticsProvider, fileManager, terminalManager, debugManager, modelManager) {
        this.context = context;
        this.sessionManager = sessionManager;
        this.analyticsProvider = analyticsProvider;
        this.fileManager = fileManager;
        this.terminalManager = terminalManager;
        this.debugManager = debugManager;
        this.modelManager = modelManager;
        this.outputChannel = vscode.window.createOutputChannel('Sybil Agent');
        this.agentCoordinator = new agentCoordinator_1.AgentCoordinator(fileManager, terminalManager, debugManager, modelManager, this.outputChannel);
        this.context.subscriptions.push(this.outputChannel);
    }
    async startTask(task) {
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
                const continueAnyway = await vscode.window.showWarningMessage('Another task is currently running. Do you want to start a new task anyway?', 'Yes', 'No');
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            this.logError(`Failed to start task: ${errorMessage}`);
            vscode.window.showErrorMessage(`Sybil: ${errorMessage}`);
        }
    }
    async resumeSession(sessionId) {
        try {
            await this.sessionManager.setCurrentSession(sessionId);
            const task = await this.sessionManager.getSessionTask(sessionId);
            if (task) {
                await this.executeTask(task, sessionId);
            }
            else {
                vscode.window.showErrorMessage('Could not retrieve task for session');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to resume session: ${error}`);
        }
    }
    async executeTask(task, sessionId, progress, token) {
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
            }
            else {
                this.outputChannel.appendLine('\nTask completed successfully!');
                await this.sessionManager.clearCurrentSession();
                await this.analyticsProvider.updateAnalytics(sessionId);
                vscode.window.showInformationMessage('Sybil task completed successfully!');
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            this.outputChannel.appendLine(`\nError: ${errorMessage}`);
            vscode.window.showErrorMessage(`Sybil task error: ${errorMessage}`);
            throw error; // Re-throw for proper error handling
        }
    }
    updateConfiguration() {
        // Update configuration when VS Code settings change
        // This could trigger reloading of API keys, model configs, etc.
    }
    dispose() {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
        }
        this.outputChannel.dispose();
        this.fileManager.dispose();
        this.terminalManager.dispose();
        this.debugManager.dispose();
    }
    getPythonPath() {
        const config = vscode.workspace.getConfiguration('sybil.dev');
        return config.get('pythonPath', 'python3');
    }
    getScriptPath() {
        // Assume the Python script is in the parent directory's src/main.py
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspacePath) {
            return path.join(workspacePath, 'src', 'main.py');
        }
        return path.join(__dirname, '..', '..', 'src', 'main.py');
    }
    isTaskRunning() {
        // Check if there's an active session that hasn't completed
        const currentSessionId = this.sessionManager.getCurrentSessionId();
        return currentSessionId !== null;
    }
    logError(message) {
        this.outputChannel.appendLine(`[ERROR] ${message}`);
        console.error(`[SybilAgent] ${message}`);
    }
    logInfo(message) {
        this.outputChannel.appendLine(`[INFO] ${message}`);
        console.log(`[SybilAgent] ${message}`);
    }
}
exports.SybilAgent = SybilAgent;
//# sourceMappingURL=sybilAgent.js.map