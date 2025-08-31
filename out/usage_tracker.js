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
exports.UsageTracker = void 0;
const vscode = __importStar(require("vscode"));
class UsageTracker {
    constructor(persistenceFile) {
        this.usageData = {};
        this.persistenceFile = persistenceFile;
        if (this.persistenceFile) {
            this.loadFromFile();
        }
    }
    recordUsage(provider, model, inputTokens, outputTokens, cost) {
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
    getUsage(provider) {
        return this.usageData[provider] || {};
    }
    getTotalTokens(provider, model) {
        const providerUsage = this.usageData[provider];
        if (!providerUsage)
            return [0, 0];
        const modelUsage = providerUsage[model];
        if (!modelUsage)
            return [0, 0];
        return [
            modelUsage.total_input_tokens,
            modelUsage.total_output_tokens
        ];
    }
    getTotalCost() {
        let totalCost = 0;
        for (const provider of Object.values(this.usageData)) {
            for (const model of Object.values(provider)) {
                totalCost += model.total_cost;
            }
        }
        return totalCost;
    }
    saveToFile() {
        if (!this.persistenceFile)
            return;
        try {
            const content = JSON.stringify(this.usageData, null, 4);
            vscode.workspace.fs.writeFile(vscode.Uri.file(this.persistenceFile), Buffer.from(content, 'utf8'));
        }
        catch (error) {
            console.error('Failed to save usage data:', error);
        }
    }
    async loadFromFile() {
        if (!this.persistenceFile)
            return;
        try {
            const uri = vscode.Uri.file(this.persistenceFile);
            const content = await vscode.workspace.fs.readFile(uri);
            this.usageData = JSON.parse(content.toString());
        }
        catch (error) {
            console.error('Failed to load usage data:', error);
            this.usageData = {};
        }
    }
}
exports.UsageTracker = UsageTracker;
//# sourceMappingURL=usage_tracker.js.map