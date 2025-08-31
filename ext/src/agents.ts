import * as vscode from 'vscode';
import { FileManager } from './fileManager';
import { TerminalManager } from './terminalManager';
import { DebugManager } from './debugManager';
import { ModelManager } from './modelManager';

export interface AgentMessage {
    id: string;
    type: 'request' | 'response' | 'notification';
    method: string;
    params?: any;
    result?: any;
    error?: {
        code: number;
        message: string;
    };
}

export interface GraphState {
    initial_request: string;
    blueprint_xml?: string;
    task_queue: Task[];
    current_task?: Task;
    current_files?: string[];
    review_feedback?: string;
    error?: string;
    completed_files?: string[];
}

export interface Task {
    description: string;
    context: string;
    id?: string;
}

export abstract class BaseAgent {
    protected name: string;
    protected fileManager: FileManager;
    protected terminalManager: TerminalManager;
    protected debugManager: DebugManager;
    protected modelManager: ModelManager;
    protected outputChannel: vscode.OutputChannel;

    constructor(
        name: string,
        fileManager: FileManager,
        terminalManager: TerminalManager,
        debugManager: DebugManager,
        modelManager: ModelManager,
        outputChannel: vscode.OutputChannel
    ) {
        this.name = name;
        this.fileManager = fileManager;
        this.terminalManager = terminalManager;
        this.debugManager = debugManager;
        this.modelManager = modelManager;
        this.outputChannel = outputChannel;
    }

    abstract run(state: GraphState): Promise<Partial<GraphState>>;

    protected log(message: string, data?: any): void {
        const logMessage = `[${this.name}] ${message}`;
        this.outputChannel.appendLine(logMessage);
        if (data) {
            this.outputChannel.appendLine(`  ${JSON.stringify(data, null, 2)}`);
        }
        console.log(logMessage, data);
    }

    protected getSystemPrompt(): string {
        const agentType = this.name.toLowerCase().replace('agent', '');
        try {
            const prompts = this.modelManager.getAgentPrompt(agentType);
            return prompts.systemPrompt;
        } catch (error) {
            this.log(`Failed to get system prompt from configuration, using default: ${error}`);
            return this.getDefaultSystemPrompt();
        }
    }

    protected getTaskPrompt(): string {
        const agentType = this.name.toLowerCase().replace('agent', '');
        try {
            const prompts = this.modelManager.getAgentPrompt(agentType);
            return prompts.taskPrompt;
        } catch (error) {
            this.log(`Failed to get task prompt from configuration, using default: ${error}`);
            return this.getDefaultTaskPrompt();
        }
    }

    protected abstract getDefaultSystemPrompt(): string;
    protected abstract getDefaultTaskPrompt(): string;
}

export class SoftwareArchitectAgent extends BaseAgent {
    constructor(
        fileManager: FileManager,
        terminalManager: TerminalManager,
        debugManager: DebugManager,
        modelManager: ModelManager,
        outputChannel: vscode.OutputChannel
    ) {
        super('SoftwareArchitectAgent', fileManager, terminalManager, debugManager, modelManager, outputChannel);
    }

    async run(state: GraphState): Promise<Partial<GraphState>> {
        const taskDescription = state.initial_request;
        this.log(`Starting architecture design for: ${taskDescription}`);

        const systemPrompt = this.getSystemPrompt();
        const taskPrompt = this.getTaskPrompt();
        const fullPrompt = `${systemPrompt}\n\n${taskPrompt}\n\nUser Request: ${taskDescription}`;

        try {
            // For now, we'll simulate the AI response
            // In a real implementation, this would call an AI service
            const blueprintXml = await this.generateBlueprint(taskDescription);
            this.log('Blueprint generated successfully');
            return { blueprint_xml: blueprintXml };
        } catch (error) {
            this.log(`Error generating blueprint: ${error}`);
            return { error: `Failed to generate blueprint: ${error}` };
        }
    }

    protected getDefaultSystemPrompt(): string {
        return `You are a Software Architect. Your role is to take a high-level user request and create a detailed, hierarchical technical blueprint.

Your final output must be a single XML block enclosed in \`<blueprint>\` tags.
The blueprint can contain nested \`<module>\` elements to represent the project structure.
Each module can specify its dependencies on other modules.
Each module must contain a list of \`<task>\` elements.

Example of a nested blueprint with dependencies:
<blueprint>
  <module name="Database">
    <tasks>
      <task id="db-1" description="Define the User schema in \`src/models/user.py\`." />
    </tasks>
  </module>
  <module name="API">
    <dependencies>
      <dependency>Database</dependency>
    </dependencies>
    <tasks>
      <task id="api-1" description="Implement the \`/users\` endpoint in \`src/api/routes.py\`. It should use the User model." />
    </tasks>
  </module>
</blueprint>`;
    }

    protected getDefaultTaskPrompt(): string {
        return "Create a detailed technical blueprint for the following task:";
    }

    private async generateBlueprint(taskDescription: string): Promise<string> {
        // This is a simplified implementation
        // In a real scenario, this would use an AI model to generate the blueprint
        const blueprint = `<blueprint>
  <module name="Core">
    <tasks>
      <task id="core-1" description="Implement the main functionality for: ${taskDescription}" />
    </tasks>
  </module>
</blueprint>`;

        return blueprint;
    }
}

export class DeveloperAgent extends BaseAgent {
    private maxIterations: number = 10;

    constructor(
        fileManager: FileManager,
        terminalManager: TerminalManager,
        debugManager: DebugManager,
        modelManager: ModelManager,
        outputChannel: vscode.OutputChannel
    ) {
        super('DeveloperAgent', fileManager, terminalManager, debugManager, modelManager, outputChannel);
    }

