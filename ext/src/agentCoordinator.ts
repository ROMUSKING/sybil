import * as vscode from 'vscode';
import {
    BaseAgent,
    SoftwareArchitectAgent,
    DeveloperAgent,
    ReviewerAgent,
    DocumenterAgent,
    GraphState,
    Task
} from './agents';
import { FileManager } from './fileManager';
import { TerminalManager } from './terminalManager';
import { DebugManager } from './debugManager';

export class AgentCoordinator {
    private architect: SoftwareArchitectAgent;
    private developer: DeveloperAgent;
    private reviewer: ReviewerAgent;
    private documenter: DocumenterAgent;
    private fileManager: FileManager;
    private terminalManager: TerminalManager;
    private debugManager: DebugManager;
    private outputChannel: vscode.OutputChannel;
    private sessions: Map<string, GraphState> = new Map();

    constructor(
        fileManager: FileManager,
        terminalManager: TerminalManager,
        debugManager: DebugManager,
        outputChannel: vscode.OutputChannel
    ) {
        this.fileManager = fileManager;
        this.terminalManager = terminalManager;
        this.debugManager = debugManager;
        this.outputChannel = outputChannel;

        this.architect = new SoftwareArchitectAgent(
            fileManager, terminalManager, debugManager, outputChannel
        );
        this.developer = new DeveloperAgent(
            fileManager, terminalManager, debugManager, outputChannel
        );
        this.reviewer = new ReviewerAgent(
            fileManager, terminalManager, debugManager, outputChannel
        );
        this.documenter = new DocumenterAgent(
            fileManager, terminalManager, debugManager, outputChannel
        );
    }

    async executeTask(taskDescription: string, sessionId: string): Promise<GraphState> {
        this.log(`Starting coordinated task execution for session: ${sessionId}`);

        // Initialize or retrieve session state
        let state = this.sessions.get(sessionId);
        if (!state) {
            state = {
                initial_request: taskDescription,
                task_queue: [],
                current_files: [],
                completed_files: []
            };
            this.sessions.set(sessionId, state);
        }

        try {
            // Execute the workflow
            const finalState = await this.runWorkflow(state, sessionId);
            this.sessions.set(sessionId, finalState);
            return finalState;
        } catch (error) {
            this.log(`Workflow execution failed: ${error}`);
            const errorState = { ...state, error: `Workflow execution failed: ${error}` };
            this.sessions.set(sessionId, errorState);
            return errorState;
        }
    }

    private async runWorkflow(initialState: GraphState, sessionId: string): Promise<GraphState> {
        let state = { ...initialState };

        // Step 1: Architect creates blueprint
        this.log('Step 1: Running Software Architect');
        const architectResult = await this.architect.run(state);
        state = { ...state, ...architectResult };

        if (state.error) {
            return state;
        }

        // Step 2: Prepare task queue from blueprint
        this.log('Step 2: Preparing task queue');
        const taskQueue = await this.prepareTaskQueue(state);
        state = { ...state, task_queue: taskQueue };

        if (state.error) {
            return state;
        }

        // Step 3: Process tasks in queue
        while (state.task_queue.length > 0) {
            // Select next task
            const nextTask = state.task_queue.shift();
            if (!nextTask) break;

            state = { ...state, current_task: nextTask, review_feedback: undefined };
            this.log(`Step 3: Processing task: ${nextTask.description}`);

            // Developer implements task
            this.log('Step 4: Running Developer Agent');
            const developerResult = await this.developer.run(state);
            state = { ...state, ...developerResult };

            if (state.error) {
                return state;
            }

            // Accumulate files
            const completedFiles = [...(state.completed_files || []), ...(state.current_files || [])];
            state = { ...state, completed_files: completedFiles };

            // Reviewer checks work
            this.log('Step 5: Running Reviewer Agent');
            const reviewerResult = await this.reviewer.run(state);
            state = { ...state, ...reviewerResult };

            if (state.error) {
                return state;
            }

            // Check review feedback
            if (state.review_feedback !== 'approved') {
                this.log('Review feedback received, retrying task');
                // Put task back in queue for retry
                state.task_queue.unshift(nextTask);
                continue;
            }

            this.log('Task approved, continuing to next task');
        }

        // Step 6: Generate documentation
        this.log('Step 6: Running Documenter Agent');
        const documenterResult = await this.documenter.run(state);
        state = { ...state, ...documenterResult };

        this.log('Workflow completed successfully');
        return state;
    }

    private async prepareTaskQueue(state: GraphState): Promise<Task[]> {
        if (!state.blueprint_xml) {
            throw new Error('No blueprint XML available');
        }

        try {
            const tasks = this.parseBlueprint(state.blueprint_xml);
            this.log(`Parsed ${tasks.length} tasks from blueprint`);
            return tasks;
        } catch (error) {
            throw new Error(`Failed to parse blueprint: ${error}`);
        }
    }

    private parseBlueprint(blueprintXml: string): Task[] {
        // Simple XML parsing for blueprint
        // In a real implementation, you'd use a proper XML parser
        const tasks: Task[] = [];
        const moduleRegex = /<module name="([^"]+)">(.*?)<\/module>/gs;
        const taskRegex = /<task[^>]*description="([^"]+)"[^>]*\/>/g;

        let moduleMatch;
        while ((moduleMatch = moduleRegex.exec(blueprintXml)) !== null) {
            const moduleName = moduleMatch[1];
            const moduleContent = moduleMatch[2];
            if (!moduleName || !moduleContent) continue;

            let taskMatch;
            while ((taskMatch = taskRegex.exec(moduleContent)) !== null) {
                const description = taskMatch[1];
                if (!description) continue;

                tasks.push({
                    description: description,
                    context: `Module: ${moduleName}`,
                    id: `task_${tasks.length + 1}`
                });
            }
        }

        return tasks;
    }

    getSessionState(sessionId: string): GraphState | undefined {
        return this.sessions.get(sessionId);
    }

    clearSession(sessionId: string): void {
        this.sessions.delete(sessionId);
        this.log(`Cleared session: ${sessionId}`);
    }

    getAllSessions(): string[] {
        return Array.from(this.sessions.keys());
    }

    private log(message: string): void {
        const logMessage = `[AgentCoordinator] ${message}`;
        this.outputChannel.appendLine(logMessage);
        console.log(logMessage);
    }
}
