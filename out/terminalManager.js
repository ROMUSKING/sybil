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
exports.TerminalManager = void 0;
const vscode = __importStar(require("vscode"));
class TerminalManager {
    constructor(context) {
        this.terminals = new Map();
        this.outputBuffers = new Map();
        this.context = context;
    }
    /**
     * Create a new terminal instance
     */
    createTerminal(name, cwd) {
        const terminal = vscode.window.createTerminal({
            name: name || 'Sybil Terminal',
            cwd: cwd || this.getWorkspaceFolder(),
            env: process.env
        });
        this.terminals.set(name, terminal);
        this.outputBuffers.set(name, '');
        // Listen for terminal close events
        const disposable = vscode.window.onDidCloseTerminal(closedTerminal => {
            if (closedTerminal === terminal) {
                this.terminals.delete(name);
                this.outputBuffers.delete(name);
                disposable.dispose();
            }
        });
        this.context.subscriptions.push(disposable);
        return terminal;
    }
    /**
     * Get or create terminal by name
     */
    getTerminal(name) {
        let terminal = this.terminals.get(name);
        if (!terminal) {
            terminal = this.createTerminal(name);
        }
        return terminal;
    }
    /**
     * Execute a command in a terminal
     */
    async executeCommand(command) {
        const terminalName = command.name || 'sybil-command';
        const terminal = this.getTerminal(terminalName);
        // Execute the command
        terminal.sendText(command.command);
        terminal.show();
        // Return a placeholder result since we can't easily capture output
        // In a real implementation, you might use pseudo-terminals or other approaches
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    output: 'Command sent to terminal. Check terminal for output.',
                    exitCode: 0
                });
            }, 1000);
        });
    }
    /**
     * Execute command synchronously (blocking)
     */
    executeCommandSync(command, cwd) {
        const terminalName = 'sybil-sync';
        const terminal = this.getTerminal(terminalName);
        if (cwd) {
            terminal.sendText(`cd "${cwd}"`);
        }
        terminal.sendText(command);
        terminal.show();
        // For synchronous execution, we return a placeholder result
        // Real synchronous execution would require more complex implementation
        return {
            success: true,
            output: 'Command executed. Check terminal for output.',
            exitCode: 0
        };
    }
    /**
     * Run a command and wait for specific output pattern
     */
    async executeCommandWithPattern(command, successPattern, timeout = 30000) {
        const terminalName = command.name || 'sybil-pattern';
        const terminal = this.getTerminal(terminalName);
        terminal.sendText(command.command);
        terminal.show();
        // Simplified implementation - in practice, you'd need to use
        // pseudo-terminals or other mechanisms to capture output
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    output: 'Command executed. Pattern matching not implemented in basic terminal integration.',
                    exitCode: 0
                });
            }, 2000);
        });
    }
    /**
     * Send text to terminal
     */
    sendText(terminalName, text) {
        const terminal = this.getTerminal(terminalName);
        terminal.sendText(text);
    }
    /**
     * Show terminal
     */
    showTerminal(terminalName) {
        const terminal = this.getTerminal(terminalName);
        terminal.show();
    }
    /**
     * Hide terminal
     */
    hideTerminal(terminalName) {
        const terminal = this.getTerminal(terminalName);
        terminal.hide();
    }
    /**
     * Dispose of a specific terminal
     */
    disposeTerminal(terminalName) {
        const terminal = this.terminals.get(terminalName);
        if (terminal) {
            terminal.dispose();
            this.terminals.delete(terminalName);
            this.outputBuffers.delete(terminalName);
        }
    }
    /**
     * Dispose of all terminals
     */
    disposeAllTerminals() {
        for (const [name, terminal] of this.terminals) {
            terminal.dispose();
        }
        this.terminals.clear();
        this.outputBuffers.clear();
    }
    /**
     * Get workspace folder path
     */
    getWorkspaceFolder() {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }
    /**
     * Get list of active terminals
     */
    getActiveTerminals() {
        return Array.from(this.terminals.keys());
    }
    /**
     * Check if terminal exists
     */
    terminalExists(name) {
        return this.terminals.has(name);
    }
    /**
     * Dispose of resources
     */
    dispose() {
        this.disposeAllTerminals();
    }
}
exports.TerminalManager = TerminalManager;
//# sourceMappingURL=terminalManager.js.map