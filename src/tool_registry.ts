import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ToolRegistry {
    private tools: Map<string, Function> = new Map();

    constructor() {
        this.registerDefaultTools();
    }

    private registerDefaultTools(): void {
        this.registerTool('read_file', this.readFile.bind(this));
        this.registerTool('write_file', this.writeFile.bind(this));
        this.registerTool('shell_execute', this.shellExecute.bind(this));
        this.registerTool('run_tests', this.runTests.bind(this));
    }

    public registerTool(name: string, func: Function): void {
        this.tools.set(name, func);
    }

    public getTool(name: string): Function | undefined {
        return this.tools.get(name);
    }

    public listTools(): string[] {
        return Array.from(this.tools.keys());
    }

    private async readFile(filePath: string): Promise<string> {
        try {
            const uri = vscode.Uri.file(filePath);
            const content = await vscode.workspace.fs.readFile(uri);
            return content.toString();
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return `Error reading file: ${error}`;
        }
    }

    private async writeFile(filePath: string, content: string): Promise<string> {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            return `Successfully wrote to ${filePath}`;
        } catch (error) {
            console.error(`Error writing to file ${filePath}:`, error);
            return `Error writing to file: ${error}`;
        }
    }

    private async shellExecute(command: string): Promise<string> {
        try {
            const { stdout, stderr } = await execAsync(command, { cwd: vscode.workspace.rootPath });
            if (stderr) {
                console.error(`Command stderr: ${stderr}`);
            }
            return stdout || stderr;
        } catch (error: any) {
            console.error(`Error executing command: ${error}`);
            return `Error executing command: ${error.message}`;
        }
    }

    private async runTests(testPath: string = ''): Promise<string> {
        try {
            const command = `python3 -m pytest ${testPath}`;
            const { stdout, stderr } = await execAsync(command, { cwd: vscode.workspace.rootPath });

            let output = `--- pytest STDOUT ---\n${stdout}\n`;
            if (stderr) {
                output += `--- pytest STDERR ---\n${stderr}\n`;
            }

            return output;
        } catch (error: any) {
            console.error(`Error running pytest: ${error}`);
            return `Error running pytest: ${error.message}`;
        }
    }
}

// Create a global instance
export const toolRegistry = new ToolRegistry();
