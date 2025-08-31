import { Agent } from './agent';
import { GraphState } from './graph_state';
import { ModelManager } from './model_manager';
import { PerformanceTracker } from './performance_tracker';

export class SoftwareArchitectAgent extends Agent {
    constructor(
        modelManager: ModelManager,
        performanceTracker: PerformanceTracker,
        verbose: boolean = false
    ) {
        super('SoftwareArchitectAgent', modelManager, performanceTracker, verbose);
    }

    public getRole(): string {
        return 'Software Architect';
    }

    public getPrompt(): string {
        return `You are a Software Architect Agent. Your role is to analyze user requirements and create a comprehensive blueprint for the software solution.

Based on the user's request, you should:
1. Analyze the requirements and break them down into logical modules
2. Define the overall architecture and technology stack
3. Create a detailed task breakdown with dependencies
4. Ensure the solution is scalable, maintainable, and follows best practices

Output your response in the following XML format:
<blueprint>
  <module name="ModuleName">
    <description>Brief description of the module</description>
    <tasks>
      <task id="task-1" description="Detailed task description" />
      <task id="task-2" description="Another task description" dependencies="task-1" />
    </tasks>
  </module>
  <module name="AnotherModule">
    <dependencies>
      <dependency>ModuleName</dependency>
    </dependencies>
    <tasks>
      <task id="task-3" description="Task that depends on previous module" />
    </tasks>
  </module>
</blueprint>

Remember to:
- Use clear, descriptive module and task names
- Define dependencies between modules and tasks appropriately
- Include all necessary components for a complete solution
- Consider error handling, testing, and documentation`;
    }

    public async process(state: GraphState): Promise<GraphState> {
        this.log('Processing architecture request');

        const userQuery = state.initial_request || '';
        if (!userQuery.trim()) {
            throw new Error('No user query provided for architecture analysis');
        }

        const prompt = `${this.getPrompt()}

User Request: ${userQuery}

Please create a comprehensive software architecture blueprint for this request.`;

        const models = ['gpt-4', 'claude-3', 'gemini-pro']; // Fallback model chain
        const response = await this.sendRequest(prompt, models);

        if (!this.validateResponse(response)) {
            throw new Error('Invalid response from architecture agent');
        }

        // Extract blueprint from response
        const blueprint = this.extractXmlTag(response, 'blueprint');
        if (!blueprint) {
            throw new Error('No blueprint found in architecture response');
        }

        // Parse modules and tasks from blueprint
        const modules = this.parseModulesFromBlueprint(blueprint);
        const tasks = this.parseTasksFromBlueprint(blueprint);

        // Update state with architecture information
        const updatedState: GraphState = {
            ...state,
            blueprint_xml: blueprint,
            modules,
            tasks,
            currentAgent: 'architect',
            status: 'blueprint_created'
        };

        this.log(`Created blueprint with ${modules.length} modules and ${tasks.length} tasks`);
        return updatedState;
    }
}
