import * as vscode from 'vscode';
import * as path from 'path';

export class FileManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Read file content using VS Code workspace API
     */
    public async readFile(filePath: string): Promise<string> {
        try {
            const uri = vscode.Uri.file(filePath);
            const content = await vscode.workspace.fs.readFile(uri);
            return content.toString();
        } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error}`);
        }
    }

    /**
     * Write content to file using VS Code workspace API
     */
    public async writeFile(filePath: string, content: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        } catch (error) {
            throw new Error(`Failed to write file ${filePath}: ${error}`);
        }
    }

    /**
     * Create a new file with content
     */
    public async createFile(filePath: string, content: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        } catch (error) {
            throw new Error(`Failed to create file ${filePath}: ${error}`);
        }
    }

    /**
     * Delete a file
     */
    public async deleteFile(filePath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.workspace.fs.delete(uri);
        } catch (error) {
            throw new Error(`Failed to delete file ${filePath}: ${error}`);
        }
    }

    /**
     * Check if file exists
     */
    public async fileExists(filePath: string): Promise<boolean> {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get file stats
     */
    public async getFileStats(filePath: string): Promise<vscode.FileStat> {
        try {
            const uri = vscode.Uri.file(filePath);
            return await vscode.workspace.fs.stat(uri);
        } catch (error) {
            throw new Error(`Failed to get stats for file ${filePath}: ${error}`);
        }
    }

    /**
     * Read directory contents
     */
    public async readDirectory(dirPath: string): Promise<[string, vscode.FileType][]> {
        try {
            const uri = vscode.Uri.file(dirPath);
            return await vscode.workspace.fs.readDirectory(uri);
        } catch (error) {
            throw new Error(`Failed to read directory ${dirPath}: ${error}`);
        }
    }

    /**
     * Create directory
     */
    public async createDirectory(dirPath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(dirPath);
            await vscode.workspace.fs.createDirectory(uri);
        } catch (error) {
            throw new Error(`Failed to create directory ${dirPath}: ${error}`);
        }
    }

    /**
     * Get workspace folder
     */
    public getWorkspaceFolder(): string | undefined {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        return workspaceFolder?.uri.fsPath;
    }

    /**
     * Resolve path relative to workspace
     */
    public resolveWorkspacePath(relativePath: string): string {
        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        return path.join(workspaceFolder, relativePath);
    }

    /**
     * Open file in editor
     */
    public async openFile(filePath: string): Promise<vscode.TextEditor> {
        const uri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        return await vscode.window.showTextDocument(document);
    }

    /**
     * Apply edits to a document
     */
    public async applyEdits(filePath: string, edits: vscode.TextEdit[]): Promise<void> {
        const uri = vscode.Uri.file(filePath);
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(uri, edits);
        await vscode.workspace.applyEdit(workspaceEdit);
    }

    /**
     * Get active text editor
     */
    public getActiveTextEditor(): vscode.TextEditor | undefined {
        return vscode.window.activeTextEditor;
    }

    /**
     * Get all open text documents
     */
    public getOpenDocuments(): readonly vscode.TextDocument[] {
        return vscode.workspace.textDocuments;
    }

    /**
     * Watch file changes
     */
    public watchFile(filePath: string, callback: (uri: vscode.Uri) => void): vscode.FileSystemWatcher {
        const watcher = vscode.workspace.createFileSystemWatcher(filePath);
        watcher.onDidChange(callback);
        watcher.onDidCreate(callback);
        watcher.onDidDelete(callback);
        return watcher;
    }

    /**
     * Find files by pattern
     */
    public async findFiles(pattern: string, exclude?: string): Promise<vscode.Uri[]> {
        return await vscode.workspace.findFiles(pattern, exclude);
    }

    /**
     * Get relative path from workspace
     */
    public getRelativePath(filePath: string): string {
        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            return filePath;
        }
        return path.relative(workspaceFolder, filePath);
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Clean up any watchers or resources if needed
    }
}
