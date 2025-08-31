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
exports.FileManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class FileManager {
    constructor(context) {
        this.context = context;
    }
    /**
     * Read file content using VS Code workspace API
     */
    async readFile(filePath) {
        try {
            const uri = vscode.Uri.file(filePath);
            const content = await vscode.workspace.fs.readFile(uri);
            return content.toString();
        }
        catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error}`);
        }
    }
    /**
     * Write content to file using VS Code workspace API
     */
    async writeFile(filePath, content) {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        }
        catch (error) {
            throw new Error(`Failed to write file ${filePath}: ${error}`);
        }
    }
    /**
     * Create a new file with content
     */
    async createFile(filePath, content) {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        }
        catch (error) {
            throw new Error(`Failed to create file ${filePath}: ${error}`);
        }
    }
    /**
     * Delete a file
     */
    async deleteFile(filePath) {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.workspace.fs.delete(uri);
        }
        catch (error) {
            throw new Error(`Failed to delete file ${filePath}: ${error}`);
        }
    }
    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.workspace.fs.stat(uri);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get file stats
     */
    async getFileStats(filePath) {
        try {
            const uri = vscode.Uri.file(filePath);
            return await vscode.workspace.fs.stat(uri);
        }
        catch (error) {
            throw new Error(`Failed to get stats for file ${filePath}: ${error}`);
        }
    }
    /**
     * Read directory contents
     */
    async readDirectory(dirPath) {
        try {
            const uri = vscode.Uri.file(dirPath);
            return await vscode.workspace.fs.readDirectory(uri);
        }
        catch (error) {
            throw new Error(`Failed to read directory ${dirPath}: ${error}`);
        }
    }
    /**
     * Create directory
     */
    async createDirectory(dirPath) {
        try {
            const uri = vscode.Uri.file(dirPath);
            await vscode.workspace.fs.createDirectory(uri);
        }
        catch (error) {
            throw new Error(`Failed to create directory ${dirPath}: ${error}`);
        }
    }
    /**
     * Get workspace folder
     */
    getWorkspaceFolder() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        return workspaceFolder?.uri.fsPath;
    }
    /**
     * Resolve path relative to workspace
     */
    resolveWorkspacePath(relativePath) {
        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        return path.join(workspaceFolder, relativePath);
    }
    /**
     * Open file in editor
     */
    async openFile(filePath) {
        const uri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        return await vscode.window.showTextDocument(document);
    }
    /**
     * Apply edits to a document
     */
    async applyEdits(filePath, edits) {
        const uri = vscode.Uri.file(filePath);
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(uri, edits);
        await vscode.workspace.applyEdit(workspaceEdit);
    }
    /**
     * Get active text editor
     */
    getActiveTextEditor() {
        return vscode.window.activeTextEditor;
    }
    /**
     * Get all open text documents
     */
    getOpenDocuments() {
        return vscode.workspace.textDocuments;
    }
    /**
     * Watch file changes
     */
    watchFile(filePath, callback) {
        const watcher = vscode.workspace.createFileSystemWatcher(filePath);
        watcher.onDidChange(callback);
        watcher.onDidCreate(callback);
        watcher.onDidDelete(callback);
        return watcher;
    }
    /**
     * Find files by pattern
     */
    async findFiles(pattern, exclude) {
        return await vscode.workspace.findFiles(pattern, exclude);
    }
    /**
     * Get relative path from workspace
     */
    getRelativePath(filePath) {
        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            return filePath;
        }
        return path.relative(workspaceFolder, filePath);
    }
    /**
     * Dispose of resources
     */
    dispose() {
        // Clean up any watchers or resources if needed
    }
}
exports.FileManager = FileManager;
//# sourceMappingURL=fileManager.js.map