const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { SqlJsCompat } = require('./compat');

class DatabaseService {
    constructor() {
        this.db = null;
        this.dbPath = null;
        this.sql = null;
    }

    async initialize() {
        this.sql = await initSqlJs();

        const userDataPath = app.getPath('userData');
        this.dbPath = path.join(userDataPath, 'data', 'app.db');

        fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });

        try {
            const fileBuffer = fs.readFileSync(this.dbPath);
            this.db = new SqlJsCompat(new this.sql.Database(fileBuffer));
        } catch (error) {
            this.db = new SqlJsCompat(new this.sql.Database());
        }

        this.db.run('PRAGMA foreign_keys = ON');
        this.createTables();
        return this.db;
    }

    createTables() {
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
        this.db.exec(schema);
        this.save();
    }

    save() {
        if (this.db && this.dbPath) {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.dbPath, buffer);
        }
    }

    getConnection() {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    close() {
        if (this.db) {
            this.save();
            this.db.close();
            this.db = null;
        }
    }

    // ----- Generic helpers used by IPC -----
    run(sql, params = []) {
        const stmt = this.db.prepare(sql);
        stmt.run(...params);
        this.save();
        return true;
    }

    getAll(sql, params = []) {
        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }
}

let instance = null;

async function initDatabase() {
    if (!instance) {
        instance = new DatabaseService();
        await instance.initialize();
    }
    return instance;
}

function getDatabase() {
    if (!instance) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return instance;
}

module.exports = { DatabaseService, initDatabase, getDatabase };
