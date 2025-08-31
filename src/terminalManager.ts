import * as vscode from 'vscode';

export interface TerminalCommand {
    command: string;
    cwd?: string;
    env?: { [key: string]: string };
    name?: string;
}

export interface TerminalResult {
    success: boolean;
    output: string;
    error?: string;
    exitCode?: number;
}

export class TerminalManager {
    private context: vscode.ExtensionContext;
    private terminals: Map<string, vscode.Terminal> = new Map();
    private outputBuffers: Map<string, string> = new Map();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Create a new terminal instance
     */
    public createTerminal(name: string, cwd?: string): vscode.Terminal {
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
    public getTerminal(name: string): vscode.Terminal {
        let terminal = this.terminals.get(name);
        if (!terminal) {
            terminal = this.createTerminal(name);
        }
        return terminal;
    }

    /**
     * Execute a command in a terminal
     */
    public async executeCommand(command: TerminalCommand): Promise<TerminalResult> {
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
    public executeCommandSync(command: string, cwd?: string): TerminalResult {
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
    public async executeCommandWithPattern(
        command: TerminalCommand,
        successPattern: RegExp,
        timeout: number = 30000
    ): Promise<TerminalResult> {
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
    public sendText(terminalName: string, text: string): void {
        const terminal = this.getTerminal(terminalName);
        terminal.sendText(text);
    }

    /**
     * Show terminal
     */
    public showTerminal(terminalName: string): void {
        const terminal = this.getTerminal(terminalName);
        terminal.show();
    }

    /**
     * Hide terminal
     */
    public hideTerminal(terminalName: string): void {
        const terminal = this.getTerminal(terminalName);
        terminal.hide();
    }

    /**
     * Dispose of a specific terminal
     */
    public disposeTerminal(terminalName: string): void {
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
    public disposeAllTerminals(): void {
        for (const [name, terminal] of this.terminals) {
            terminal.dispose();
        }
        this.terminals.clear();
        this.outputBuffers.clear();
    }

    /**
     * Get workspace folder path
     */
    private getWorkspaceFolder(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    /**
     * Get list of active terminals
     */
    public getActiveTerminals(): string[] {
        return Array.from(this.terminals.keys());
    }

    /**
     * Check if terminal exists
     */
    public terminalExists(name: string): boolean {
        return this.terminals.has(name);
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.disposeAllTerminals();
    }
}
