const settings = require('electron-settings');
const path = require('path');
const fs = require('fs').promises;

class SettingsService {
  constructor() {
    this.defaultSettings = {
      theme: 'dark',
      language: 'en',
      apiTimeout: 30000,
      apiRetryAttempts: 3,
      proxy: '',
      logLevel: 'info',
      keepLogs: 30,
    };
  }

  async initialize() {
    const settingsDir = path.dirname(settings.file());
    await fs.mkdir(settingsDir, { recursive: true });

    const currentSettings = await this.get();
    if (Object.keys(currentSettings).length === 0) {
      await this.setAll(this.defaultSettings);
    }

    return this.defaultSettings;
  }

  async get() {
    try {
      return (await settings.get()) || {};
    } catch (error) {
      console.error('Error reading settings:', error);
      return {};
    }
  }

  async getSetting(key) {
    try {
      const value = await settings.get(key);
      return value !== undefined ? value : this.defaultSettings[key];
    } catch (error) {
      return this.defaultSettings[key];
    }
  }

  async setSetting(key, value) {
    try {
      await settings.set(key, value);
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  }

  async setAll(settingsObj) {
    try {
      for (const [key, value] of Object.entries(settingsObj)) {
        await settings.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Error setting multiple settings:', error);
      return false;
    }
  }

  async reset() {
    try {
      await settings.unset();
      await this.setAll(this.defaultSettings);
      return true;
    } catch (error) {
      console.error('Error resetting settings:', error);
      return false;
    }
  }
}

module.exports = SettingsService;
