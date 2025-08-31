import * as vscode from 'vscode';
import { UsageData } from './graph_state';

export class UsageTracker {
    private usageData: UsageData = {};
    private persistenceFile?: string;

    constructor(persistenceFile?: string) {
        this.persistenceFile = persistenceFile;
        if (this.persistenceFile) {
            this.loadFromFile();
        }
    }

    public recordUsage(provider: string, model: string, inputTokens: number, outputTokens: number, cost: number): void {
        if (!this.usageData[provider]) {
            this.usageData[provider] = {};
        }

        if (!this.usageData[provider][model]) {
            this.usageData[provider][model] = {
                total_input_tokens: 0,
                total_output_tokens: 0,
                total_cost: 0,
                requests: []
            };
        }

        const modelData = this.usageData[provider][model];
        modelData.total_input_tokens += inputTokens;
        modelData.total_output_tokens += outputTokens;
        modelData.total_cost += cost;

        modelData.requests.push({
            timestamp: new Date().toISOString(),
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cost: cost
        });

        if (this.persistenceFile) {
            this.saveToFile();
        }
    }

    public getUsage(provider: string): any {
        return this.usageData[provider] || {};
    }

    public getTotalTokens(provider: string, model: string): [number, number] {
        const providerUsage = this.usageData[provider];
        if (!providerUsage) return [0, 0];

        const modelUsage = providerUsage[model];
        if (!modelUsage) return [0, 0];

        return [
            modelUsage.total_input_tokens,
            modelUsage.total_output_tokens
        ];
    }

    public getTotalCost(): number {
        let totalCost = 0;
        for (const provider of Object.values(this.usageData)) {
            for (const model of Object.values(provider)) {
                totalCost += model.total_cost;
            }
        }
        return totalCost;
    }

    private saveToFile(): void {
        if (!this.persistenceFile) return;

        try {
            const content = JSON.stringify(this.usageData, null, 4);
            vscode.workspace.fs.writeFile(
                vscode.Uri.file(this.persistenceFile),
                Buffer.from(content, 'utf8')
            );
        } catch (error) {
            console.error('Failed to save usage data:', error);
        }
    }

    private async loadFromFile(): Promise<void> {
        if (!this.persistenceFile) return;

        try {
            const uri = vscode.Uri.file(this.persistenceFile);
            const content = await vscode.workspace.fs.readFile(uri);
            this.usageData = JSON.parse(content.toString());
        } catch (error) {
            console.error('Failed to load usage data:', error);
            this.usageData = {};
        }
    }
}
