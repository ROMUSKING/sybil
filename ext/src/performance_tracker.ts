import * as vscode from 'vscode';
import { PerformanceData } from './graph_state';

export class PerformanceTracker {
    private performanceData: PerformanceData = {};
    private persistenceFile: string;

    constructor(persistenceFile: string = 'performance.yaml') {
        this.persistenceFile = persistenceFile;
        this.loadPerformanceData();
    }

    public recordPerformance(agentName: string, duration: number): void {
        if (!this.performanceData[agentName]) {
            this.performanceData[agentName] = [];
        }
        this.performanceData[agentName].push(duration);
    }

    public getReport(): PerformanceData {
        return this.performanceData;
    }

    public save(): void {
        this.savePerformanceData();
    }

    private async loadPerformanceData(): Promise<void> {
        try {
            const uri = vscode.Uri.file(this.persistenceFile);
            const content = await vscode.workspace.fs.readFile(uri);
            // For now, just parse as JSON. In a real implementation, you'd use a YAML parser
            this.performanceData = JSON.parse(content.toString());
        } catch (error) {
            console.error('Failed to load performance data:', error);
            this.performanceData = {};
        }
    }

    private savePerformanceData(): void {
        try {
            const content = JSON.stringify(this.performanceData, null, 4);
            vscode.workspace.fs.writeFile(
                vscode.Uri.file(this.persistenceFile),
                Buffer.from(content, 'utf8')
            );
        } catch (error) {
            console.error('Failed to save performance data:', error);
        }
    }
}
