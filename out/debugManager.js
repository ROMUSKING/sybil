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
exports.DebugManager = void 0;
const vscode = __importStar(require("vscode"));
class DebugManager {
    constructor(context) {
        this.breakpoints = new Map();
        this.context = context;
        // Listen for debug session events
        this.context.subscriptions.push(vscode.debug.onDidStartDebugSession(session => {
            this.activeSession = session;
            console.log(`Debug session started: ${session.name}`);
        }), vscode.debug.onDidTerminateDebugSession(session => {
            if (this.activeSession === session) {
                this.activeSession = undefined;
            }
            console.log(`Debug session terminated: ${session.name}`);
        }), vscode.debug.onDidChangeActiveDebugSession(session => {
            this.activeSession = session;
        }));
    }
    /**
     * Start a debug session with the given configuration
     */
    async startDebugSession(config) {
        try {
            const success = await vscode.debug.startDebugging(vscode.workspace.workspaceFolders?.[0], config);
            if (success) {
                console.log(`Debug session started successfully: ${config.name}`);
            }
            else {
                console.error(`Failed to start debug session: ${config.name}`);
            }
            return success;
        }
        catch (error) {
            console.error(`Error starting debug session: ${error}`);
            return false;
        }
    }
    /**
     * Stop the active debug session
     */
    async stopDebugSession() {
        try {
            await vscode.debug.stopDebugging();
        }
        catch (error) {
            console.error(`Error stopping debug session: ${error}`);
        }
    }
    /**
     * Get the active debug session
     */
    getActiveDebugSession() {
        return this.activeSession;
    }
    /**
     * Check if a debug session is active
     */
    isDebugging() {
        return vscode.debug.activeDebugSession !== undefined;
    }
    /**
     * Add a breakpoint
     */
    addBreakpoint(breakpointInfo) {
        const uri = vscode.Uri.file(breakpointInfo.file);
        const position = new vscode.Position(breakpointInfo.line - 1, (breakpointInfo.column || 0) - 1);
        let breakpoint;
        if (breakpointInfo.logMessage) {
            breakpoint = new vscode.SourceBreakpoint(new vscode.Location(uri, position), undefined, undefined, undefined, breakpointInfo.logMessage);
        }
        else {
            breakpoint = new vscode.SourceBreakpoint(new vscode.Location(uri, position), !!breakpointInfo.condition, // Convert to boolean
            breakpointInfo.hitCondition);
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
    removeBreakpoint(file, line) {
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
    getBreakpoints(file) {
        return this.breakpoints.get(file) || [];
    }
    /**
     * Clear all breakpoints for a file
     */
    clearBreakpoints(file) {
        const fileBreakpoints = this.breakpoints.get(file) || [];
        if (fileBreakpoints.length > 0) {
            vscode.debug.removeBreakpoints(fileBreakpoints);
            this.breakpoints.delete(file);
        }
    }
    /**
     * Clear all breakpoints
     */
    clearAllBreakpoints() {
        const allBreakpoints = [];
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
    stepOver() {
        vscode.commands.executeCommand('workbench.action.debug.stepOver');
    }
    /**
     * Step into in the debugger
     */
    stepInto() {
        vscode.commands.executeCommand('workbench.action.debug.stepInto');
    }
    /**
     * Step out in the debugger
     */
    stepOut() {
        vscode.commands.executeCommand('workbench.action.debug.stepOut');
    }
    /**
     * Continue execution
     */
    continue() {
        vscode.commands.executeCommand('workbench.action.debug.continue');
    }
    /**
     * Pause execution
     */
    pause() {
        vscode.commands.executeCommand('workbench.action.debug.pause');
    }
    /**
     * Restart the debug session
     */
    restart() {
        vscode.commands.executeCommand('workbench.action.debug.restart');
    }
    /**
     * Get debug console
     */
    showDebugConsole() {
        vscode.commands.executeCommand('workbench.debug.action.toggleRepl');
    }
    /**
     * Evaluate expression in debug context
     */
    async evaluateExpression(expression) {
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
        }
        catch (error) {
            console.error(`Error evaluating expression: ${error}`);
            return undefined;
        }
    }
    /**
     * Get stack trace
     */
    async getStackTrace() {
        if (!this.activeSession) {
            return [];
        }
        try {
            const response = await this.activeSession.customRequest('stackTrace', {
                threadId: 1
            });
            return response?.stackFrames || [];
        }
        catch (error) {
            console.error(`Error getting stack trace: ${error}`);
            return [];
        }
    }
    /**
     * Get variables in current scope
     */
    async getVariables() {
        if (!this.activeSession) {
            return [];
        }
        try {
            const response = await this.activeSession.customRequest('variables', {
                variablesReference: 0
            });
            return response?.variables || [];
        }
        catch (error) {
            console.error(`Error getting variables: ${error}`);
            return [];
        }
    }
    /**
     * Create a debug configuration for Python
     */
    createPythonDebugConfig(program, args = [], cwd) {
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
    createNodeDebugConfig(program, args = [], cwd) {
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
    getWorkspaceFolder() {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }
    /**
     * Dispose of resources
     */
    dispose() {
        this.clearAllBreakpoints();
    }
}
exports.DebugManager = DebugManager;
//# sourceMappingURL=debugManager.js.map