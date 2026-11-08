const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const ABOUT_ME_PATH = path.join(app.getPath('userData'), 'about-me.md');

const DEFAULT_ABOUT_ME = `# About Me

## Background
I use LLMDesk as my personal productivity assistant.

## Technical Skills
- JavaScript / TypeScript
- Electron + React
- Node.js
- SQLite

## Current Goals
- Ship LLMDesk phases 1 through 4
- Build a personal knowledge system

## Projects
- LLMDesk — local-first AI desktop assistant

## Preferred Response Style
- Concise and technical
- Use markdown formatting
- Prefer bullets over long paragraphs

## Important Workflow Rules
- Never invent information
- Ask before making destructive changes
`;

function ensureAboutMe() {
    if (!fs.existsSync(ABOUT_ME_PATH)) {
        fs.writeFileSync(ABOUT_ME_PATH, DEFAULT_ABOUT_ME, 'utf-8');
    }
    return ABOUT_ME_PATH;
}

/**
 * Read the personal context file (about-me.md). Creates a default if missing.
 * @returns {string}
 */
function getAboutMe() {
    ensureAboutMe();
    return fs.readFileSync(ABOUT_ME_PATH, 'utf-8');
}

/**
 * Append a confirmed fact to about-me.md under a "Remembered facts" section.
 * @param {string} fact
 * @returns {string} the updated about-me content
 */
function appendFact(fact) {
    ensureAboutMe();
    let content = fs.readFileSync(ABOUT_ME_PATH, 'utf-8');
    const sectionHeader = '\n## Remembered facts\n';
    const marker = sectionHeader;

    if (!content.includes(marker)) {
        content = content.endsWith('\n') ? content + marker : content + '\n' + marker;
    } else {
        content = content + (content.endsWith('\n') ? '' : '\n');
    }

    const line = `- ${fact}`;
    content = content + line + '\n';
    fs.writeFileSync(ABOUT_ME_PATH, content, 'utf-8');
    return content;
}

/**
 * Set the entire about-me content.
 * @param {string} content
 * @returns {string}
 */
function setAboutMe(content) {
    ensureAboutMe();
    fs.writeFileSync(ABOUT_ME_PATH, content, 'utf-8');
    return content;
}

/**
 * Count words in a string.
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Assemble the full message array sent to Ollama for a mode-driven chat.
 * Prompt order:
 *  1. Personal context
 *  2. Mode instructions
 *  3. Output template
 *  4. Mode rules
 *  5. Few-shot examples
 *  6. Conversation history
 *
 * @param {Object} mode
 * @param {string} mode.system
 * @param {string} mode.template
 * @param {Array<string>} mode.rules
 * @param {Array<{input:string,output:string}>} mode.examples
 * @param {string} aboutMe
 * @param {Array<{role:string,content:string}>} history
 * @returns {Array<{role:string,content:string}>}
 */
function buildMessages(mode, aboutMe, history) {
    const sections = [];

    sections.push('## Personal Context\n' + (aboutMe || 'No personal context provided.'));
    sections.push('## Mode Instructions\n' + (mode && mode.system ? mode.system : 'You are a helpful assistant.'));

    if (mode && mode.template) {
        sections.push('## Output Template\n' + mode.template);
    }

    if (mode && mode.rules && mode.rules.length) {
        sections.push('## Rules\n' + mode.rules.map((r) => `- ${r}`).join('\n'));
    }

    if (mode && mode.examples && mode.examples.length) {
        const exampleText = mode.examples
            .map((ex) => `Input: ${ex.input}\nOutput: ${ex.output}`)
            .join('\n\n');
        sections.push('## Examples\n' + exampleText);
    }

    const systemContent = sections.join('\n\n');
    const messages = [{ role: 'system', content: systemContent }];

    if (history && Array.isArray(history)) {
        for (const m of history) {
            if (m.role === 'user' || m.role === 'assistant') {
                messages.push({ role: m.role, content: m.content });
            }
        }
    }

    return messages;
}

module.exports = {
    ABOUT_ME_PATH,
    ensureAboutMe,
    getAboutMe,
    appendFact,
    setAboutMe,
    countWords,
    buildMessages,
    DEFAULT_ABOUT_ME,
};
