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
import { ModelManager } from './modelManager';
// import * as xml2js from 'xml2js';

export class AgentCoordinator {
    private architect: SoftwareArchitectAgent;
    private developer: DeveloperAgent;
    private reviewer: ReviewerAgent;
    private documenter: DocumenterAgent;
    private fileManager: FileManager;
    private terminalManager: TerminalManager;
    private debugManager: DebugManager;
    private modelManager: ModelManager;
    private outputChannel: vscode.OutputChannel;
    private sessions: Map<string, GraphState> = new Map();

    constructor(
        fileManager: FileManager,
        terminalManager: TerminalManager,
        debugManager: DebugManager,
        modelManager: ModelManager,
        outputChannel: vscode.OutputChannel
    ) {
        this.fileManager = fileManager;
        this.terminalManager = terminalManager;
        this.debugManager = debugManager;
        this.modelManager = modelManager;
        this.outputChannel = outputChannel;

        this.architect = new SoftwareArchitectAgent(
            fileManager, terminalManager, debugManager, modelManager, outputChannel
        );
        this.developer = new DeveloperAgent(
            fileManager, terminalManager, debugManager, modelManager, outputChannel
        );
        this.reviewer = new ReviewerAgent(
            fileManager, terminalManager, debugManager, modelManager, outputChannel
        );
        this.documenter = new DocumenterAgent(
            fileManager, terminalManager, debugManager, modelManager, outputChannel
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
            const { graph, tasksMap } = await this.parseBlueprint(state.blueprint_xml);
            const tasks: Task[] = [];

            for (const moduleName in tasksMap) {
                if (tasksMap.hasOwnProperty(moduleName)) {
                    const moduleTasks = tasksMap[moduleName];
                    tasks.push(...moduleTasks.map((task: any) => ({
                        description: task.description,
                        context: task.context,
                        id: `task_${tasks.length + 1}`
                    })));
                }
            }

            this.log(`Parsed ${tasks.length} tasks from blueprint`);
            return tasks;
        } catch (error) {
            throw new Error(`Failed to parse blueprint: ${error}`);
        }
    }


    private async parseBlueprint(blueprintXml: string): Promise<{ graph: any, tasksMap: any }> {
        // Temporarily disabled - xml2js dependency not available
        console.log('Blueprint parsing temporarily disabled');
        return { graph: {}, tasksMap: {} };

        /*
        const parser = new xml2js.Parser({ explicitArray: false });
        try {
            const result = await parser.parseStringPromise(blueprintXml);
            const root = result.root;
            const graph: { [key: string]: string[] } = {};
            const tasksMap: { [key: string]: { description: string, context: string }[] } = {};

            if (root && root.module) {
                const modules = Array.isArray(root.module) ? root.module : [root.module];

                for (const module of modules) {
                    const name = module.$.name;
                    if (name) {
                        if (!graph[name]) {
                            graph[name] = [];
                            tasksMap[name] = [];
                        }

                        if (module.dependencies && module.dependencies.dependency) {
                            const dependencies = Array.isArray(module.dependencies.dependency) ? module.dependencies.dependency : [module.dependencies.dependency];
                            graph[name] = dependencies.map((dep: any) => dep);
                        }

                        if (module.tasks && module.tasks.task) {
                            const tasks = Array.isArray(module.tasks.task) ? module.tasks.task : [module.tasks.task];
                            tasksMap[name] = tasks.map((task: any) => ({
                                description: task.$.description,
                                context: `Module: ${name}`
                            }));
                        }
                    }
                }
            }
            return { graph, tasksMap };
        } catch (error) {
            console.error("Error parsing XML:", error);
            throw error;
        }
        */
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

