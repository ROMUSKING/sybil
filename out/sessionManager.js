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
exports.SessionItem = exports.SessionManager = void 0;
const vscode = __importStar(require("vscode"));
class SessionManager {
    constructor(context) {
        this.currentSessionId = null;
        this.sessions = new Map();
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.context = context;
        this.loadSessions();
    }
    async createNewSession() {
        const sessionId = this.generateSessionId();
        const sessionData = {
            id: sessionId,
            created: new Date(),
            task: '',
            status: 'active'
        };
        this.sessions.set(sessionId, sessionData);
        this.currentSessionId = sessionId;
        await this.saveSessions();
        return sessionId;
    }
    async setCurrentSession(sessionId) {
        if (this.sessions.has(sessionId)) {
            this.currentSessionId = sessionId;
            await this.saveSessions();
        }
        else {
            throw new Error(`Session ${sessionId} not found`);
        }
    }
    async clearCurrentSession() {
        this.currentSessionId = null;
        await this.saveSessions();
    }
    getCurrentSessionId() {
        return this.currentSessionId;
    }
    getAvailableSessions() {
        return Array.from(this.sessions.keys());
    }
    async getSessionTask(sessionId) {
        const session = this.sessions.get(sessionId);
        return session?.task || null;
    }
    async updateSessionTask(sessionId, task) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.task = task;
            await this.saveSessions();
        }
    }
    async updateSessionStatus(sessionId, status) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = status;
            await this.saveSessions();
        }
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async saveSessions() {
        const sessionsData = Array.from(this.sessions.entries());
        await this.context.globalState.update('sybil.sessions', sessionsData);
        await this.context.globalState.update('sybil.currentSession', this.currentSessionId);
    }
    loadSessions() {
        const sessionsData = this.context.globalState.get('sybil.sessions', []);
        this.sessions = new Map(sessionsData);
        this.currentSessionId = this.context.globalState.get('sybil.currentSession', null);
    }
    // TreeDataProvider implementation
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - return all sessions
            return Promise.resolve(Array.from(this.sessions.values()).map(session => new SessionItem(session)));
        }
        return Promise.resolve([]);
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
}
exports.SessionManager = SessionManager;
class SessionItem extends vscode.TreeItem {
    constructor(session) {
        super(session.id, vscode.TreeItemCollapsibleState.None);
        this.session = session;
        this.tooltip = `Created: ${session.created.toLocaleString()}\nTask: ${session.task}\nStatus: ${session.status}`;
        this.description = `${session.status} - ${session.task.substring(0, 50)}${session.task.length > 50 ? '...' : ''}`;
        if (session.status === 'active') {
            this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
        }
        else if (session.status === 'completed') {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.blue'));
        }
        else if (session.status === 'failed') {
            this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
        }
        this.contextValue = 'session';
    }
}
exports.SessionItem = SessionItem;
//# sourceMappingURL=sessionManager.js.map