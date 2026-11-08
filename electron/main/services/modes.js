const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULT_MODES_DIR = path.join(app.getAppPath(), 'resources', 'modes');
const USER_MODES_DIR = path.join(app.getPath('userData'), 'modes');

function ensureUserModesDir() {
    if (!fs.existsSync(USER_MODES_DIR)) {
        fs.mkdirSync(USER_MODES_DIR, { recursive: true });
    }
}

/**
 * Copy default mode files from resources/modes/ into userData/modes/ on first
 * launch. User-customized modes already present in userData/modes/ are never
 * overwritten.
 */
function seedDefaultModes() {
    ensureUserModesDir();
    if (!fs.existsSync(DEFAULT_MODES_DIR)) return;

    const files = fs.readdirSync(DEFAULT_MODES_DIR).filter((f) => f.endsWith('.json'));
    for (const file of files) {
        const userPath = path.join(USER_MODES_DIR, file);
        if (!fs.existsSync(userPath)) {
            try {
                fs.copyFileSync(
                    path.join(DEFAULT_MODES_DIR, file),
                    userPath
                );
            } catch {
                // Best-effort seed; a missing default mode is not fatal.
            }
        }
    }
}

/**
 * Load all available modes from userData/modes/ (user overrides) merged with
 * any defaults still missing there. Returns an array of mode objects.
 */
function loadModes() {
    seedDefaultModes();
    ensureUserModesDir();
    const modes = [];
    const seen = new Set();

    const dirs = [USER_MODES_DIR, DEFAULT_MODES_DIR];
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;
        try {
            const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
            for (const file of files) {
                const fullPath = path.join(dir, file);
                try {
                    const raw = fs.readFileSync(fullPath, 'utf-8');
                    const mode = JSON.parse(raw);
                    if (mode && mode.id && !seen.has(mode.id)) {
                        seen.add(mode.id);
                        modes.push({ ...mode, _source: dir === USER_MODES_DIR ? 'user' : 'default' });
                    }
                } catch {
                    // Skip malformed mode files.
                }
            }
        } catch {
            // Directory may not exist yet.
        }
    }

    return modes;
}

/**
 * Read a single mode by id from userData/modes/ first, then defaults.
 */
function loadMode(id) {
    const modes = loadModes();
    return modes.find((m) => m.id === id) || null;
}

/**
 * Save (create or update) a mode as a JSON file in userData/modes/.
 * Returns the saved mode object.
 */
function saveMode(mode) {
    ensureUserModesDir();
    const filePath = path.join(USER_MODES_DIR, `${mode.id}.json`);
    const payload = { ...mode, _source: 'user' };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    return payload;
}

/**
 * Delete a user-customized mode from userData/modes/. Default modes bundled
 * with the app cannot be deleted.
 */
function deleteMode(id) {
    const filePath = path.join(USER_MODES_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return false;
    try {
        fs.unlinkSync(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Return the path to the user modes directory (useful for debugging/tests).
 */
function getUserModesDir() {
    return USER_MODES_DIR;
}

module.exports = {
    DEFAULT_MODES_DIR,
    USER_MODES_DIR,
    ensureUserModesDir,
    seedDefaultModes,
    loadModes,
    loadMode,
    saveMode,
    deleteMode,
    getUserModesDir,
};
