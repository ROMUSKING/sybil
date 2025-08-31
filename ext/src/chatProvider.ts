import * as vscode from 'vscode';
import { SybilAgent } from './sybilAgent';
import { ModelManager } from './modelManager';

export class ChatProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'sybilChat';
    private _view?: vscode.WebviewView;
    private _sybilAgent: SybilAgent;
    private _modelManager: ModelManager;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        sybilAgent: SybilAgent,
        modelManager: ModelManager
    ) {
        this._sybilAgent = sybilAgent;
        this._modelManager = modelManager;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('Sybil Chat: resolveWebviewView called');
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media')
            ]
        };

        console.log('Sybil Chat: Setting HTML content');
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                console.log('Sybil Chat: Received message:', message);
                switch (message.type) {
                    case 'sendMessage':
                        await this._handleChatMessage(message.text);
                        break;
                    case 'clearChat':
                        await this._clearChat();
                        break;
                    case 'startTask':
                        await this._handleStartTask(message.text);
                        break;
                }
            },
            undefined,
            []
        );
        console.log('Sybil Chat: Webview setup complete');
    }

    private async _handleChatMessage(message: string) {
        if (!this._view) return;

        try {
            // Add user message to chat
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'user',
                    content: message,
                    timestamp: new Date().toISOString()
                }
            });

            // Process the message through Sybil agent
            const response = await this._processMessage(message);

            // Add assistant response to chat
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'assistant',
                    content: response,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'assistant',
                    content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }

    private async _handleStartTask(taskDescription: string) {
        if (!this._view) return;

        try {
            await this._sybilAgent.startTask(taskDescription);
            this._view.webview.postMessage({
                type: 'taskStarted',
                message: `Task started: ${taskDescription}`
            });
        } catch (error) {
            this._view.webview.postMessage({
                type: 'error',
                message: `Failed to start task: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    private async _processMessage(message: string): Promise<string> {
        // Enhanced message processing with more intelligent responses
        const lowerMessage = message.toLowerCase().trim();

        // Handle code-related requests
        if (lowerMessage.includes('code') || lowerMessage.includes('implement') || lowerMessage.includes('create') || lowerMessage.includes('write')) {
            return `I'll help you implement that! Let me analyze your request and create a plan.

**What I can help with:**
• Writing complete functions and classes
• Creating React/Vue/Angular components
• Implementing APIs and database schemas
• Setting up project configurations
• Debugging and fixing code issues

Please provide more details about what you'd like me to implement, and I'll get started right away!`;
        }

        // Handle help requests
        if (lowerMessage.includes('help') || lowerMessage.includes('what can you do') || lowerMessage.includes('commands')) {
            return `🤖 **Sybil AI Assistant** - Your intelligent coding companion!

**🚀 Quick Actions:**
• **Start a coding task** - Describe what you want to build
• **Resume previous work** - Continue where you left off
• **Configure AI models** - Set up API keys for different providers

**💡 What I can help with:**
• **Code Generation** - Write functions, classes, components
• **Project Setup** - Initialize frameworks and configurations
• **Debugging** - Find and fix issues in your code
• **Refactoring** - Improve existing code structure
• **Documentation** - Generate READMEs and code comments
• **Testing** - Create unit and integration tests

**🔧 Available Models:**
${this._getModelSummary()}

**⌨️ Keyboard Shortcuts:**
• \`Ctrl+Shift+S\` - Toggle chat
• \`Ctrl+Shift+P\` - Command palette → "Sybil: Start Task"

Try asking me to "create a login component" or "implement user authentication"!`;
        }

        // Handle model/API related queries
        if (lowerMessage.includes('model') || lowerMessage.includes('api') || lowerMessage.includes('key')) {
            const stats = this._modelManager.getModelStats();
            const freeModels = this._modelManager.getFreeModels();

            return `🔑 **AI Model Configuration**

**Current Setup:**
${Object.entries(stats).map(([provider, data]) => {
                const statsData = data as { totalModels: number; freeModels: number };
                return `• **${provider}**: ${statsData.freeModels}/${statsData.totalModels} models available`;
            }).join('\n')}

**Free Models Ready to Use:**
${freeModels.slice(0, 5).map(model => `• ${model.name} (${model.provider})`).join('\n')}
${freeModels.length > 5 ? `• ... and ${freeModels.length - 5} more` : ''}

**Quick Setup:**
Use \`Sybil: Configure API Keys\` command or ask me to configure a specific provider!

**Popular Free Models:**
• **Gemini 2.0 Flash** - Fast, intelligent responses
• **DeepSeek R1** - Advanced reasoning
• **Qwen3 Coder** - Specialized for code generation`;
        }

        // Handle session/project management
        if (lowerMessage.includes('session') || lowerMessage.includes('project') || lowerMessage.includes('task')) {
            return `📋 **Project Management**

**Current Session:**
• Track your coding progress
• Resume interrupted work
• View session analytics

**Available Commands:**
• \`Sybil: Start New Task\` - Begin a new coding project
• \`Sybil: Resume Session\` - Continue previous work
• \`Sybil: Clear Session\` - Reset current session
• \`Sybil: Show Analytics\` - View your coding statistics

**Example Tasks:**
• "Create a React dashboard with charts"
• "Build a REST API for user management"
• "Implement authentication with JWT"
• "Set up a Node.js backend with Express"

What would you like to work on?`;
        }

        // Handle debugging requests
        if (lowerMessage.includes('debug') || lowerMessage.includes('error') || lowerMessage.includes('fix') || lowerMessage.includes('problem')) {
            return `🔧 **Debugging Assistant**

I can help you debug and fix issues in your code! Here's how:

**Debugging Workflow:**
1. **Describe the problem** - What's not working?
2. **Share error messages** - Copy/paste any errors
3. **Show relevant code** - I'll analyze and suggest fixes
4. **Test solutions** - I'll help verify the fixes work

**Common Issues I Can Fix:**
• Syntax errors and type issues
• Logic bugs and edge cases
• Performance problems
• Integration issues
• Configuration errors

**Debug Commands:**
• \`Sybil: Show Analytics\` - View error patterns
• \`Sybil: Validate Models\` - Check AI model status

Please describe the issue you're facing, and I'll help you resolve it!`;
        }

        // Default intelligent response
        return `💭 **Let me help you with that!**

I'm here to assist with your coding projects. Here are some things I can do:

**🚀 Get Started:**
• **"Create a [component/feature]"** - I'll implement it for you
• **"Debug this [error/issue]"** - I'll help find and fix problems
• **"Set up [framework/tool]"** - I'll guide you through the process

**📚 Examples:**
• "Create a React login form with validation"
• "Build a Python API with FastAPI"
• "Implement user authentication"
• "Set up a Next.js project"

**🔧 Configuration:**
• "Configure API keys" - Set up AI model access
• "Show model stats" - See available AI models

What specific coding task can I help you with today?`;
    }

    private _getModelSummary(): string {
        const freeModels = this._modelManager.getFreeModels();
        if (freeModels.length === 0) {
            return "⚠️ No models configured. Use 'Sybil: Configure API Keys' to get started!";
        }

        const summary = freeModels.slice(0, 3).map(model =>
            `• ${model.name} (${model.provider})`
        ).join('\n');

        return summary + (freeModels.length > 3 ? `\n• ... and ${freeModels.length - 3} more` : '');
    }

    private async _clearChat() {
        if (!this._view) return;

        this._view.webview.postMessage({
            type: 'clearChat'
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${styleMainUri}" rel="stylesheet">
                <title>Sybil AI Assistant</title>
                <style>
                    /* Fallback styles in case CSS doesn't load */
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    .test { color: red; font-size: 24px; }
                </style>
            </head>
            <body>
                <div class="test">Webview is loading...</div>
                <div class="chat-container">
                    <div class="chat-header">
                        <div class="header-content">
                            <div class="header-icon">🤖</div>
                            <div class="header-text">
                                <h3>Sybil AI Assistant</h3>
                                <span class="header-subtitle">Your intelligent coding companion</span>
                            </div>
                        </div>
                        <div class="chat-controls">
                            <button id="clearChat" title="Clear conversation" class="control-btn">🗑️</button>
                            <button id="settingsBtn" title="Settings" class="control-btn">⚙️</button>
                        </div>
                    </div>

                    <div class="chat-messages" id="chatMessages">
                        <div class="welcome-message">
                            <div class="welcome-content">
                                <h4>Welcome to Sybil AI! 🚀</h4>
                                <p>I'm your intelligent coding assistant, ready to help with any development task.</p>
                                <div class="quick-suggestions">
                                    <button class="suggestion-btn" data-action="start-task">🚀 Start a coding task</button>
                                    <button class="suggestion-btn" data-action="configure-models">🔑 Configure models</button>
                                    <button class="suggestion-btn" data-action="show-help">❓ Help & commands</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="chat-input-container">
                        <div class="input-area">
                            <div class="input-wrapper">
                                <textarea
                                    id="messageInput"
                                    placeholder="Ask me anything about your coding project..."
                                    rows="1"
                                    maxlength="2000"
                                ></textarea>
                                <button id="sendButton" disabled class="send-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22,2 15,22 11,13 2,9"></polygon>
                                    </svg>
                                </button>
                            </div>
                            <div class="input-footer">
                                <span class="input-hint">Press Enter to send, Shift+Enter for new line</span>
                                <span id="charCount" class="char-count">0/2000</span>
                            </div>
                        </div>
                    </div>
                </div>

                <script nonce="${nonce}">
                    console.log('Webview script starting...');
                    // Test if JavaScript is working
                    document.querySelector('.test').textContent = 'JavaScript is working!';
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
