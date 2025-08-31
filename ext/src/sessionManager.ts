import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class SessionManager implements vscode.TreeDataProvider<SessionItem> {
    private context: vscode.ExtensionContext;
    private currentSessionId: string | null = null;
    private sessions: Map<string, SessionData> = new Map();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadSessions();
    }

    public async createNewSession(): Promise<string> {
        const sessionId = this.generateSessionId();
        const sessionData: SessionData = {
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

    public async setCurrentSession(sessionId: string): Promise<void> {
        if (this.sessions.has(sessionId)) {
            this.currentSessionId = sessionId;
            await this.saveSessions();
        } else {
            throw new Error(`Session ${sessionId} not found`);
        }
    }

    public async clearCurrentSession(): Promise<void> {
        this.currentSessionId = null;
        await this.saveSessions();
    }

    public getCurrentSessionId(): string | null {
        return this.currentSessionId;
    }

    public getAvailableSessions(): string[] {
        return Array.from(this.sessions.keys());
    }

    public async getSessionTask(sessionId: string): Promise<string | null> {
        const session = this.sessions.get(sessionId);
        return session?.task || null;
    }

    public async updateSessionTask(sessionId: string, task: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.task = task;
            await this.saveSessions();
        }
    }

    public async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = status;
            await this.saveSessions();
        }
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private async saveSessions(): Promise<void> {
        const sessionsData = Array.from(this.sessions.entries());
        await this.context.globalState.update('sybil.sessions', sessionsData);
        await this.context.globalState.update('sybil.currentSession', this.currentSessionId);
    }

    private loadSessions(): void {
        const sessionsData = this.context.globalState.get<[string, SessionData][]>('sybil.sessions', []);
        this.sessions = new Map(sessionsData);
        this.currentSessionId = this.context.globalState.get('sybil.currentSession', null);
    }

    // TreeDataProvider implementation
    getTreeItem(element: SessionItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SessionItem): Thenable<SessionItem[]> {
        if (!element) {
            // Root level - return all sessions
            return Promise.resolve(
                Array.from(this.sessions.values()).map(session => new SessionItem(session))
            );
        }
        return Promise.resolve([]);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    private _onDidChangeTreeData: vscode.EventEmitter<SessionItem | undefined | null | void> = new vscode.EventEmitter<SessionItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SessionItem | undefined | null | void> = this._onDidChangeTreeData.event;
}

export class SessionItem extends vscode.TreeItem {
    constructor(public readonly session: SessionData) {
        super(session.id, vscode.TreeItemCollapsibleState.None);

        this.tooltip = `Created: ${session.created.toLocaleString()}\nTask: ${session.task}\nStatus: ${session.status}`;
        this.description = `${session.status} - ${session.task.substring(0, 50)}${session.task.length > 50 ? '...' : ''}`;

        if (session.status === 'active') {
            this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
        } else if (session.status === 'completed') {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.blue'));
        } else if (session.status === 'failed') {
            this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
        }

        this.contextValue = 'session';
    }
}

interface SessionData {
    id: string;
    created: Date;
    task: string;
    status: SessionStatus;
}

type SessionStatus = 'active' | 'completed' | 'failed' | 'paused';
