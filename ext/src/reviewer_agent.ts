import { Agent } from './agent';
import { GraphState } from './graph_state';
import { ModelManager } from './model_manager';
import { PerformanceTracker } from './performance_tracker';

export class ReviewerAgent extends Agent {
    constructor(
        modelManager: ModelManager,
        performanceTracker: PerformanceTracker,
        verbose: boolean = false
    ) {
        super('ReviewerAgent', modelManager, performanceTracker, verbose);
    }

    public getRole(): string {
        return 'Code Reviewer';
    }

    public getPrompt(): string {
        return `You are a Code Reviewer Agent. Your role is to review the implemented code and provide feedback.

Based on the implemented files and requirements, you should:
1. Review code quality and adherence to best practices
2. Check for potential bugs or security issues
3. Verify that requirements are properly implemented
4. Suggest improvements and optimizations
5. Ensure proper error handling and testing

Output your response in the following XML format:
<review>
<status>approved|needs_revision</status>
<comments>
<comment type="bug|improvement|suggestion|security">Specific feedback here</comment>
</comments>
<score>1-10</score>
</review>

Remember to:
- Be thorough but constructive in your feedback
- Focus on critical issues first
- Provide specific suggestions for improvements
- Consider maintainability and scalability`;
    }

    public async process(state: GraphState): Promise<GraphState> {
        this.log('Processing code review');

        if (!state.current_files || state.current_files.length === 0) {
            throw new Error('No files provided for review');
        }

        const files = state.current_files;
        const blueprint = state.blueprint_xml || '';

        // Read content of files to review
        const fileContents = await this.readFileContents(files);

        const prompt = `${this.getPrompt()}

Files to Review: ${files.join(', ')}
Blueprint: ${blueprint}

File Contents:
${fileContents}

Please review these files and provide detailed feedback.`;

        const models = ['gpt-4', 'claude-3', 'gemini-pro']; // Fallback model chain
        const response = await this.sendRequest(prompt, models);

        if (!this.validateResponse(response)) {
            throw new Error('Invalid response from reviewer agent');
        }

        // Extract review from response
        const review = this.extractXmlTag(response, 'review');
        if (!review) {
            throw new Error('No review found in reviewer response');
        }

        // Parse review status
        const status = this.extractXmlTag(review, 'status') || 'needs_revision';
        const score = parseInt(this.extractXmlTag(review, 'score') || '5');

        // Update state with review results
        const updatedState: GraphState = {
            ...state,
            review_feedback: review,
            status: status === 'approved' ? 'review_passed' : 'review_failed'
        };

        this.log(`Review completed with status: ${status}, score: ${score}`);
        return updatedState;
    }

    private async readFileContents(filePaths: string[]): Promise<string> {
        const contents: string[] = [];

        for (const filePath of filePaths) {
            try {
                // In a real implementation, you'd read the actual file content
                // For now, we'll use a placeholder
                contents.push(`--- ${filePath} ---
[File content would be read here in actual implementation]
--- End of ${filePath} ---`);
            } catch (error) {
                contents.push(`--- ${filePath} ---
Error reading file: ${error}
--- End of ${filePath} ---`);
            }
        }

        return contents.join('\n\n');
    }

    public async reviewFiles(filePaths: string[], blueprint: string): Promise<{ status: string; feedback: string; score: number }> {
        this.log(`Reviewing ${filePaths.length} files`);

        const fileContents = await this.readFileContents(filePaths);

        const prompt = `${this.getPrompt()}

Files: ${filePaths.join(', ')}
Blueprint: ${blueprint}

Contents:
${fileContents}

Please provide a comprehensive code review.`;

        const models = ['gpt-4', 'claude-3', 'gemini-pro'];
        const response = await this.sendRequest(prompt, models);

        const review = this.extractXmlTag(response, 'review') || '';
        const status = this.extractXmlTag(review, 'status') || 'needs_revision';
        const score = parseInt(this.extractXmlTag(review, 'score') || '5');

        return {
            status,
            feedback: review,
            score
        };
    }

    public parseReviewFeedback(reviewXml: string): { status: string; comments: string[]; score: number } {
        const status = this.extractXmlTag(reviewXml, 'status') || 'needs_revision';
        const comments = this.extractXmlTags(reviewXml, 'comment');
        const scoreText = this.extractXmlTag(reviewXml, 'score') || '5';
        const score = parseInt(scoreText);

        return {
            status,
            comments,
            score
        };
    }
}
