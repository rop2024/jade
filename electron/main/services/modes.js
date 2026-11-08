const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

const DEFAULT_MODES_DIR = path.join(app.getAppPath(), 'resources', 'modes');
const USER_MODES_DIR = path.join(app.getPath('userData'), 'modes');
const MAX_FEEDBACK_EXAMPLES = 5;

function ensureUserModesDir() {
    if (!fs.existsSync(USER_MODES_DIR)) {
        fs.mkdirSync(USER_MODES_DIR, { recursive: true });
    }
}

function seedDefaultModes() {
    ensureUserModesDir();
    if (!fs.existsSync(DEFAULT_MODES_DIR)) return;

    const files = fs.readdirSync(DEFAULT_MODES_DIR).filter((f) => f.endsWith('.json'));
    for (const file of files) {
        const userPath = path.join(USER_MODES_DIR, file);
        if (!fs.existsSync(userPath)) {
            try {
                fs.copyFileSync(path.join(DEFAULT_MODES_DIR, file), userPath);
            } catch {
                // Best-effort seed; not fatal.
            }
        }
    }
}

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

function loadMode(id) {
    const modes = loadModes();
    return modes.find((m) => m.id === id) || null;
}

function getModeHistoryDir(modeId) {
    const historyDir = path.join(USER_MODES_DIR, '.history', modeId);
    if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
    }
    return historyDir;
}

function backupModeVersion(mode) {
    if (!mode || !mode.id) return;
    const historyDir = getModeHistoryDir(mode.id);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(historyDir, `${timestamp}.json`);
    try {
        fs.writeFileSync(backupPath, JSON.stringify(mode, null, 2));
    } catch {
        // Best-effort backup; not fatal.
    }
}

function getModeHistory(modeId) {
    const historyDir = path.join(USER_MODES_DIR, '.history', modeId);
    if (!fs.existsSync(historyDir)) return [];

    try {
        const files = fs.readdirSync(historyDir).filter((f) => f.endsWith('.json')).sort().reverse();
        return files.map((f) => {
            try {
                const raw = fs.readFileSync(path.join(historyDir, f), 'utf-8');
                return {
                    timestamp: f.replace('.json', ''),
                    mode: JSON.parse(raw),
                };
            } catch {
                return null;
            }
        }).filter(Boolean);
    } catch {
        return [];
    }
}

function restoreModeVersion(modeId, timestamp) {
    const historyDir = path.join(USER_MODES_DIR, '.history', modeId);
    const backupPath = path.join(historyDir, `${timestamp}.json`);
    try {
        const raw = fs.readFileSync(backupPath, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function saveMode(mode) {
    ensureUserModesDir();

    // Back up existing version if mode already exists
    const existing = loadMode(mode.id);
    if (existing && existing._source === 'user') {
        backupModeVersion(existing);
    }

    const filePath = path.join(USER_MODES_DIR, `${mode.id}.json`);
    const payload = { ...mode, _source: 'user' };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    return payload;
}

function addFeedbackExample(modeId, example) {
    const mode = loadMode(modeId);
    if (!mode) return null;

    const examples = mode.examples || [];
    const newExample = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        input: example.input || '',
        output: example.output || '',
        correctedOutput: example.correctedOutput || example.output || '',
        ...example,
    };

    const updatedExamples = [newExample, ...examples].slice(0, MAX_FEEDBACK_EXAMPLES);

    return saveMode({ ...mode, examples: updatedExamples });
}

function deleteFeedbackExample(modeId, exampleId) {
    const mode = loadMode(modeId);
    if (!mode) return false;

    const examples = mode.examples || [];
    const filtered = examples.filter((e) => e.id !== exampleId);
    if (filtered.length === examples.length) return false;

    saveMode({ ...mode, examples: filtered });
    return true;
}

function deleteMode(id) {
    const filePath = path.join(USER_MODES_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return false;
    try {
        fs.unlinkSync(filePath);
        const historyDir = path.join(USER_MODES_DIR, '.history', id);
        if (fs.existsSync(historyDir)) {
            fs.rmSync(historyDir, { recursive: true });
        }
        return true;
    } catch {
        return false;
    }
}

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
    getModeHistory,
    restoreModeVersion,
    addFeedbackExample,
    deleteFeedbackExample,
    MAX_FEEDBACK_EXAMPLES,
};
