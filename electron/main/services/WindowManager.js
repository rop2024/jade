const { BrowserWindow } = require('electron');
const path = require('path');

class WindowManager {
  constructor() {
    this.windows = new Map();
  }

  createWindow(options = {}) {
    const id = Date.now().toString();
    const window = new BrowserWindow({
      width: options.width || 800,
      height: options.height || 600,
      show: false,
      parent: options.parent,
      modal: options.modal || false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js'),
      },
      ...options,
    });

    this.windows.set(id, window);

    window.once('ready-to-show', () => window.show());
    window.on('closed', () => this.windows.delete(id));

    return { id, window };
  }

  getWindow(id) {
    return this.windows.get(id);
  }

  closeWindow(id) {
    const window = this.windows.get(id);
    if (window) {
      window.close();
      return true;
    }
    return false;
  }

  sendToWindow(id, channel, data) {
    const window = this.windows.get(id);
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, data);
      return true;
    }
    return false;
  }
}

module.exports = WindowManager;
