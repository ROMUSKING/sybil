"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsProvider = void 0;
const vscode = __importStar(require("vscode"));
class AnalyticsProvider {
    constructor(context) {
        this.analyticsData = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            averageTaskTime: 0,
            totalApiCalls: 0,
            totalCost: 0
        };
        this.context = context;
        this.loadAnalytics();
    }
    async updateAnalytics(sessionId) {
        // In a real implementation, this would read from the Python backend's analytics
        // For now, we'll simulate updating analytics
        this.analyticsData.totalTasks++;
        this.analyticsData.completedTasks++;
        await this.saveAnalytics();
    }
    showAnalytics() {
        const panel = vscode.window.createWebviewPanel('sybilAnalytics', 'Sybil Analytics', vscode.ViewColumn.One, {});
        panel.webview.html = this.getAnalyticsHtml();
    }
    getAnalyticsData() {
        return { ...this.analyticsData };
    }
    getAnalyticsHtml() {
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
    async saveAnalytics() {
        await this.context.globalState.update('sybil.analytics', this.analyticsData);
    }
    loadAnalytics() {
        const saved = this.context.globalState.get('sybil.analytics');
        if (saved) {
            this.analyticsData = saved;
        }
    }
}
exports.AnalyticsProvider = AnalyticsProvider;
//# sourceMappingURL=analyticsProvider.js.map