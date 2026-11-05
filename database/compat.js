/**
 * sql.js -> better-sqlite3 style compatibility wrapper.
 *
 * The DatabaseService is written against the synchronous better-sqlite3 API
 * (db.prepare(sql).all/get/run, db.run, db.exec). sql.js has a different
 * (callback/step) API, so this thin wrapper emulates the methods we use
 * without changing any call sites.
 */

class Statement {
    constructor(sqlDb, sql) {
        this.sqlDb = sqlDb;
        this.sql = sql;
    }

    _exec(params) {
        const stmt = this.sqlDb.prepare(this.sql);
        if (params && params.length > 0) {
            stmt.bind(params);
        }
        return stmt;
    }

    all(...params) {
        const stmt = this._exec(params);
        const rows = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
    }

    get(...params) {
        const rows = this.all(...params);
        return rows.length > 0 ? rows[0] : undefined;
    }

    run(...params) {
        const stmt = this._exec(params);
        stmt.step();
        stmt.free();
        return this;
    }
}

class SqlJsCompat {
    constructor(sqlDb) {
        this._db = sqlDb;
    }

    prepare(sql) {
        return new Statement(this._db, sql);
    }

    run(sql, ...params) {
        const stmt = this._db.prepare(sql);
        if (params.length > 0) {
            stmt.bind(params);
        }
        stmt.step();
        stmt.free();
        return this;
    }

    exec(sql) {
        this._db.run(sql);
        return this;
    }

    export() {
        return this._db.export();
    }

    close() {
        return this._db.close();
    }
}

module.exports = { SqlJsCompat };
