const { ipcMain } = require('electron');
const { getDatabase } = require('../services/db');

function send(mainWindow, channel, payload) {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isDevToolsDestroyed()) {
        mainWindow.webContents.send(channel, payload);
    }
}

function registerConversationIpcHandlers(mainWindow) {
    const db = getDatabase();

    // ============================================
    // Conversations
    // ============================================
    ipcMain.handle('conversation:list', () => db.listConversations());

    ipcMain.handle('conversation:get', (event, { id }) => db.getConversation(id));

    ipcMain.handle('conversation:create', (event, { title, mode_id, model }) =>
        db.createConversation({ title, mode_id, model }));

    ipcMain.handle('conversation:rename', (event, { id, title }) =>
        db.renameConversation(id, title));

    ipcMain.handle('conversation:delete', (event, { id }) =>
        db.deleteConversation(id));

    ipcMain.handle('conversation:setMode', (event, { id, modeId }) => {
        const stmt = db._stmts.db.prepare(
            `UPDATE conversations SET mode_id = @mode_id, updated_at = CURRENT_TIMESTAMP WHERE id = @id`
        );
        const result = stmt.run({ id, mode_id: modeId });
        return { updated: result.changes > 0 };
    });

    // ============================================
    // Messages
    // ============================================
    ipcMain.handle('conversation:messages', (event, { conversationId }) =>
        db.loadMessages(conversationId));

    ipcMain.handle('message:save', (event, { id, conversationId, role, content, createdAt }) =>
        db.saveMessage({ id, conversationId, role, content, createdAt }));

    ipcMain.handle('message:update', (event, { id, content }) =>
        db.updateMessage(id, content));

    ipcMain.handle('message:delete', (event, { id }) => {
        const msg = db._stmts.db.prepare(`SELECT conversation_id FROM messages WHERE id = @id`).get({ id });
        const stmt = db._stmts.db.prepare(`DELETE FROM messages WHERE id = @id`);
        const result = stmt.run({ id });
        if (msg) {
            db._stmts.touchConversation.run({ id: msg.conversation_id });
        }
        return { deleted: result.changes > 0 };
    });

    // ============================================
    // Full-text search
    // ============================================
    ipcMain.handle('message:search', (event, { query }) => db.searchMessages(query));

    // ============================================
    // Settings
    // ============================================
    ipcMain.handle('setting:get', (event, { key }) => db.getSetting(key));

    ipcMain.handle('setting:set', (event, { key, value }) => {
        db.setSetting(key, value);
        return { success: true };
    });
}

module.exports = { registerConversationIpcHandlers };
