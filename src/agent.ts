import { GraphState } from './graph_state';
import { ModelManager } from './model_manager';
import { PerformanceTracker } from './performance_tracker';

export abstract class Agent {
    protected name: string;
    protected modelManager: ModelManager;
    protected performanceTracker: PerformanceTracker;
    protected verbose: boolean;

    constructor(
        name: string,
        modelManager: ModelManager,
        performanceTracker: PerformanceTracker,
        verbose: boolean = false
    ) {
        this.name = name;
        this.modelManager = modelManager;
        this.performanceTracker = performanceTracker;
        this.verbose = verbose;
    }

    public abstract getRole(): string;
    public abstract getPrompt(): string;
    public abstract process(state: GraphState): Promise<GraphState>;

    protected async sendRequest(prompt: string, models: string[]): Promise<string> {
        const startTime = Date.now();
        try {
            const response = await this.modelManager.sendRequest(prompt, models);
            const endTime = Date.now();
            this.performanceTracker.recordPerformance(this.name, endTime - startTime);
            return response;
        } catch (error) {
            const endTime = Date.now();
            this.performanceTracker.recordPerformance(this.name, endTime - startTime);
            throw error;
        }
    }

    protected log(message: string): void {
        if (this.verbose) {
            console.log(`[${this.name}] ${message}`);
        }
    }

    protected extractXmlTag(content: string, tagName: string): string | null {
        const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
        const match = content.match(regex);
        return match && match[1] ? match[1].trim() : null;
    }

    protected extractXmlTags(content: string, tagName: string): string[] {
        const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'gi');
        const matches = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            if (match[1]) {
                matches.push(match[1].trim());
            }
        }
        return matches;
    }

    protected parseTasksFromBlueprint(blueprint: string): Array<{ id: string; description: string; dependencies?: string[] }> {
        const tasks: Array<{ id: string; description: string; dependencies?: string[] }> = [];

        // Extract task elements from blueprint
        const taskRegex = /<task\s+id="([^"]+)"\s+description="([^"]+)"(?:\s+dependencies="([^"]+)")?[^>]*>/gi;
        let match;

        while ((match = taskRegex.exec(blueprint)) !== null) {
            const id = match[1];
            const description = match[2];
            const dependencies = match[3];

            if (id && description) {
                tasks.push({
                    id,
                    description,
                    dependencies: dependencies ? dependencies.split(',').map(d => d.trim()) : undefined
                });
            }
        }

        return tasks;
    }

    protected parseModulesFromBlueprint(blueprint: string): Array<{ name: string; tasks: Array<{ id: string; description: string }>; dependencies?: string[] }> {
        const modules: Array<{ name: string; tasks: Array<{ id: string; description: string }>; dependencies?: string[] }> = [];

        // Extract module elements
        const moduleRegex = /<module\s+name="([^"]+)">(.*?)<\/module>/gis;
        let match;

        while ((match = moduleRegex.exec(blueprint)) !== null) {
            const name = match[1];
            const moduleContent = match[2];

            if (!name || !moduleContent) continue;

            // Extract dependencies
            const depMatch = moduleContent.match(/<dependencies>(.*?)<\/dependencies>/is);
            const dependencies = depMatch && depMatch[1] ? this.extractXmlTags(depMatch[1], 'dependency') : undefined;

            // Extract tasks
            const tasks: Array<{ id: string; description: string }> = [];
            const taskRegex = /<task\s+id="([^"]+)"\s+description="([^"]+)"[^>]*>/gi;
            let taskMatch;

            while ((taskMatch = taskRegex.exec(moduleContent)) !== null) {
                const id = taskMatch[1];
                const description = taskMatch[2];

                if (id && description) {
                    tasks.push({ id, description });
                }
            }

            modules.push({
                name,
                tasks,
                dependencies
            });
        }

        return modules;
    }

    protected validateResponse(response: string): boolean {
        // Basic validation - check if response is not empty and contains expected content
        return response.trim().length > 0;
    }

    protected sanitizeInput(input: string): string {
        // Remove potentially harmful content or escape special characters
        return input.replace(/[<>\"'&]/g, (match) => {
            const entityMap: { [key: string]: string } = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '&': '&amp;'
            };
            return entityMap[match] || match;
        });
    }
}
