import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class AnalyticsProvider {
    private context: vscode.ExtensionContext;
    private analyticsData: AnalyticsData = {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageTaskTime: 0,
        totalApiCalls: 0,
        totalCost: 0
    };

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadAnalytics();
    }

    public async updateAnalytics(sessionId: string): Promise<void> {
        // In a real implementation, this would read from the Python backend's analytics
        // For now, we'll simulate updating analytics
        this.analyticsData.totalTasks++;
        this.analyticsData.completedTasks++;

        await this.saveAnalytics();
    }

    public showAnalytics(): void {
        const panel = vscode.window.createWebviewPanel(
            'sybilAnalytics',
            'Sybil Analytics',
            vscode.ViewColumn.One,
            {}
        );

        panel.webview.html = this.getAnalyticsHtml();
    }

    public getAnalyticsData(): AnalyticsData {
        return { ...this.analyticsData };
    }

    private getAnalyticsHtml(): string {
        const data = this.analyticsData;
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Sybil Analytics</title>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 20px; }
                    .metric { margin: 10px 0; padding: 10px; border: 1px solid var(--vscode-panel-border); }
                    .metric h3 { margin: 0 0 5px 0; }
                    .metric .value { font-size: 24px; font-weight: bold; color: var(--vscode-text-link-foreground); }
                </style>
            </head>
            <body>
                <h1>Sybil Analytics Dashboard</h1>

                <div class="metric">
                    <h3>Total Tasks</h3>
                    <div class="value">${data.totalTasks}</div>
                </div>

                <div class="metric">
                    <h3>Completed Tasks</h3>
                    <div class="value">${data.completedTasks}</div>
                </div>

                <div class="metric">
                    <h3>Failed Tasks</h3>
                    <div class="value">${data.failedTasks}</div>
                </div>

                <div class="metric">
                    <h3>Average Task Time</h3>
                    <div class="value">${data.averageTaskTime.toFixed(2)}s</div>
                </div>

                <div class="metric">
                    <h3>Total API Calls</h3>
                    <div class="value">${data.totalApiCalls}</div>
                </div>

                <div class="metric">
                    <h3>Total Cost</h3>
                    <div class="value">$${data.totalCost.toFixed(4)}</div>
                </div>
            </body>
            </html>
        `;
    }

    private async saveAnalytics(): Promise<void> {
        await this.context.globalState.update('sybil.analytics', this.analyticsData);
    }

    private loadAnalytics(): void {
        const saved = this.context.globalState.get('sybil.analytics');
        if (saved) {
            this.analyticsData = saved as AnalyticsData;
        }
    }
}

interface AnalyticsData {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageTaskTime: number;
    totalApiCalls: number;
    totalCost: number;
}
