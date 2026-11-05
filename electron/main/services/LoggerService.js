const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class LoggerService {
  constructor() {
    this.logDir = path.join(app.getPath('userData'), 'logs');
    this.currentLogFile = null;
    this.logStream = null;
  }

  async initialize() {
    await fs.mkdir(this.logDir, { recursive: true });

    const today = new Date().toISOString().split('T')[0];
    this.currentLogFile = path.join(this.logDir, `${today}.log`);

    const exists = await this.fileExists(this.currentLogFile);
    if (!exists) {
      await this.writeHeader();
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async writeHeader() {
    const header = `========================================
App Log
Started: ${new Date().toISOString()}
========================================

`;
    await fs.writeFile(this.currentLogFile, header, 'utf-8');
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}\n`;

    await fs.appendFile(this.currentLogFile, logLine, 'utf-8');

    if (process.env.NODE_ENV === 'development') {
      console.log(logLine.trim());
    }
  }

  async logError(error, context) {
    await this.log(`Error in ${context}: ${error.message}`, 'ERROR');
    if (error.stack) {
      await this.log(`  Stack: ${error.stack}`, 'ERROR');
    }
  }

  async getRecentLogs(lines = 100) {
    const content = await fs.readFile(this.currentLogFile, 'utf-8');
    const lines_array = content.split('\n');
    return lines_array.slice(-lines).join('\n');
  }

  async clearLogs() {
    const files = await fs.readdir(this.logDir);
    for (const file of files) {
      if (file.endsWith('.log')) {
        await fs.unlink(path.join(this.logDir, file));
      }
    }
  }
}

module.exports = LoggerService;
