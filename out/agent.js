"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
class Agent {
    constructor(name, modelManager, performanceTracker, verbose = false) {
        this.name = name;
        this.modelManager = modelManager;
        this.performanceTracker = performanceTracker;
        this.verbose = verbose;
    }
    async sendRequest(prompt, models) {
        const startTime = Date.now();
        try {
            const response = await this.modelManager.sendRequest(prompt, models);
            const endTime = Date.now();
            this.performanceTracker.recordPerformance(this.name, endTime - startTime);
            return response;
        }
        catch (error) {
            const endTime = Date.now();
            this.performanceTracker.recordPerformance(this.name, endTime - startTime);
            throw error;
        }
    }
    log(message) {
        if (this.verbose) {
            console.log(`[${this.name}] ${message}`);
        }
    }
    extractXmlTag(content, tagName) {
        const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
        const match = content.match(regex);
        return match && match[1] ? match[1].trim() : null;
    }
    extractXmlTags(content, tagName) {
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
    parseTasksFromBlueprint(blueprint) {
        const tasks = [];
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
    parseModulesFromBlueprint(blueprint) {
        const modules = [];
        // Extract module elements
        const moduleRegex = /<module\s+name="([^"]+)">(.*?)<\/module>/gis;
        let match;
        while ((match = moduleRegex.exec(blueprint)) !== null) {
            const name = match[1];
            const moduleContent = match[2];
            if (!name || !moduleContent)
                continue;
            // Extract dependencies
            const depMatch = moduleContent.match(/<dependencies>(.*?)<\/dependencies>/is);
            const dependencies = depMatch && depMatch[1] ? this.extractXmlTags(depMatch[1], 'dependency') : undefined;
            // Extract tasks
            const tasks = [];
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
    validateResponse(response) {
        // Basic validation - check if response is not empty and contains expected content
        return response.trim().length > 0;
    }
    sanitizeInput(input) {
        // Remove potentially harmful content or escape special characters
        return input.replace(/[<>"'&]/g, (match) => {
            const entityMap = {
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
exports.Agent = Agent;
//# sourceMappingURL=agent.js.map