const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Expose a limited, safe API to the renderer. The entire ipcRenderer object
// is never exposed.
contextBridge.exposeInMainWorld('api', {
    // ============================================
    // Chat
    // ============================================
    chatStart: (payload) => ipcRenderer.invoke('chat:start', payload),
    chatStop: (requestId) => ipcRenderer.send('chat:stop', { requestId }),
    chatReadFile: (filePath) => ipcRenderer.invoke('chat:readFile', filePath),

    // ============================================
    // Event subscriptions (each returns an unsubscribe function)
    // ============================================
    onToken: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('chat:token', handler);
        return () => ipcRenderer.removeListener('chat:token', handler);
    },
    onDone: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('chat:done', handler);
        return () => ipcRenderer.removeListener('chat:done', handler);
    },
    onError: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('chat:error', handler);
        return () => ipcRenderer.removeListener('chat:error', handler);
    },

    // ============================================
    // Conversations
    // ============================================
    conversationList: () => ipcRenderer.invoke('conversation:list'),
    conversationGet: (id) => ipcRenderer.invoke('conversation:get', { id }),
    conversationCreate: (payload) => ipcRenderer.invoke('conversation:create', payload),
    conversationRename: (id, title) => ipcRenderer.invoke('conversation:rename', { id, title }),
    conversationDelete: (id) => ipcRenderer.invoke('conversation:delete', { id }),
    conversationSetMode: (id, modeId) => ipcRenderer.invoke('conversation:setMode', { id, modeId }),

    // ============================================
    // Messages
    // ============================================
    conversationMessages: (conversationId) =>
        ipcRenderer.invoke('conversation:messages', { conversationId }),
    messageSave: (payload) => ipcRenderer.invoke('message:save', payload),
    messageUpdate: (id, content) => ipcRenderer.invoke('message:update', { id, content }),
    messageDelete: (id) => ipcRenderer.invoke('message:delete', { id }),
    messageSearch: (query) => ipcRenderer.invoke('message:search', { query }),

    // ============================================
    // Ollama status + settings
    // ============================================
    ollamaStatus: () => ipcRenderer.invoke('ollama:status'),
    settingGet: (key) => ipcRenderer.invoke('setting:get', { key }),
    settingSet: (key, value) => ipcRenderer.invoke('setting:set', { key, value }),

    getSettings: () => ipcRenderer.invoke('settings:get'),
    updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),
    resetSettings: () => ipcRenderer.invoke('settings:reset'),

    // ============================================
    // Modes
    // ============================================
    modeList: () => ipcRenderer.invoke('mode:list'),
    modeGet: (id) => ipcRenderer.invoke('mode:get', { id }),
    modeSave: (mode) => ipcRenderer.invoke('mode:save', { mode }),
    modeDelete: (id) => ipcRenderer.invoke('mode:delete', { id }),

    // ============================================
    // Personal context + prompt assembly
    // ============================================
    contextGet: () => ipcRenderer.invoke('context:get'),
    contextSet: (content) => ipcRenderer.invoke('context:set', { content }),
    contextAppendFact: (fact) => ipcRenderer.invoke('context:appendFact', { fact }),
    contextCountWords: (text) => ipcRenderer.invoke('context:countWords', { text }),
    contextBuildMessages: ({ mode, aboutMe, history }) =>
        ipcRenderer.invoke('context:buildMessages', { mode, aboutMe, history }),

    // ============================================
    // Vault configuration
    // ============================================
    vaultGet: () => ipcRenderer.invoke('vault:get'),
    vaultSet: (vaultPath) => ipcRenderer.invoke('vault:set', { vaultPath }),
    vaultPick: () => ipcRenderer.invoke('vault:pick'),

    // ============================================
    // Notes
    // ============================================
    noteSave: (payload) => ipcRenderer.invoke('note:save', payload),
    noteListTitles: (vault) => ipcRenderer.invoke('note:listTitles', { vault }),

    // ============================================
    // Commands
    // ============================================
    commandParse: (input, modes) => ipcRenderer.invoke('command:parse', { input, modes }),

    // ============================================
    // File import
    // ============================================
    getPathForFile: (file) => webUtils.getPathForFile(file),
    fileParse: (filePath) => ipcRenderer.invoke('file:parse', { filePath }),
    fileChunk: ({ text, maxWords, detectDates }) =>
        ipcRenderer.invoke('file:chunk', { text, maxWords, detectDates }),
    fileDetectDates: (text) => ipcRenderer.invoke('file:detectDates', { text }),
    fileEstimateTokens: (text) => ipcRenderer.invoke('file:estimateTokens', { text }),
    fileIsSupported: (filePath) => ipcRenderer.invoke('file:isSupported', { filePath }),

    // ============================================
    // Document processing event subscriptions
    // ============================================
    onDocumentProgress: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('document:progress', handler);
        return () => ipcRenderer.removeListener('document:progress', handler);
    },
    onDocumentDone: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('document:done', handler);
        return () => ipcRenderer.removeListener('document:done', handler);
    },
    onDocumentError: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('document:error', handler);
        return () => ipcRenderer.removeListener('document:error', handler);
    },
    onDocumentCancelled: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('document:cancelled', handler);
        return () => ipcRenderer.removeListener('document:cancelled', handler);
    },
    onBatchProgress: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('batch:progress', handler);
        return () => ipcRenderer.removeListener('batch:progress', handler);
    },
    onBatchDone: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('batch:done', handler);
        return () => ipcRenderer.removeListener('batch:done', handler);
    },
    onBatchError: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('batch:error', handler);
        return () => ipcRenderer.removeListener('batch:error', handler);
    },
    onWatchDetected: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('watch:detected', handler);
        return () => ipcRenderer.removeListener('watch:detected', handler);
    },

    // ============================================
    // RAG (vault search + retrieval-augmented generation)
    // ============================================
    ragIndex: (vaultPath, excludedFolders) =>
        ipcRenderer.invoke('rag:index', { vaultPath, excludedFolders }),
    ragStop: () => ipcRenderer.invoke('rag:stop'),
    ragStatus: () => ipcRenderer.invoke('rag:status'),
    ragChunkCount: () => ipcRenderer.invoke('rag:chunkCount'),
    ragSearch: (query, vaultPath, topK) =>
        ipcRenderer.invoke('rag:search', { query, vaultPath, topK }),
    ragBuildPrompt: (query, chunks, aboutMe) =>
        ipcRenderer.invoke('rag:buildPrompt', { query, chunks, aboutMe }),
    ragRemoveFile: (filePath) => ipcRenderer.invoke('rag:removeFile', { filePath }),

    // RAG event subscriptions
    onRAGProgress: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('rag:progress', handler);
        return () => ipcRenderer.removeListener('rag:progress', handler);
    },
    onRAGDone: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('rag:done', handler);
        return () => ipcRenderer.removeListener('rag:done', handler);
    },
    onRAGError: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('rag:error', handler);
        return () => ipcRenderer.removeListener('rag:error', handler);
    },
    onRAGIdle: (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('rag:idle', handler);
        return () => ipcRenderer.removeListener('rag:idle', handler);
    },

    // ============================================
    // Phase 8: Productivity extras
    // ============================================
    hotkeyRegister: () => ipcRenderer.invoke('hotkey:register'),
    hotkeyUnregister: () => ipcRenderer.invoke('hotkey:unregister'),
    hotkeyToggleQuickWindow: () => ipcRenderer.invoke('hotkey:toggleQuickWindow'),
    hotkeyIsQuickWindowVisible: () => ipcRenderer.invoke('hotkey:isQuickWindowVisible'),

    clipboardRead: () => ipcRenderer.invoke('clipboard:read'),
    clipboardWrite: (text) => ipcRenderer.invoke('clipboard:write', { text }),
    clipboardProcessAndOpen: (text) => ipcRenderer.invoke('clipboard:processAndOpen', { text }),

    trayCreate: () => ipcRenderer.invoke('tray:create'),
    trayDestroy: () => ipcRenderer.invoke('tray:destroy'),
    windowHide: () => ipcRenderer.invoke('window:hide'),

    startupGet: () => ipcRenderer.invoke('startup:get'),
    startupSet: (enabled) => ipcRenderer.invoke('startup:set', { enabled }),

    ollamaWarmUp: (model) => ipcRenderer.invoke('ollama:warmUp', { model }),
    ollamaCheckAvailable: () => ipcRenderer.invoke('ollama:checkAvailable'),
    ollamaStart: () => ipcRenderer.invoke('ollama:start'),

    backupCreate: (outputPath) => ipcRenderer.invoke('backup:create', { outputPath }),
    backupRestore: (zipPath) => ipcRenderer.invoke('backup:restore', { zipPath }),
    backupGetDefaultPath: () => ipcRenderer.invoke('backup:getDefaultPath'),

    lockIsConfigured: () => ipcRenderer.invoke('lock:isConfigured'),
    lockSet: (password) => ipcRenderer.invoke('lock:set', { password }),
    lockRemove: () => ipcRenderer.invoke('lock:remove'),
    lockCheck: (password) => ipcRenderer.invoke('lock:check', { password }),
    lockRequireUnlock: (password) => ipcRenderer.invoke('lock:requireUnlock', { password }),

    ollamaOpenInstallLink: () => ipcRenderer.invoke('ollama:openInstallLink'),
});

console.log('Preload script loaded successfully - chat API exposed');
