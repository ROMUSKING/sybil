"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorAgent = void 0;
const software_architect_agent_1 = require("./software_architect_agent");
const developer_agent_1 = require("./developer_agent");
const reviewer_agent_1 = require("./reviewer_agent");
const documenter_agent_1 = require("./documenter_agent");
class OrchestratorAgent {
    constructor(modelManager, performanceTracker, toolRegistry, verbose = false) {
        this.architectAgent = new software_architect_agent_1.SoftwareArchitectAgent(modelManager, performanceTracker, verbose);
        this.developerAgent = new developer_agent_1.DeveloperAgent(modelManager, performanceTracker, toolRegistry, verbose);
        this.reviewerAgent = new reviewer_agent_1.ReviewerAgent(modelManager, performanceTracker, verbose);
        this.documenterAgent = new documenter_agent_1.DocumenterAgent(modelManager, performanceTracker, verbose);
        this.verbose = verbose;
    }
    async processRequest(initialRequest) {
        this.log('Starting orchestration for request:', initialRequest);
        // Initialize state
        let state = {
            initial_request: initialRequest,
            task_queue: [],
            status: 'initialized'
        };
        try {
            // Phase 1: Architecture Analysis
            this.log('Phase 1: Architecture Analysis');
            state = await this.architectAgent.process(state);
            state.status = 'architecture_completed';
            // Phase 2: Task Processing
            if (state.tasks && state.tasks.length > 0) {
                this.log('Phase 2: Task Processing');
                state = await this.processTasks(state);
                state.status = 'development_completed';
            }
            // Phase 3: Code Review
            if (state.current_files && state.current_files.length > 0) {
                this.log('Phase 3: Code Review');
                state = await this.reviewerAgent.process(state);
                state.status = 'review_completed';
            }
            // Phase 4: Documentation
            this.log('Phase 4: Documentation');
            state = await this.documenterAgent.process(state);
            state.status = 'documentation_completed';
            this.log('Orchestration completed successfully');
            return state;
        }
        catch (error) {
            this.log('Error during orchestration:', error);
            state.error = error instanceof Error ? error.message : 'Unknown error occurred';
            state.status = 'failed';
            return state;
        }
    }
    async processTasks(state) {
        if (!state.tasks) {
            return state;
        }
        const updatedState = { ...state };
        const completedTasks = [];
        const failedTasks = [];
        for (const task of state.tasks) {
            try {
                this.log(`Processing task: ${task.id} - ${task.description}`);
                // Set current task
                updatedState.current_task = task;
                // Process task with developer agent
                const taskResult = await this.developerAgent.process(updatedState);
                // Update completed files
                if (taskResult.current_files) {
                    updatedState.current_files = [
                        ...(updatedState.current_files || []),
                        ...taskResult.current_files
                    ];
                }
                completedTasks.push(task);
                this.log(`Task ${task.id} completed successfully`);
            }
            catch (error) {
                this.log(`Task ${task.id} failed:`, error);
                failedTasks.push({
                    task,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        // Update task queue status
        updatedState.task_queue = completedTasks.map(task => ({
            ...task,
            status: 'completed'
        })).concat(failedTasks.map(item => ({
            ...item.task,
            status: 'failed',
            error: item.error
        })));
        return updatedState;
    }
    async handleUserFeedback(state, feedback) {
        this.log('Processing user feedback:', feedback);
        // Analyze feedback and determine next steps
        const feedbackAnalysis = await this.analyzeFeedback(feedback);
        let updatedState = { ...state };
        if (feedbackAnalysis.needsRevision) {
            // Handle revision requests
            updatedState = await this.handleRevisionRequest(updatedState, feedbackAnalysis);
        }
        else if (feedbackAnalysis.needsNewFeature) {
            // Handle new feature requests
            updatedState = await this.handleNewFeatureRequest(updatedState, feedbackAnalysis);
        }
        else {
            // Handle general feedback
            updatedState.review_feedback = feedback;
        }
        return updatedState;
    }
    async analyzeFeedback(feedback) {
        const prompt = `Analyze the following user feedback and categorize it:

Feedback: ${feedback}

Determine:
1. Does this require code revisions? (needsRevision)
2. Is this requesting a new feature? (needsNewFeature)
3. What's the priority level? (low/medium/high)
4. What categories does this fall into? (bug, enhancement, documentation, performance, etc.)

Respond in JSON format.`;
        // For now, return a mock analysis
        // In a real implementation, you'd use the model manager
        return {
            needsRevision: feedback.toLowerCase().includes('fix') || feedback.toLowerCase().includes('change'),
            needsNewFeature: feedback.toLowerCase().includes('add') || feedback.toLowerCase().includes('new'),
            priority: feedback.toLowerCase().includes('urgent') ? 'high' : 'medium',
            categories: ['enhancement']
        };
    }
    async handleRevisionRequest(state, analysis) {
        this.log('Handling revision request');
        // Create revision tasks based on feedback
        const revisionTasks = [
            {
                id: 'revision-1',
                description: 'Implement requested revisions',
                context: analysis.feedback || 'General revisions needed'
            }
        ];
        const updatedState = {
            ...state,
            tasks: revisionTasks,
            status: 'revision_pending'
        };
        return updatedState;
    }
    async handleNewFeatureRequest(state, analysis) {
        this.log('Handling new feature request');
        // Add new feature to architecture
        const newFeatureTask = {
            id: 'feature-' + Date.now(),
            description: 'Implement new feature: ' + (analysis.feedback || 'New feature'),
            context: 'New feature implementation'
        };
        const updatedState = {
            ...state,
            tasks: [...(state.tasks || []), newFeatureTask],
            status: 'feature_pending'
        };
        return updatedState;
    }
    getAgentStatus() {
        return {
            architect: this.architectAgent.getRole(),
            developer: this.developerAgent.getRole(),
            reviewer: this.reviewerAgent.getRole(),
            documenter: this.documenterAgent.getRole()
        };
    }
    async getPerformanceReport() {
        // This would aggregate performance data from all agents
        // For now, return a placeholder
        return {
            totalRequests: 0,
            averageResponseTime: 0,
            agentPerformance: {}
        };
    }
    async validateState(state) {
        const errors = [];
        if (!state.initial_request) {
            errors.push('Missing initial request');
        }
        if (state.status === 'failed' && !state.error) {
            errors.push('Failed state should have error message');
        }
        if (state.tasks && state.tasks.length > 0) {
            for (const task of state.tasks) {
                if (!task.id || !task.description) {
                    errors.push(`Invalid task structure: ${JSON.stringify(task)}`);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    log(message, ...args) {
        if (this.verbose) {
            console.log(`[OrchestratorAgent] ${message}`, ...args);
        }
    }
}
exports.OrchestratorAgent = OrchestratorAgent;
//# sourceMappingURL=orchestrator_agent.js.map