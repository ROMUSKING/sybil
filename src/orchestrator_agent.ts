import { GraphState } from './graph_state';
import { SoftwareArchitectAgent } from './software_architect_agent';
import { DeveloperAgent } from './developer_agent';
import { ReviewerAgent } from './reviewer_agent';
import { DocumenterAgent } from './documenter_agent';
import { ModelManager } from './model_manager';
import { PerformanceTracker } from './performance_tracker';
import { ToolRegistry } from './tool_registry';

export class OrchestratorAgent {
    private architectAgent: SoftwareArchitectAgent;
    private developerAgent: DeveloperAgent;
    private reviewerAgent: ReviewerAgent;
    private documenterAgent: DocumenterAgent;
    private verbose: boolean;

    constructor(
        modelManager: ModelManager,
        performanceTracker: PerformanceTracker,
        toolRegistry: ToolRegistry,
        verbose: boolean = false
    ) {
        this.architectAgent = new SoftwareArchitectAgent(modelManager, performanceTracker, verbose);
        this.developerAgent = new DeveloperAgent(modelManager, performanceTracker, toolRegistry, verbose);
        this.reviewerAgent = new ReviewerAgent(modelManager, performanceTracker, verbose);
        this.documenterAgent = new DocumenterAgent(modelManager, performanceTracker, verbose);
        this.verbose = verbose;
    }

    public async processRequest(initialRequest: string): Promise<GraphState> {
        this.log('Starting orchestration for request:', initialRequest);

        // Initialize state
        let state: GraphState = {
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

        } catch (error) {
            this.log('Error during orchestration:', error);
            state.error = error instanceof Error ? error.message : 'Unknown error occurred';
            state.status = 'failed';
            return state;
        }
    }

    private async processTasks(state: GraphState): Promise<GraphState> {
        if (!state.tasks) {
            return state;
        }

        const updatedState = { ...state };
        const completedTasks: any[] = [];
        const failedTasks: any[] = [];

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

            } catch (error) {
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

    public async handleUserFeedback(state: GraphState, feedback: string): Promise<GraphState> {
        this.log('Processing user feedback:', feedback);

        // Analyze feedback and determine next steps
        const feedbackAnalysis = await this.analyzeFeedback(feedback);

        let updatedState = { ...state };

        if (feedbackAnalysis.needsRevision) {
            // Handle revision requests
            updatedState = await this.handleRevisionRequest(updatedState, feedbackAnalysis);
        } else if (feedbackAnalysis.needsNewFeature) {
            // Handle new feature requests
            updatedState = await this.handleNewFeatureRequest(updatedState, feedbackAnalysis);
        } else {
            // Handle general feedback
            updatedState.review_feedback = feedback;
        }

        return updatedState;
    }

    private async analyzeFeedback(feedback: string): Promise<{
        needsRevision: boolean;
        needsNewFeature: boolean;
        priority: 'low' | 'medium' | 'high';
        categories: string[];
    }> {
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

    private async handleRevisionRequest(state: GraphState, analysis: any): Promise<GraphState> {
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

    private async handleNewFeatureRequest(state: GraphState, analysis: any): Promise<GraphState> {
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

    public getAgentStatus(): {
        architect: string;
        developer: string;
        reviewer: string;
        documenter: string;
    } {
        return {
            architect: this.architectAgent.getRole(),
            developer: this.developerAgent.getRole(),
            reviewer: this.reviewerAgent.getRole(),
            documenter: this.documenterAgent.getRole()
        };
    }

    public async getPerformanceReport(): Promise<any> {
        // This would aggregate performance data from all agents
        // For now, return a placeholder
        return {
            totalRequests: 0,
            averageResponseTime: 0,
            agentPerformance: {}
        };
    }

    public async validateState(state: GraphState): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];

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

    private log(message: string, ...args: any[]): void {
        if (this.verbose) {
            console.log(`[OrchestratorAgent] ${message}`, ...args);
        }
    }
}
