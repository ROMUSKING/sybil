// Chat interface JavaScript for Sybil AI Assistant
(function () {
    console.log('Sybil Chat: JavaScript starting...');

    const vscode = acquireVsCodeApi();
    console.log('Sybil Chat: VS Code API acquired');

    // DOM elements
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');
    const clearChatButton = document.getElementById('clearChat');
    const settingsBtn = document.getElementById('settingsBtn');
    const charCount = document.getElementById('charCount');

    console.log('Sybil Chat: DOM elements found:', {
        messageInput: !!messageInput,
        sendButton: !!sendButton,
        chatMessages: !!chatMessages,
        clearChatButton: !!clearChatButton,
        settingsBtn: !!settingsBtn,
        charCount: !!charCount
    });

    // Check if critical elements exist
    if (!messageInput || !sendButton || !chatMessages) {
        console.error('Sybil Chat: Critical DOM elements missing!');
        return;
    }

    let chatHistory = [];

    // Initialize
    function init() {
        console.log('Sybil Chat: Initializing...');
        // Load chat history from VS Code state
        const state = vscode.getState();
        if (state && state.chatHistory) {
            chatHistory = state.chatHistory;
            renderChatHistory();
        }

        setupEventListeners();
        updateSendButton();
        updateCharCount();
        console.log('Sybil Chat: Initialization complete');
    }

    // Setup event listeners
    function setupEventListeners() {
        // Send message on Enter key
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Update UI on input change
        messageInput.addEventListener('input', () => {
            updateSendButton();
            updateCharCount();
            autoResizeTextarea();
        });

        // Send button click
        sendButton.addEventListener('click', sendMessage);

        // Clear chat
        clearChatButton.addEventListener('click', clearChat);

        // Settings button
        settingsBtn.addEventListener('click', () => {
            vscode.postMessage({
                type: 'openSettings'
            });
        });

        // Suggestion buttons
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                handleSuggestion(action);
            });
        });

        // Handle messages from extension
        window.addEventListener('message', handleMessage);
    }

    // Handle suggestion button clicks
    function handleSuggestion(action) {
        switch (action) {
            case 'start-task':
                const task = prompt('Describe the task you want to start:');
                if (task && task.trim()) {
                    vscode.postMessage({
                        type: 'startTask',
                        text: task.trim()
                    });
                }
                break;
            case 'configure-models':
                vscode.postMessage({
                    type: 'sendMessage',
                    text: 'configure models'
                });
                break;
            case 'show-help':
                vscode.postMessage({
                    type: 'sendMessage',
                    text: 'help'
                });
                break;
        }
    }

    // Send message
    function sendMessage() {
        const text = messageInput.value.trim();
        if (text) {
            vscode.postMessage({
                type: 'sendMessage',
                text: text
            });
            messageInput.value = '';
            updateSendButton();
            updateCharCount();
            autoResizeTextarea();
        }
    }

    // Update send button state
    function updateSendButton() {
        const text = messageInput.value.trim();
        sendButton.disabled = !text;
        sendButton.style.opacity = text ? '1' : '0.5';
    }

    // Update character count
    function updateCharCount() {
        const count = messageInput.value.length;
        const max = 2000;
        charCount.textContent = `${count}/${max}`;

        if (count > max * 0.9) {
            charCount.style.color = '#f48771';
        } else if (count > max * 0.8) {
            charCount.style.color = '#cca700';
        } else {
            charCount.style.color = 'var(--vscode-descriptionForeground)';
        }
    }

    // Auto-resize textarea
    function autoResizeTextarea() {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    }

    // Handle messages from extension
    function handleMessage(event) {
        const message = event.data;

        switch (message.type) {
            case 'addMessage':
                addMessage(message.message);
                break;
            case 'clearChat':
                clearChatHistory();
                break;
            case 'taskStarted':
                showNotification(message.message, 'success');
                break;
            case 'error':
                showNotification(message.message, 'error');
                break;
        }
    }

    // Add message to chat
    function addMessage(message) {
        chatHistory.push(message);
        renderMessage(message);
        saveState();

        // Auto-scroll to bottom
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    }

    // Render a single message
    function renderMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;

        const avatar = message.role === 'user' ? '👤' : '🤖';

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-text">${formatMessage(message.content)}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
    }

    // Format message content (handle markdown-like formatting)
    function formatMessage(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    // Render entire chat history
    function renderChatHistory() {
        chatMessages.innerHTML = '';
        chatHistory.forEach(message => renderMessage(message));
    }

    // Clear chat history
    function clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            vscode.postMessage({
                type: 'clearChat'
            });
        }
    }

    // Clear chat history locally
    function clearChatHistory() {
        chatHistory = [];
        chatMessages.innerHTML = '';
        saveState();
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f48771' : type === 'success' ? '#3794ff' : '#007acc'};
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 100);

        // Hide notification
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Save state to VS Code
    function saveState() {
        vscode.setState({ chatHistory });
    }

    // Format timestamp
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
