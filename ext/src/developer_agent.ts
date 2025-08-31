import { Agent } from './agent';
import { GraphState } from './graph_state';
import { ModelManager } from './model_manager';
import { PerformanceTracker } from './performance_tracker';
import { ToolRegistry } from './tool_registry';

export class DeveloperAgent extends Agent {
    private toolRegistry: ToolRegistry;

    constructor(
        modelManager: ModelManager,
        performanceTracker: PerformanceTracker,
        toolRegistry: ToolRegistry,
        verbose: boolean = false
    ) {
        super('DeveloperAgent', modelManager, performanceTracker, verbose);
        this.toolRegistry = toolRegistry;
    }

    public getRole(): string {
        return 'Software Developer';
    }

    public getPrompt(): string {
        return `You are a Software Developer Agent. Your role is to implement the tasks defined in the architecture blueprint.

Based on the blueprint and current task, you should:
1. Analyze the current task requirements
2. Implement the code following best practices
3. Create or modify files as needed
4. Ensure code quality and proper error handling
5. Test the implementation

Output your response in the following XML format:
<final_answer>
<file>path/to/file.ts</file>
<file>path/to/another/file.ts</file>
</final_answer>

Remember to:
- Write clean, well-documented code
- Follow the project's coding standards
- Include proper error handling
- Add comments for complex logic
- Ensure the code integrates well with existing codebase`;
    }

    public async process(state: GraphState): Promise<GraphState> {
        this.log('Processing development task');

        if (!state.current_task) {
            throw new Error('No current task provided for development');
        }

        if (!state.blueprint_xml) {
            throw new Error('No blueprint available for development');
        }

        const task = state.current_task;
        const blueprint = state.blueprint_xml;

        const prompt = `${this.getPrompt()}

Current Task: ${task.description}
Task Context: ${task.context || 'No additional context provided'}
Blueprint: ${blueprint}

Please implement this task according to the blueprint specifications.`;

        const models = ['gpt-4', 'claude-3', 'gemini-pro']; // Fallback model chain
        const response = await this.sendRequest(prompt, models);

        if (!this.validateResponse(response)) {
            throw new Error('Invalid response from developer agent');
        }

        // Extract file paths from response
        const finalAnswer = this.extractXmlTag(response, 'final_answer');
        if (!finalAnswer) {
            throw new Error('No final_answer found in developer response');
        }

        // Extract file paths
        const filePaths = this.extractXmlTags(finalAnswer, 'file');

        // Update state with development results
        const updatedState: GraphState = {
            ...state,
            current_files: filePaths,
            status: 'implementation_completed'
        };

        this.log(`Completed development task, created/modified ${filePaths.length} files`);
        return updatedState;
    }

    public async implementTask(task: any, blueprint: string): Promise<string[]> {
        this.log(`Implementing task: ${task.description}`);

        const prompt = `${this.getPrompt()}

Task: ${task.description}
Context: ${task.context || 'No additional context'}
Blueprint: ${blueprint}

Implement this task and provide the file paths that were created or modified.`;

        const models = ['gpt-4', 'claude-3', 'gemini-pro'];
        const response = await this.sendRequest(prompt, models);

        // Extract and process file implementations
        const finalAnswer = this.extractXmlTag(response, 'final_answer');
        if (!finalAnswer) {
            return [];
        }

        const filePaths = this.extractXmlTags(finalAnswer, 'file');

        // Here you would typically parse the actual code from the response
        // and use the tool registry to create/modify files
        // For now, we'll just return the file paths

        return filePaths;
    }

    public async readFile(filePath: string): Promise<string> {
        const readTool = this.toolRegistry.getTool('read_file');
        if (!readTool) {
            throw new Error('read_file tool not available');
        }
        return await readTool(filePath);
    }

    public async writeFile(filePath: string, content: string): Promise<void> {
        const writeTool = this.toolRegistry.getTool('write_file');
        if (!writeTool) {
            throw new Error('write_file tool not available');
        }
        await writeTool(filePath, content);
    }

    public async runCommand(command: string): Promise<string> {
        const shellTool = this.toolRegistry.getTool('shell_execute');
        if (!shellTool) {
            throw new Error('shell_execute tool not available');
        }
        return await shellTool(command);
    }

    public async runTests(testPattern?: string): Promise<string> {
        const testTool = this.toolRegistry.getTool('run_tests');
        if (!testTool) {
            throw new Error('run_tests tool not available');
        }
        return await testTool(testPattern || '');
    }
}
