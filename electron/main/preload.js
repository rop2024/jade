const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object.
contextBridge.exposeInMainWorld('electronAPI', {
    // ============================================
    // App
    // ============================================
    getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
    getAppPath: (name) => ipcRenderer.invoke('app:getPath', name),

    // ============================================
    // Settings
    // ============================================
    getSettings: () => ipcRenderer.invoke('settings:get'),
    updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),
    resetSettings: () => ipcRenderer.invoke('settings:reset'),

    // ============================================
    // Engine / Core tasks
    // ============================================
    runTask: (payload) => ipcRenderer.invoke('task:run', payload),
    cancelTask: () => ipcRenderer.invoke('task:cancel'),
    getStatus: () => ipcRenderer.invoke('task:status'),

    // ============================================
    // Database
    // ============================================
    dbQuery: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
    dbGetAll: (sql, params) => ipcRenderer.invoke('db:getAll', sql, params),

    // ============================================
    // Filesystem
    // ============================================
    fsReadDirectory: (dirPath) => ipcRenderer.invoke('fs:readDirectory', dirPath),
    fsFileExists: (filePath) => ipcRenderer.invoke('fs:fileExists', filePath),

    // ============================================
    // Dialogs
    // ============================================
    dialogOpenFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
    dialogOpenDirectory: (options) => ipcRenderer.invoke('dialog:openDirectory', options),
    dialogSaveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
    dialogShowMessage: (options) => ipcRenderer.invoke('dialog:showMessage', options),

    // ============================================
    // Utility
    // ============================================
    utilOpenExternal: (url) => ipcRenderer.invoke('util:openExternal', url),

    // ============================================
    // Event Listeners (for progress updates)
    // ============================================
    onProgress: (callback) => {
        ipcRenderer.on('app:progress', (event, data) => callback(data));
    },
    removeProgressListener: () => {
        ipcRenderer.removeAllListeners('app:progress');
    },
});

console.log('Preload script loaded successfully - Starter API exposed');
