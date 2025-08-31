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
exports.toolRegistry = exports.ToolRegistry = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.registerDefaultTools();
    }
    registerDefaultTools() {
        this.registerTool('read_file', this.readFile.bind(this));
        this.registerTool('write_file', this.writeFile.bind(this));
        this.registerTool('shell_execute', this.shellExecute.bind(this));
        this.registerTool('run_tests', this.runTests.bind(this));
    }
    registerTool(name, func) {
        this.tools.set(name, func);
    }
    getTool(name) {
        return this.tools.get(name);
    }
    listTools() {
        return Array.from(this.tools.keys());
    }
    async readFile(filePath) {
        try {
            const uri = vscode.Uri.file(filePath);
            const content = await vscode.workspace.fs.readFile(uri);
            return content.toString();
        }
        catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return `Error reading file: ${error}`;
        }
    }
    async writeFile(filePath, content) {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            return `Successfully wrote to ${filePath}`;
        }
        catch (error) {
            console.error(`Error writing to file ${filePath}:`, error);
            return `Error writing to file: ${error}`;
        }
    }
    async shellExecute(command) {
        try {
            const { stdout, stderr } = await execAsync(command, { cwd: vscode.workspace.rootPath });
            if (stderr) {
                console.error(`Command stderr: ${stderr}`);
            }
            return stdout || stderr;
        }
        catch (error) {
            console.error(`Error executing command: ${error}`);
            return `Error executing command: ${error.message}`;
        }
    }
    async runTests(testPath = '') {
        try {
            const command = `python3 -m pytest ${testPath}`;
            const { stdout, stderr } = await execAsync(command, { cwd: vscode.workspace.rootPath });
            let output = `--- pytest STDOUT ---\n${stdout}\n`;
            if (stderr) {
                output += `--- pytest STDERR ---\n${stderr}\n`;
            }
            return output;
        }
        catch (error) {
            console.error(`Error running pytest: ${error}`);
            return `Error running pytest: ${error.message}`;
        }
    }
}
exports.ToolRegistry = ToolRegistry;
// Create a global instance
exports.toolRegistry = new ToolRegistry();
//# sourceMappingURL=tool_registry.js.map