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
exports.PerformanceTracker = void 0;
const vscode = __importStar(require("vscode"));
class PerformanceTracker {
    constructor(persistenceFile = 'performance.yaml') {
        this.performanceData = {};
        this.persistenceFile = persistenceFile;
        this.loadPerformanceData();
    }
    recordPerformance(agentName, duration) {
        if (!this.performanceData[agentName]) {
            this.performanceData[agentName] = [];
        }
        this.performanceData[agentName].push(duration);
    }
    getReport() {
        return this.performanceData;
    }
    save() {
        this.savePerformanceData();
    }
    async loadPerformanceData() {
        try {
            const uri = vscode.Uri.file(this.persistenceFile);
            const content = await vscode.workspace.fs.readFile(uri);
            // For now, just parse as JSON. In a real implementation, you'd use a YAML parser
            this.performanceData = JSON.parse(content.toString());
        }
        catch (error) {
            console.error('Failed to load performance data:', error);
            this.performanceData = {};
        }
    }
    savePerformanceData() {
        try {
            const content = JSON.stringify(this.performanceData, null, 4);
            vscode.workspace.fs.writeFile(vscode.Uri.file(this.persistenceFile), Buffer.from(content, 'utf8'));
        }
        catch (error) {
            console.error('Failed to save performance data:', error);
        }
    }
}
exports.PerformanceTracker = PerformanceTracker;
//# sourceMappingURL=performance_tracker.js.map