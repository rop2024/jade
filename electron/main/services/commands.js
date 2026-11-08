/**
 * Slash command parser.
 *
 * Supports mode commands (/journal, /note, /code, etc.) and built-in
 * commands (/remember, /clear, /save). Returns a structured result the
 * chat handler can act on.
 *
 * Mode matching: a mode's `slash` field (e.g. "/journal") or its `id`.
 */

const BUILTIN_COMMANDS = new Set([
    'remember',
    'clear',
    'save',
    'help',
]);

/**
 * Parse a raw user message for a leading slash command.
 *
 * @param {string} input
 * @param {Array<{id:string, slash:string, name:string, ...}>} modes
 * @returns {{
 *   command: string|null,
 *   args: string,
 *   type: 'mode' | 'builtin' | 'unknown',
 *   modeId: string|null,
 *   content: string
 * }}
 */
function parseSlashCommand(input, modes = []) {
    const trimmed = (input || '').trim();
    const match = /^\/(\S+)\s*(.*)$/s.exec(trimmed);
    if (!match) {
        return {
            command: null,
            args: '',
            type: null,
            modeId: null,
            content: trimmed,
        };
    }

    const command = match[1];
    const args = match[2];

    // Built-in commands take priority.
    if (BUILTIN_COMMANDS.has(command.toLowerCase())) {
        return {
            command,
            args,
            type: 'builtin',
            modeId: null,
            content: args,
        };
    }

    // Mode commands: match by slash or id.
    const mode = modes.find(
        (m) =>
            (m.slash && m.slash.toLowerCase() === `/${command}`.toLowerCase()) ||
            m.id.toLowerCase() === command.toLowerCase()
    );

    if (mode) {
        return {
            command,
            args,
            type: 'mode',
            modeId: mode.id,
            content: args,
        };
    }

    return {
        command,
        args,
        type: 'unknown',
        modeId: null,
        content: trimmed,
    };
}

/**
 * Execute a built-in command against the chat store / context.
 * Returns an object describing the side effect to apply.
 *
 * @param {string} command
 * @param {string} args
 * @param {Object} deps
 * @param {Function} deps.appendFact - (fact) => Promise
 * @param {Function} deps.clearChat - () => void
 * @returns {Promise<{handled: boolean, effect?: string, message?: string}>}
 */
async function executeBuiltin(command, deps = {}) {
    const { appendFact, clearChat } = deps;
    const lower = command.toLowerCase();

    if (lower === 'remember') {
        return { handled: true, effect: 'remember', message: '' };
    }

    if (lower === 'clear') {
        if (clearChat) clearChat();
        return { handled: true, effect: 'cleared', message: 'Chat context cleared.' };
    }

    if (lower === 'save') {
        return { handled: true, effect: 'save', message: '' };
    }

    if (lower === 'help') {
        return {
            handled: true,
            effect: 'help',
            message: [
                'Available commands:',
                '/remember <fact> — Save a personal fact to your context.',
                '/clear — Clear the current chat context.',
                '/save — Save the last assistant response to the vault.',
                '/<mode> — Switch mode for this message (e.g. /journal, /note).',
            ].join('\n'),
        };
    }

    return { handled: false };
}

module.exports = {
    parseSlashCommand,
    executeBuiltin,
    BUILTIN_COMMANDS,
};
