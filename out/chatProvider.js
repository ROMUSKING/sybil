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
exports.ChatProvider = void 0;
const vscode = __importStar(require("vscode"));
class ChatProvider {
    constructor(_extensionUri, sybilAgent, modelManager) {
        this._extensionUri = _extensionUri;
        this._sybilAgent = sybilAgent;
        this._modelManager = modelManager;
    }
    resolveWebviewView(webviewView, context, _token) {
        console.log('=== SYBIL CHAT: resolveWebviewView CALLED ===');
        console.log('Sybil Chat: View type:', webviewView.viewType);
        console.log('Sybil Chat: View title:', webviewView.title);
        console.log('Sybil Chat: View visible:', webviewView.visible);
        console.log('Sybil Chat: Context state:', context?.state);
        console.log('Sybil Chat: Token cancelled:', _token?.isCancellationRequested);
        this._view = webviewView;
        console.log('Sybil Chat: Setting webview options...');
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media')
            ]
        };
        console.log('Sybil Chat: Webview options set');
        console.log('Sybil Chat: Generating HTML content...');
        const htmlContent = this._getHtmlForWebview(webviewView.webview);
        console.log('Sybil Chat: HTML content length:', htmlContent.length);
        console.log('Sybil Chat: Setting HTML content...');
        webviewView.webview.html = htmlContent;
        console.log('Sybil Chat: HTML content set successfully');
        console.log('Sybil Chat: Setting up message handler...');
        webviewView.webview.onDidReceiveMessage(async (message) => {
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
        }, undefined, []);
        console.log('Sybil Chat: Message handler set up');
        // Add visibility change listener for debugging
        webviewView.onDidChangeVisibility(() => {
            console.log('Sybil Chat: Visibility changed. Visible:', webviewView.visible);
        });
        console.log('=== SYBIL CHAT: Webview setup complete ===');
    }
    async _handleChatMessage(message) {
        if (!this._view)
            return;
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
        }
        catch (error) {
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
    async _handleStartTask(taskDescription) {
        if (!this._view)
            return;
        try {
            await this._sybilAgent.startTask(taskDescription);
            this._view.webview.postMessage({
                type: 'taskStarted',
                message: `Task started: ${taskDescription}`
            });
        }
        catch (error) {
            this._view.webview.postMessage({
                type: 'error',
                message: `Failed to start task: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }
    async _processMessage(message) {
        // Get available free models
        const freeModels = this._modelManager.getFreeModels();
        if (freeModels.length === 0) {
            return `🤖 **Sybil AI Assistant**

I don't have any AI models configured yet. To get started:

**🔑 Setup Required:**
1. Go to Settings → Sybil: Configure API Keys
2. Add API keys for providers like OpenRouter, HuggingFace, or OpenAI
3. Free models will be automatically available

**📚 What I can do:**
• Generate code and implement features
• Debug and fix issues
• Create documentation
• Set up project configurations
• Review code quality

Please configure your API keys first, then I can help with any coding task!`;
        }
        // Enhanced message processing with AI-powered responses
        const lowerMessage = message.toLowerCase().trim();
        try {
            // Use the first available model for chat responses
            if (!freeModels[0]) {
                return this._getFallbackResponse(lowerMessage);
            }
            const chatModel = freeModels[0].name;
            const systemPrompt = `You are Sybil, an intelligent AI coding assistant. You help developers with:
- Writing and implementing code
- Debugging and fixing issues
- Creating documentation
- Setting up projects and configurations
- Code review and best practices

Be helpful, concise, and provide practical solutions. Use markdown formatting for code and emphasis.`;
            const fullPrompt = `${systemPrompt}\n\nUser: ${message}\n\nAssistant:`;
            const response = await this._modelManager.sendRequest(fullPrompt, [chatModel]);
            // If the AI response is too generic or empty, provide a fallback
            if (!response || response.trim().length < 10) {
                return this._getFallbackResponse(lowerMessage);
            }
            return response;
        }
        catch (error) {
            console.error('Error processing message with AI:', error);
            return this._getFallbackResponse(lowerMessage);
        }
    }
    _getFallbackResponse(lowerMessage) {
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
                const statsData = data;
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
    _getModelSummary() {
        const freeModels = this._modelManager.getFreeModels();
        if (freeModels.length === 0) {
            return "⚠️ No models configured. Use 'Sybil: Configure API Keys' to get started!";
        }
        const summary = freeModels.slice(0, 3).map(model => `• ${model.name} (${model.provider})`).join('\n');
        return summary + (freeModels.length > 3 ? `\n• ... and ${freeModels.length - 3} more` : '');
    }
    async _clearChat() {
        if (!this._view)
            return;
        this._view.webview.postMessage({
            type: 'clearChat'
        });
    }
    _getHtmlForWebview(webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const nonce = getNonce();
        console.log('Sybil Chat: Resource URIs generated:', {
            styleResetUri: styleResetUri.toString(),
            styleVSCodeUri: styleVSCodeUri.toString(),
            styleMainUri: styleMainUri.toString(),
            scriptUri: scriptUri.toString()
        });
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
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: #1e1e1e;
                        color: #cccccc;
                    }
                    .test {
                        color: #4ec9b0;
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 20px;
                    }
                    .loading {
                        color: #ffd700;
                        font-style: italic;
                    }
                    .chat-container {
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                        background: #1e1e1e;
                    }
                    .chat-messages {
                        flex: 1;
                        overflow-y: auto;
                        padding: 20px;
                    }
                    .chat-input-container {
                        border-top: 1px solid #3e3e3e;
                        padding: 20px;
                        background: #252526;
                    }
                    .input-wrapper {
                        display: flex;
                        gap: 10px;
                        align-items: flex-end;
                    }
                    #messageInput {
                        flex: 1;
                        background: #3c3c3c;
                        color: #cccccc;
                        border: 1px solid #3e3e3e;
                        border-radius: 8px;
                        padding: 12px;
                        font-size: 14px;
                        resize: none;
                        min-height: 20px;
                    }
                    .send-btn {
                        background: #007acc;
                        color: white;
                        border: none;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .send-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                </style>
            </head>
            <body>
                <div class="test">🤖 Sybil AI Chat Loading...</div>
                <div class="loading">Initializing chat interface...</div>
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
                    console.log('Sybil Chat: Webview script starting...');
                    // Test if JavaScript is working
                    document.querySelector('.test').textContent = '🤖 Sybil AI Chat Ready!';
                    document.querySelector('.loading').textContent = 'Chat interface loaded successfully!';
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
exports.ChatProvider = ChatProvider;
ChatProvider.viewType = 'sybil.devChat';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=chatProvider.js.map