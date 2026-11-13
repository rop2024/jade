const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

function resolveDbPath() {
    return path.join(app.getPath('userData'), 'llmdesk.db');
}

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    mode_id TEXT,
    model TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    rowid INTEGER PRIMARY KEY,
    id TEXT NOT NULL UNIQUE,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content,
    content='messages',
    content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
END;

CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
END;

CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
    INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
END;

CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    path TEXT,
    heading TEXT,
    text TEXT,
    mtime INTEGER,
    embedding BLOB
);
CREATE INDEX IF NOT EXISTS idx_chunks_path ON chunks(path);
`;

class ChatDatabase {
    constructor() {
        this.db = null;
    }

    initialize() {
        this.db = new Database(resolveDbPath());
        this.db.pragma('journal_mode = WAL');
        this.db.exec(SCHEMA);
        this._prepareStatements();
        this._ensureDefaultSettings();
        return this.db;
    }

    _prepareStatements() {
        const db = this.db;

        this._stmts = {
            listConversations: db.prepare(`
                SELECT id, title, mode_id, model, created_at, updated_at
                FROM conversations
                ORDER BY updated_at DESC
            `),
            getConversation: db.prepare(`
                SELECT id, title, mode_id, model, created_at, updated_at
                FROM conversations WHERE id = @id
            `),
            createConversation: db.prepare(`
                INSERT INTO conversations (id, title, mode_id, model, created_at, updated_at)
                VALUES (@id, @title, @mode_id, @model, @created_at, @updated_at)
            `),
            renameConversation: db.prepare(`
                UPDATE conversations
                SET title = @title, updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `),
            touchConversation: db.prepare(`
                UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = @id
            `),
            deleteConversation: db.prepare(`
                DELETE FROM conversations WHERE id = @id
            `),
            loadMessages: db.prepare(`
                SELECT id, conversation_id, role, content, created_at
                FROM messages
                WHERE conversation_id = @conversation_id
                ORDER BY created_at ASC
            `),
            saveMessage: db.prepare(`
                INSERT INTO messages (id, conversation_id, role, content, created_at)
                VALUES (@id, @conversation_id, @role, @content, @created_at)
            `),
            updateMessage: db.prepare(`
                UPDATE messages SET content = @content WHERE id = @id
            `),
            deleteMessages: db.prepare(`
                DELETE FROM messages WHERE conversation_id = @conversation_id
            `),
            searchMessages: db.prepare(`
                SELECT m.id, m.conversation_id, m.role, m.content, m.created_at
                FROM messages m
                JOIN messages_fts fts ON m.rowid = fts.rowid
                WHERE messages_fts MATCH @query
                ORDER BY m.created_at DESC
            `),
            settingGet: db.prepare(`SELECT value FROM settings WHERE key = @key`),
            settingSet: db.prepare(`
                INSERT INTO settings (key, value) VALUES (@key, @value)
                ON CONFLICT(key) DO UPDATE SET value = @value
            `),
        };
    }

    _ensureDefaultSettings() {
        const defaults = {
            system_prompt: 'You are a helpful assistant.',
            model: 'llama3.2',
        };
        for (const [key, value] of Object.entries(defaults)) {
            if (!this._stmts.settingGet.get({ key })) {
                this._stmts.settingSet.run({ key, value });
            }
        }
    }

    listConversations() {
        return this._stmts.listConversations.all();
    }

    getConversation(id) {
        return this._stmts.getConversation.get({ id });
    }

    createConversation({ id, title, mode_id = null, model = null }) {
        const now = new Date().toISOString();
        this._stmts.createConversation.run({
            id, title, mode_id, model, created_at: now, updated_at: now,
        });
        return this.getConversation(id);
    }

    renameConversation(id, title) {
        this._stmts.renameConversation.run({ id, title });
        return this.getConversation(id);
    }

    deleteConversation(id) {
        this._stmts.deleteMessages.run({ conversation_id: id });
        const deleted = this._stmts.deleteConversation.run({ id });
        return deleted.changes > 0;
    }

    loadMessages(conversationId) {
        return this._stmts.loadMessages.all({ conversation_id: conversationId });
    }

    saveMessage({ id, conversationId, role, content, createdAt }) {
        this._stmts.saveMessage.run({
            id, conversation_id: conversationId, role, content, created_at: createdAt,
        });
        this._stmts.touchConversation.run({ id: conversationId });
        return { id, conversationId, role, content, created_at: createdAt };
    }

    updateMessage(id, content) {
        this._stmts.updateMessage.run({ id, content });
        const row = this.db.prepare(`SELECT conversation_id FROM messages WHERE id = @id`).get({ id });
        if (row) {
            this._stmts.touchConversation.run({ id: row.conversation_id });
        }
    }

    searchMessages(query) {
        return this._stmts.searchMessages.all({ query });
    }

    getSetting(key) {
        const row = this._stmts.settingGet.get({ key });
        return row ? row.value : null;
    }

    setSetting(key, value) {
        this._stmts.settingSet.run({ key, value });
    }

    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

let instance = null;

function getDatabase() {
    if (!instance) {
        instance = new ChatDatabase();
        instance.initialize();
    }
    return instance;
}

module.exports = { ChatDatabase, resolveDbPath, getDatabase };
