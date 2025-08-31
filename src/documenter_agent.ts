import { Agent } from './agent';
import { GraphState } from './graph_state';
import { ModelManager } from './model_manager';
import { PerformanceTracker } from './performance_tracker';

export class DocumenterAgent extends Agent {
    constructor(
        modelManager: ModelManager,
        performanceTracker: PerformanceTracker,
        verbose: boolean = false
    ) {
        super('DocumenterAgent', modelManager, performanceTracker, verbose);
    }

    public getRole(): string {
        return 'Technical Writer/Documenter';
    }

    public getPrompt(): string {
        return `You are a Technical Documentation Agent. Your role is to create comprehensive documentation for the implemented solution.

Based on the blueprint, implemented files, and project structure, you should:
1. Create README and documentation files
2. Document the architecture and design decisions
3. Provide setup and installation instructions
4. Include API documentation if applicable
5. Create user guides and examples
6. Document any configuration requirements

Output your response in the following format:
## Project Documentation

### Overview
[Brief project description]

### Features
- Feature 1
- Feature 2

### Architecture
[Architecture description]

### Installation
[Installation steps]

### Usage
[Usage instructions]

### API Documentation
[API docs if applicable]

### Configuration
[Configuration details]

### Development
[Development guidelines]

### Testing
[Testing information]

### Deployment
[Deployment instructions]

Remember to:
- Write clear, concise documentation
- Include code examples where helpful
- Provide troubleshooting information
- Keep documentation up-to-date with the implementation`;
    }

    public async process(state: GraphState): Promise<GraphState> {
        this.log('Processing documentation request');

        const blueprint = state.blueprint_xml || '';
        const files = state.current_files || [];
        const modules = state.modules || [];

        if (!blueprint) {
            throw new Error('No blueprint available for documentation');
        }

        const prompt = `${this.getPrompt()}

Blueprint: ${blueprint}
Implemented Files: ${files.join(', ')}
Modules: ${modules.map(m => m.name).join(', ')}

Please create comprehensive documentation for this project.`;

        const models = ['gpt-4', 'claude-3', 'gemini-pro']; // Fallback model chain
        const response = await this.sendRequest(prompt, models);

        if (!this.validateResponse(response)) {
            throw new Error('Invalid response from documenter agent');
        }

        // Update state with documentation
        const updatedState: GraphState = {
            ...state,
            status: 'documentation_completed'
        };

        this.log('Documentation completed');
        return updatedState;
    }

    public async generateReadme(projectName: string, description: string, blueprint: string, features: string[]): Promise<string> {
        this.log(`Generating README for ${projectName}`);

        const prompt = `${this.getPrompt()}

Project: ${projectName}
Description: ${description}
Blueprint: ${blueprint}
Features: ${features.join(', ')}

Generate a comprehensive README.md file for this project.`;

        const models = ['gpt-4', 'claude-3', 'gemini-pro'];
        const response = await this.sendRequest(prompt, models);

        return response;
    }

    public async generateApiDocs(apiEndpoints: Array<{ path: string; method: string; description: string }>): Promise<string> {
        this.log('Generating API documentation');

        const endpointsText = apiEndpoints.map(ep =>
            `- ${ep.method.toUpperCase()} ${ep.path}: ${ep.description}`
        ).join('\n');

        const prompt = `Generate comprehensive API documentation for the following endpoints:

${endpointsText}

Include:
- Detailed descriptions
- Request/response examples
- Error codes
- Authentication requirements`;

        const models = ['gpt-4', 'claude-3', 'gemini-pro'];
        const response = await this.sendRequest(prompt, models);

        return response;
    }

    public async generateSetupGuide(dependencies: string[], configSteps: string[]): Promise<string> {
        this.log('Generating setup guide');

        const prompt = `Generate a setup and installation guide with the following information:

Dependencies: ${dependencies.join(', ')}
Configuration Steps: ${configSteps.join(', ')}

Include:
- System requirements
- Step-by-step installation
- Configuration instructions
- Troubleshooting tips
- Verification steps`;

        const models = ['gpt-4', 'claude-3', 'gemini-pro'];
        const response = await this.sendRequest(prompt, models);

        return response;
    }

    public async generateUserGuide(features: string[], examples: Array<{ title: string; description: string; code?: string }>): Promise<string> {
        this.log('Generating user guide');

        const examplesText = examples.map(ex =>
            `### ${ex.title}\n${ex.description}${ex.code ? `\n\`\`\`\n${ex.code}\n\`\`\`` : ''}`
        ).join('\n\n');

        const prompt = `Generate a user guide for the following features:

Features: ${features.join(', ')}

Examples:
${examplesText}

Include:
- Feature descriptions
- Usage examples
- Best practices
- Common use cases`;

        const models = ['gpt-4', 'claude-3', 'gemini-pro'];
        const response = await this.sendRequest(prompt, models);

        return response;
    }

    public async updateDocumentation(existingDocs: string, changes: string[]): Promise<string> {
        this.log('Updating existing documentation');

        const prompt = `Update the following documentation with these changes:

Existing Documentation:
${existingDocs}

Changes to incorporate:
${changes.join('\n')}

Please update the documentation to reflect these changes while maintaining consistency and clarity.`;

        const models = ['gpt-4', 'claude-3', 'gemini-pro'];
        const response = await this.sendRequest(prompt, models);

        return response;
    }
}
