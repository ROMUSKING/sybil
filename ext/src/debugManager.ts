import * as vscode from 'vscode';

export interface DebugConfig {
    type: string;
    name: string;
    request: 'launch' | 'attach';
    program?: string;
    args?: string[];
    cwd?: string;
    env?: { [key: string]: string };
    console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal';
    internalConsoleOptions?: 'neverOpen' | 'openOnSessionStart' | 'openOnFirstSessionStart';
}

export interface BreakpointInfo {
    file: string;
    line: number;
    column?: number;
    condition?: string;
    hitCondition?: string;
    logMessage?: string;
}

export class DebugManager {
    private context: vscode.ExtensionContext;
    private activeSession: vscode.DebugSession | undefined;
    private breakpoints: Map<string, vscode.Breakpoint[]> = new Map();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;

        // Listen for debug session events
        this.context.subscriptions.push(
            vscode.debug.onDidStartDebugSession(session => {
                this.activeSession = session;
                console.log(`Debug session started: ${session.name}`);
            }),

            vscode.debug.onDidTerminateDebugSession(session => {
                if (this.activeSession === session) {
                    this.activeSession = undefined;
                }
                console.log(`Debug session terminated: ${session.name}`);
            }),

            vscode.debug.onDidChangeActiveDebugSession(session => {
                this.activeSession = session;
            })
        );
    }

    /**
     * Start a debug session with the given configuration
     */
    public async startDebugSession(config: DebugConfig): Promise<boolean> {
        try {
            const success = await vscode.debug.startDebugging(
                vscode.workspace.workspaceFolders?.[0],
                config
            );

            if (success) {
                console.log(`Debug session started successfully: ${config.name}`);
            } else {
                console.error(`Failed to start debug session: ${config.name}`);
            }

            return success;
        } catch (error) {
            console.error(`Error starting debug session: ${error}`);
            return false;
        }
    }

    /**
     * Stop the active debug session
     */
    public async stopDebugSession(): Promise<void> {
        try {
            await vscode.debug.stopDebugging();
        } catch (error) {
            console.error(`Error stopping debug session: ${error}`);
        }
    }

    /**
     * Get the active debug session
     */
    public getActiveDebugSession(): vscode.DebugSession | undefined {
        return this.activeSession;
    }

    /**
     * Check if a debug session is active
     */
    public isDebugging(): boolean {
        return vscode.debug.activeDebugSession !== undefined;
    }

    /**
     * Add a breakpoint
     */
    public addBreakpoint(breakpointInfo: BreakpointInfo): vscode.Breakpoint {
        const uri = vscode.Uri.file(breakpointInfo.file);
        const position = new vscode.Position(breakpointInfo.line - 1, (breakpointInfo.column || 0) - 1);

        let breakpoint: vscode.Breakpoint;

        if (breakpointInfo.logMessage) {
            breakpoint = new vscode.SourceBreakpoint(
                new vscode.Location(uri, position),
                undefined,
                undefined,
                undefined,
                breakpointInfo.logMessage
            );
        } else {
            breakpoint = new vscode.SourceBreakpoint(
                new vscode.Location(uri, position),
                !!breakpointInfo.condition, // Convert to boolean
                breakpointInfo.hitCondition
            );
        }

        vscode.debug.addBreakpoints([breakpoint]);

        // Store breakpoint for management
        const fileBreakpoints = this.breakpoints.get(breakpointInfo.file) || [];
        fileBreakpoints.push(breakpoint);
        this.breakpoints.set(breakpointInfo.file, fileBreakpoints);

        return breakpoint;
    }

    /**
     * Remove a breakpoint
     */
    public removeBreakpoint(file: string, line: number): void {
        const fileBreakpoints = this.breakpoints.get(file) || [];
        const breakpointIndex = fileBreakpoints.findIndex(bp => {
            if (bp instanceof vscode.SourceBreakpoint) {
                const location = bp.location;
                return location.range.start.line === line - 1;
            }
            return false;
        });

        if (breakpointIndex !== -1) {
            const breakpoint = fileBreakpoints[breakpointIndex];
            if (breakpoint) {
                vscode.debug.removeBreakpoints([breakpoint]);
                fileBreakpoints.splice(breakpointIndex, 1);
                this.breakpoints.set(file, fileBreakpoints);
            }
        }
    }

    /**
     * Get all breakpoints for a file
     */
    public getBreakpoints(file: string): vscode.Breakpoint[] {
        return this.breakpoints.get(file) || [];
    }

    /**
     * Clear all breakpoints for a file
     */
    public clearBreakpoints(file: string): void {
        const fileBreakpoints = this.breakpoints.get(file) || [];
        if (fileBreakpoints.length > 0) {
            vscode.debug.removeBreakpoints(fileBreakpoints);
            this.breakpoints.delete(file);
        }
    }

    /**
     * Clear all breakpoints
     */
    public clearAllBreakpoints(): void {
        const allBreakpoints: vscode.Breakpoint[] = [];
        for (const fileBreakpoints of this.breakpoints.values()) {
            allBreakpoints.push(...fileBreakpoints);
        }

        if (allBreakpoints.length > 0) {
            vscode.debug.removeBreakpoints(allBreakpoints);
        }

        this.breakpoints.clear();
    }

    /**
     * Step over in the debugger
     */
    public stepOver(): void {
        vscode.commands.executeCommand('workbench.action.debug.stepOver');
    }

    /**
     * Step into in the debugger
     */
    public stepInto(): void {
        vscode.commands.executeCommand('workbench.action.debug.stepInto');
    }

    /**
     * Step out in the debugger
     */
    public stepOut(): void {
        vscode.commands.executeCommand('workbench.action.debug.stepOut');
    }

    /**
     * Continue execution
     */
    public continue(): void {
        vscode.commands.executeCommand('workbench.action.debug.continue');
    }

    /**
     * Pause execution
     */
    public pause(): void {
        vscode.commands.executeCommand('workbench.action.debug.pause');
    }

    /**
     * Restart the debug session
     */
    public restart(): void {
        vscode.commands.executeCommand('workbench.action.debug.restart');
    }

    /**
     * Get debug console
     */
    public showDebugConsole(): void {
        vscode.commands.executeCommand('workbench.debug.action.toggleRepl');
    }

    /**
     * Evaluate expression in debug context
     */
    public async evaluateExpression(expression: string): Promise<string | undefined> {
        if (!this.activeSession) {
            return undefined;
        }

        try {
            const result = await this.activeSession.customRequest('evaluate', {
                expression: expression,
                frameId: 0,
                context: 'repl'
            });

            return result?.result;
        } catch (error) {
            console.error(`Error evaluating expression: ${error}`);
            return undefined;
        }
    }

    /**
     * Get stack trace
     */
    public async getStackTrace(): Promise<any[]> {
        if (!this.activeSession) {
            return [];
        }

        try {
            const response = await this.activeSession.customRequest('stackTrace', {
                threadId: 1
            });

            return response?.stackFrames || [];
        } catch (error) {
            console.error(`Error getting stack trace: ${error}`);
            return [];
        }
    }

    /**
     * Get variables in current scope
     */
    public async getVariables(): Promise<any[]> {
        if (!this.activeSession) {
            return [];
        }

        try {
            const response = await this.activeSession.customRequest('variables', {
                variablesReference: 0
            });

            return response?.variables || [];
        } catch (error) {
            console.error(`Error getting variables: ${error}`);
            return [];
        }
    }

    /**
     * Create a debug configuration for Python
     */
    public createPythonDebugConfig(
        program: string,
        args: string[] = [],
        cwd?: string
    ): DebugConfig {
        return {
            type: 'python',
            name: 'Sybil Python Debug',
            request: 'launch',
            program: program,
            args: args,
            cwd: cwd || this.getWorkspaceFolder(),
            console: 'integratedTerminal',
            internalConsoleOptions: 'openOnSessionStart'
        };
    }

    /**
     * Create a debug configuration for Node.js
     */
    public createNodeDebugConfig(
        program: string,
        args: string[] = [],
        cwd?: string
    ): DebugConfig {
        return {
            type: 'node',
            name: 'Sybil Node Debug',
            request: 'launch',
            program: program,
            args: args,
            cwd: cwd || this.getWorkspaceFolder(),
            console: 'integratedTerminal',
            internalConsoleOptions: 'openOnSessionStart'
        };
    }

    /**
     * Get workspace folder
     */
    private getWorkspaceFolder(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.clearAllBreakpoints();
    }
}