    async run(state: GraphState): Promise<Partial<GraphState>> {
        const task = state.current_task;
        if (!task) {
            return { error: 'No current task provided' };
        }

        const feedback = state.review_feedback;
        const taskDescription = feedback && feedback !== 'approved'
            ? `${task.description}\n\nPlease address the following feedback:\n${feedback}`
            : task.description;

        this.log(`Starting development for task: ${taskDescription}`);

        try {
            const files = await this.implementTask(taskDescription, task.context);
            this.log('Task implementation completed', { files });
            return { current_files: files };
        } catch (error) {
            this.log(`Error implementing task: ${error}`);
            return { error: `Failed to implement task: ${error}` };
        }
    }

    protected getDefaultSystemPrompt(): string {
        return `You are a Software Developer. Your role is to implement code based on the blueprint and task specifications provided.

You should:
1. Write clean, well-documented code
2. Follow best practices for the programming language
3. Handle error cases appropriately
4. Create modular, reusable components
5. Include necessary imports and dependencies`;
    }

    protected getDefaultTaskPrompt(): string {
        return "Implement the following task based on the blueprint:";
    }

    private async implementTask(taskDescription: string, context: string): Promise<string[]> {
        // This is a simplified implementation
        // In a real scenario, this would use AI to generate code and tools to create files

        // For demonstration, let's create a simple file
        const fileName = `task_${Date.now()}.ts`;
        const filePath = `src/${fileName}`;

        const code = `// Implementation for: ${taskDescription}
// Context: ${context}
// Generated on: ${new Date().toISOString()}

export function implementTask() {
    console.log('Task implementation placeholder');
}
`;

        await this.fileManager.createFile(filePath, code);
        return [filePath];
    }
}

export class ReviewerAgent extends BaseAgent {
    constructor(
        fileManager: FileManager,
        terminalManager: TerminalManager,
        debugManager: DebugManager,
        modelManager: ModelManager,
        outputChannel: vscode.OutputChannel
    ) {
        super('ReviewerAgent', fileManager, terminalManager, debugManager, modelManager, outputChannel);
    }

    async run(state: GraphState): Promise<Partial<GraphState>> {
        const task = state.current_task;
        const files = state.current_files || [];

        if (!task) {
            return { error: 'No current task provided' };
        }

        this.log(`Starting review for task: ${task.description}`);

        try {
            const feedback = await this.reviewCode(task, files);
            this.log('Code review completed', { feedback });
            return { review_feedback: feedback };
        } catch (error) {
            this.log(`Error during review: ${error}`);
            return { error: `Failed to review code: ${error}` };
        }
    }

    protected getDefaultSystemPrompt(): string {
        return `You are a Code Reviewer. Your role is to analyze code quality, identify potential issues, and ensure best practices are followed.

You should check for:
1. Code correctness and logic errors
2. Security vulnerabilities
3. Performance issues
4. Code style and consistency
5. Documentation quality
6. Test coverage considerations`;
    }

    protected getDefaultTaskPrompt(): string {
        return "Review the following code implementation:";
    }

    private async reviewCode(task: Task, files: string[]): Promise<string> {
        // This is a simplified implementation
        // In a real scenario, this would analyze the code quality

        if (files.length === 0) {
            return 'No files were created. Please implement the required functionality.';
        }

        // Basic review - check if files exist and have content
        for (const filePath of files) {
            try {
                const content = await this.fileManager.readFile(filePath);
                if (!content || content.trim().length === 0) {
                    return `File ${filePath} appears to be empty or incomplete.`;
                }
            } catch (error) {
                return `Could not read file ${filePath}: ${error}`;
            }
        }

        return 'approved';
    }
}

export class DocumenterAgent extends BaseAgent {
    constructor(
        fileManager: FileManager,
        terminalManager: TerminalManager,
        debugManager: DebugManager,
        modelManager: ModelManager,
        outputChannel: vscode.OutputChannel
    ) {
        super('DocumenterAgent', fileManager, terminalManager, debugManager, modelManager, outputChannel);
    }

    async run(state: GraphState): Promise<Partial<GraphState>> {
        const taskDescription = state.initial_request;
        const files = state.completed_files || [];

        this.log(`Starting documentation for: ${taskDescription}`);

        try {
            await this.generateDocumentation(taskDescription, files);
            this.log('Documentation generated successfully');
            return {};
        } catch (error) {
            this.log(`Error generating documentation: ${error}`);
            return { error: `Failed to generate documentation: ${error}` };
        }
    }

    protected getDefaultSystemPrompt(): string {
        return `You are a Technical Documentation Specialist. Your role is to create comprehensive documentation for the implemented features.

You should:
1. Write clear, concise documentation
2. Include code examples and usage instructions
3. Document API endpoints, functions, and classes
4. Provide setup and configuration instructions
5. Create user-friendly guides and tutorials`;
    }

    protected getDefaultTaskPrompt(): string {
        return "Create documentation for the following implementation:";
    }

    private async generateDocumentation(taskDescription: string, files: string[]): Promise<void> {
        const summary = `## Development Summary: ${new Date().toISOString()}

**Task:** ${taskDescription}
**Files Modified/Created:** ${files.join(', ') || 'None'}
**Status:** Completed

This task has been successfully implemented with the following changes:
- ${files.length > 0 ? `Created/modified ${files.length} file(s)` : 'No files were modified'}

---
`;

        const readmePath = 'README.md';
        try {
            const existingContent = await this.fileManager.readFile(readmePath);
            const updatedContent = existingContent + '\n\n' + summary;
            await this.fileManager.writeFile(readmePath, updatedContent);
        } catch (error) {
            // If README doesn't exist, create it
            await this.fileManager.createFile(readmePath, summary);
        }
    }
}
