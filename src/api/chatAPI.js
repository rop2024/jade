/**
 * Typed bridge to the Electron preload API (`window.api`).
 * Provides JSDoc declarations so the renderer is not untyped when talking
 * to Electron. Outside Electron, calls degrade gracefully.
 */

const NOT_IN_ELECTRON = 'This feature requires the desktop app (not a browser).';

/**
 * @typedef {Object} ChatTokenPayload
 * @property {string} requestId
 * @property {string} token
 * @property {string} [filePath]
 */

/**
 * @typedef {Object} ChatDonePayload
 * @property {string} requestId
 */

/**
 * @typedef {Object} ChatErrorPayload
 * @property {string} requestId
 * @property {string} message
 * @property {string} code
 */

/**
 * @typedef {Object} Conversation
 * @property {string} id
 * @property {string} title
 * @property {string|null} mode_id
 * @property {string|null} model
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} conversation_id
 * @property {string} role
 * @property {string} content
 * @property {string} created_at
 */

/**
 * @typedef {Object} Mode
 * @property {string} id
 * @property {string} name
 * @property {string} slash
 * @property {string} model
 * @property {number} temperature
 * @property {string} system
 * @property {string} template
 * @property {Array<string>} rules
 * @property {Array<{input: string, output: string}>} examples
 * @property {Object} output
 * @property {string|null} _source
 */

/**
 * @typedef {Object} OllamaStatus
 * @property {boolean} available
 * @property {Array<{name: string}>} models
 */

/**
 * @typedef {Object} ChatAPI
 * @property {(payload: { model: string, messages: Array<{role: string, content: string}>, conversationId?: string, firstUserMessage?: string, modeId?: string, temperature?: number }) => Promise<{ requestId: string }>} chatStart
 * @property {(requestId: string) => void} chatStop
 * @property {(callback: (payload: ChatTokenPayload) => void) => () => void} onToken
 * @property {(callback: (payload: ChatDonePayload) => void) => () => void} onDone
 * @property {(callback: (payload: ChatErrorPayload) => void) => () => void} onError
 * @property {() => Promise<OllamaStatus>} ollamaStatus
 * @property {() => Promise<Array<Conversation>>} conversationList
 * @property {(id: string) => Promise<Conversation|null>} conversationGet
 * @property {(payload: { title: string, mode_id?: string|null, model?: string|null }) => Promise<Conversation>} conversationCreate
 * @property {(id: string, title: string) => Promise<Conversation>} conversationRename
 * @property {(id: string) => Promise<boolean>} conversationDelete
 * @property {(id: string, modeId: string|null) => Promise<{updated: boolean}>} conversationSetMode
 * @property {(conversationId: string) => Promise<Array<Message>>} conversationMessages
 * @property {(payload: { id: string, conversationId: string, role: string, content: string, createdAt: string }) => Promise<{id:string,conversationId:string,role:string,content:string,created_at:string}>} messageSave
 * @property {(id: string, content: string) => void} messageUpdate
 * @property {(id: string) => Promise<{deleted: boolean}>} messageDelete
 * @property {(query: string) => Promise<Array<Message>>} messageSearch
 * @property {() => Promise<Array<Mode>>} modeList
 * @property {(id: string) => Promise<Mode|null>} modeGet
 * @property {(mode: Mode) => Promise<Mode>} modeSave
 * @property {(id: string) => Promise<boolean>} modeDelete
 * @property {() => Promise<string>} contextGet
 * @property {(content: string) => Promise<string>} contextSet
 * @property {(fact: string) => Promise<string>} contextAppendFact
 * @property {(text: string) => Promise<number>} contextCountWords
 * @property {({ mode: Mode, aboutMe: string, history: Array<{role:string,content:string}> }) => Promise<Array<{role:string,content:string}>>} contextBuildMessages
 * @property {(key: string) => Promise<string|null>} settingGet
 * @property {(key: string, value: string) => Promise<{success: boolean}>} settingSet
 */

/** @type {ChatAPI | null} */
let api = null;

function getApi() {
    if (api) return api;
    if (typeof window !== 'undefined' && window.api) {
        api = window.api;
        return api;
    }
    return null;
}

function stub() {
    return () => {
        throw new Error(NOT_IN_ELECTRON);
    };
}

function stubPromise() {
    return async () => {
        throw new Error(NOT_IN_ELECTRON);
    };
}

/**
 * Start a streaming chat generation. Returns the assigned request ID.
 * @param {Object} payload
 * @param {string} payload.model
 * @param {Array<{role:string,content:string}>} payload.messages
 * @param {string} [payload.conversationId]
 * @param {string} [payload.firstUserMessage]
 * @returns {Promise<{ requestId: string }>}
 */
export async function chatStart(payload) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.chatStart(payload);
}

/**
 * Stop an in-flight chat generation by request ID.
 * @param {string} requestId
 */
export function chatStop(requestId) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    a.chatStop(requestId);
}

/**
 * Read the temporary Markdown response backing a live chat stream.
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export async function chatReadFile(filePath) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.chatReadFile(filePath);
}

/**
 * Subscribe to streaming text tokens. Returns an unsubscribe function.
 * @param {(payload: ChatTokenPayload) => void} callback
 * @returns {() => void}
 */
export function onToken(callback) {
    const a = getApi();
    if (!a) return stub();
    return a.onToken(callback);
}

/**
 * Subscribe to stream completion. Returns an unsubscribe function.
 * @param {(payload: ChatDonePayload) => void} callback
 * @returns {() => void}
 */
export function onDone(callback) {
    const a = getApi();
    if (!a) return stub();
    return a.onDone(callback);
}

/**
 * Subscribe to stream errors. Returns an unsubscribe function.
 * @param {(payload: ChatErrorPayload) => void} callback
 * @returns {() => void}
 */
export function onError(callback) {
    const a = getApi();
    if (!a) return stub();
    return a.onError(callback);
}

/**
 * Check whether Ollama is running and list installed models.
 * @returns {Promise<OllamaStatus>}
 */
export async function ollamaStatus() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.ollamaStatus();
}

/* ============================================
 * Conversations
 * ============================================ */

/** @returns {Promise<Array<Conversation>>} */
export async function conversationList() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.conversationList();
}

/** @param {string} id @returns {Promise<Conversation|null>} */
export async function conversationGet(id) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.conversationGet(id);
}

/**
 * @param {{title:string, mode_id?:string|null, model?:string|null}} payload
 * @returns {Promise<Conversation>}
 */
export async function conversationCreate(payload) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.conversationCreate(payload);
}

/** @param {string} id @param {string} title @returns {Promise<Conversation>} */
export async function conversationRename(id, title) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.conversationRename(id, title);
}

/** @param {string} id @returns {Promise<boolean>} */
export async function conversationDelete(id) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.conversationDelete(id);
}

/** @param {string} id @param {string|null} modeId @returns {Promise<{updated: boolean}>} */
export async function conversationSetMode(id, modeId) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.conversationSetMode(id, modeId);
}

/* ============================================
 * Messages
 * ============================================ */

/** @param {string} conversationId @returns {Promise<Array<Message>>} */
export async function conversationMessages(conversationId) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.conversationMessages(conversationId);
}

/**
 * @param {{id:string, conversationId:string, role:string, content:string, createdAt:string}} payload
 * @returns {Promise<{id:string,conversationId:string,role:string,content:string,created_at:string}>}
 */
export async function messageSave(payload) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.messageSave(payload);
}

/** @param {string} id @param {string} content */
export function messageUpdate(id, content) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    a.messageUpdate(id, content);
}

/** @param {string} id @returns {Promise<{deleted: boolean}>} */
export async function messageDelete(id) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.messageDelete(id);
}

/** @param {string} query @returns {Promise<Array<Message>>} */
export async function messageSearch(query) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.messageSearch(query);
}

/* ============================================
 * Modes
 * ============================================ */

/** @returns {Promise<Array<Mode>>} */
export async function modeList() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.modeList();
}

/** @param {string} id @returns {Promise<Mode|null>} */
export async function modeGet(id) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.modeGet(id);
}

/** @param {Mode} mode @returns {Promise<Mode>} */
export async function modeSave(mode) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.modeSave(mode);
}

/** @param {string} id @returns {Promise<boolean>} */
export async function modeDelete(id) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.modeDelete(id);
}

/* ============================================
 * Personal context + prompt assembly
 * ============================================ */

/** @returns {Promise<string>} */
export async function contextGet() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.contextGet();
}

/** @param {string} content @returns {Promise<string>} */
export async function contextSet(content) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.contextSet(content);
}

/** @param {string} fact @returns {Promise<string>} */
export async function contextAppendFact(fact) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.contextAppendFact(fact);
}

/** @param {string} text @returns {Promise<number>} */
export async function contextCountWords(text) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.contextCountWords(text);
}

/**
 * Assemble the mode-aware message array in the main process (single place).
 * @param {{ mode: Mode, aboutMe: string, history: Array<{role:string,content:string}> }} payload
 * @returns {Promise<Array<{role:string,content:string}>>}
 */
export async function contextBuildMessages({ mode, aboutMe, history }) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.contextBuildMessages({ mode, aboutMe, history });
}

/* ============================================
 * Vault configuration
 * ============================================ */

/** @returns {Promise<{vaultPath: string|null}>} */
export async function vaultGet() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.vaultGet();
}

/** @param {string} vaultPath @returns {Promise<{success: boolean}>} */
export async function vaultSet(vaultPath) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.vaultSet(vaultPath);
}

/** @returns {Promise<{canceled: boolean, vaultPath: string|null}>} */
export async function vaultPick() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.vaultPick();
}

/* ============================================
 * Notes
 * ============================================ */

/**
 * @param {{vault:string, folder:string, title:string, body:string, tags:Array<string>}} payload
 * @returns {Promise<{path:string, title:string}>}
 */
export async function noteSave(payload) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.noteSave(payload);
}

/** @param {string} vault @returns {Promise<Array<string>>} */
export async function noteListTitles(vault) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.noteListTitles(vault);
}

/* ============================================
 * Commands
 * ============================================ */

/**
 * @param {string} input
 * @param {Array<{id:string, slash:string, name:string, ...}>} modes
 * @returns {Promise<{command:string|null, args:string, type:string|null, modeId:string|null, content:string}>}
 */
export async function commandParse(input, modes) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.commandParse(input, modes);
}

/* ============================================
 * File import
 * ============================================ */

/**
 * @param {File} file - File object from a drag/drop or input event.
 * @returns {Promise<string>} Absolute file path.
 */
export async function getPathForFile(file) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.getPathForFile(file);
}

/**
 * @param {string} filePath
 * @returns {Promise<{filename:string, content:string, wordCount:number, fileType:string}>}
 */
export async function fileParse(filePath) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.fileParse(filePath);
}

/**
 * @param {{text:string, maxWords?:number, detectDates?:boolean}} payload
 * @returns {Promise<Array<{index:number, text:string, words:number, date:string|null, heading:string|null}>>}
 */
export async function fileChunk({ text, maxWords, detectDates }) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.fileChunk({ text, maxWords, detectDates });
}

/** @param {string} text @returns {Promise<Array<{date:string|null, heading:string|null, content:string}>>} */
export async function fileDetectDates(text) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.fileDetectDates(text);
}

/** @param {string} text @returns {Promise<{words:number, tokens:number}>} */
export async function fileEstimateTokens(text) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.fileEstimateTokens(text);
}

/** @param {string} filePath @returns {Promise<{supported:boolean, fileType:string}>} */
export async function fileIsSupported(filePath) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.fileIsSupported(filePath);
}

/* ============================================
 * Document processing (map-reduce, batch, watch)
 * ============================================ */

/**
 * @param {{filePath:string, model:string, modeId?:string, jobId:string}} payload
 * @returns {Promise<{success:boolean}|{cancelled:boolean}|{success:boolean,error:string}>}
 */
export async function documentProcess(payload) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.documentProcess(payload);
}

/** @param {{jobId:string}} payload */
export function documentCancel(payload) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    a.documentCancel(payload);
}

/**
 * @param {{jobId:string, model:string, modeId?:string, folder:string}} payload
 * @returns {Promise<{success:boolean}|{cancelled:boolean}|{success:boolean,error:string}>}
 */
export async function batchProcess(payload) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.batchProcess(payload);
}

/** @param {{jobId:string}} payload */
export function batchCancel(payload) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    a.batchCancel(payload);
}

/**
 * @param {{folder:string}} payload
 * @returns {Promise<{watching:boolean}>}
 */
export async function watchStart(payload) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.watchStart(payload);
}

/**
 * @param {{folder:string}} payload
 * @returns {Promise<{stopped:boolean}>}
 */
export async function watchStop(payload) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.watchStop(payload);
}

/**
 * @param {{filePath:string}} payload
 * @returns {Promise<{approved:boolean,filePath:string,vault:string|null}>}
 */
export async function watchApprove(payload) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.watchApprove(payload);
}

/* ============================================
 * Document processing event subscriptions
 * ============================================ */

/** @param {(payload:any) => void} callback @returns {() => void} */
export function onDocumentProgress(callback) {
    const a = getApi();
    if (!a) return () => {};
    return a.onDocumentProgress(callback);
}

/** @param {(payload:any) => void} callback @returns {() => void} */
export function onDocumentDone(callback) {
    const a = getApi();
    if (!a) return () => {};
    return a.onDocumentDone(callback);
}

/** @param {(payload:any) => void} callback @returns {() => void} */
export function onDocumentError(callback) {
    const a = getApi();
    if (!a) return () => {};
    return a.onDocumentError(callback);
}

/** @param {(payload:any) => void} callback @returns {() => void} */
export function onDocumentCancelled(callback) {
    const a = getApi();
    if (!a) return () => {};
    return a.onDocumentCancelled(callback);
}

/** @param {(payload:any) => void} callback @returns {() => void} */
export function onBatchProgress(callback) {
    const a = getApi();
    if (!a) return () => {};
    return a.onBatchProgress(callback);
}

/** @param {(payload:any) => void} callback @returns {() => void} */
export function onBatchDone(callback) {
    const a = getApi();
    if (!a) return () => {};
    return a.onBatchDone(callback);
}

/** @param {(payload:any) => void} callback @returns {() => void} */
export function onBatchError(callback) {
    const a = getApi();
    if (!a) return () => {};
    return a.onBatchError(callback);
}

/** @param {(payload:any) => void} callback @returns {() => void} */
export function onWatchDetected(callback) {
    const a = getApi();
    if (!a) return () => {};
    return a.onWatchDetected(callback);
}

/* ============================================
 * RAG (vault search + retrieval-augmented generation)
 * ============================================ */

/**
 * @param {{vaultPath:string, excludedFolders:Array<string>}} payload
 * @returns {Promise<{started:boolean}|{error:string}>}
 */
export async function ragIndex(payload) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.ragIndex(payload);
}

/** @returns {Promise<{stopped:boolean}>} */
export async function ragStop() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.ragStop();
}

/** @returns {Promise<{status:string,current:number,total:number,file:string}>} */
export async function ragStatus() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.ragStatus();
}

/** @returns {Promise<{count:number}>} */
export async function ragChunkCount() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.ragChunkCount();
}

/**
 * @param {string} query
 * @param {string} vaultPath
 * @param {number} [topK]
 * @returns {Promise<{results:Array<{id:string,path:string,heading:string|null,text:string,similarity:number,sourcePath:string,sourceHeading:string|null}>}>}
 */
export async function ragSearch(query, vaultPath, topK) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.ragSearch(query, vaultPath, topK);
}

/**
 * @param {string} query
 * @param {Array<{path:string,heading:string|null,text:string,similarity:number}>} chunks
 * @param {string} aboutMe
 * @returns {Promise<{prompt:string}>}
 */
export async function ragBuildPrompt(query, chunks, aboutMe) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.ragBuildPrompt(query, chunks, aboutMe);
}

/** @param {string} filePath @returns {Promise<{removed:boolean}>} */
export async function ragRemoveFile(filePath) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.ragRemoveFile(filePath);
}

/** @param {(payload:any) => void} callback @returns {() => void} */
export function onRAGProgress(callback) {
    const a = getApi();
    if (!a) return () => {};
    return a.onRAGProgress(callback);
}

/** @param {(payload:any) => void} callback @returns {() => void} */
export function onRAGDone(callback) {
    const a = getApi();
    if (!a) return () => {};
    return a.onRAGDone(callback);
}

/** @param {(payload:any) => void} callback @returns {() => void} */
export function onRAGError(callback) {
    const a = getApi();
    if (!a) return () => {};
    return a.onRAGError(callback);
}

/** @param {(payload:any) => void} callback @returns {() => void} */
export function onRAGIdle(callback) {
    const a = getApi();
    if (!a) return () => {};
    return a.onRAGIdle(callback);
}

/* ============================================
 * Phase 8: Productivity extras
 * ============================================ */

/**
 * @returns {Promise<{registered:boolean}>}
 */
export async function hotkeyRegister() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.hotkeyRegister();
}

/**
 * @returns {Promise<{unregistered:boolean}>}
 */
export async function hotkeyUnregister() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.hotkeyUnregister();
}

/**
 * @returns {Promise<{toggled:boolean}>}
 */
export async function hotkeyToggleQuickWindow() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.hotkeyToggleQuickWindow();
}

/**
 * @returns {Promise<{visible:boolean}>}
 */
export async function hotkeyIsQuickWindowVisible() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.hotkeyIsQuickWindowVisible();
}

/**
 * @returns {Promise<{text:string}>}
 */
export async function clipboardRead() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.clipboardRead();
}

/**
 * @param {string} text
 * @returns {Promise<{written:boolean}>}
 */
export async function clipboardWrite(text) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.clipboardWrite(text);
}

/**
 * @param {string} text
 * @returns {Promise<{opened:boolean}>}
 */
export async function clipboardProcessAndOpen(text) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.clipboardProcessAndOpen(text);
}

/**
 * @returns {Promise<{created:boolean}>}
 */
export async function trayCreate() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.trayCreate();
}

/**
 * @returns {Promise<{destroyed:boolean}>}
 */
export async function trayDestroy() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.trayDestroy();
}

/**
 * @returns {Promise<{hidden:boolean}>}
 */
export async function windowHide() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.windowHide();
}

/**
 * @returns {Promise<{enabled:boolean}>}
 */
export async function startupGet() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.startupGet();
}

/**
 * @param {boolean} enabled
 * @returns {Promise<{success:boolean,enabled:boolean}|{success:boolean,error:string}>}
 */
export async function startupSet(enabled) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.startupSet(enabled);
}

/**
 * @param {string} [model]
 * @returns {Promise<{success:boolean,error?:string}>}
 */
export async function ollamaWarmUp(model) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.ollamaWarmUp(model);
}

/**
 * @returns {Promise<{available:boolean}>}
 */
export async function ollamaCheckAvailable() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.ollamaCheckAvailable();
}

/**
 * @param {string} [outputPath]
 * @returns {Promise<{success:boolean,path?:string,error?:string}>}
 */
export async function backupCreate(outputPath) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.backupCreate(outputPath);
}

/**
 * @param {string} zipPath
 * @returns {Promise<{success:boolean,error?:string}>}
 */
export async function backupRestore(zipPath) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.backupRestore(zipPath);
}

/**
 * @returns {Promise<{path:string}>}
 */
export async function backupGetDefaultPath() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.backupGetDefaultPath();
}

/**
 * @returns {Promise<{configured:boolean}>}
 */
export async function lockIsConfigured() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.lockIsConfigured();
}

/**
 * @param {string} password
 * @returns {Promise<{set:boolean}>}
 */
export async function lockSet(password) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.lockSet(password);
}

/**
 * @returns {Promise<{removed:boolean}>}
 */
export async function lockRemove() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.lockRemove();
}

/**
 * @param {string} password
 * @returns {Promise<{valid:boolean}>}
 */
export async function lockCheck(password) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.lockCheck(password);
}

/**
 * @param {string} password
 * @returns {Promise<{unlocked:boolean}>}
 */
export async function lockRequireUnlock(password) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.lockRequireUnlock(password);
}

/**
 * @returns {Promise<{opened:boolean}>}
 */
export async function ollamaOpenInstallLink() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.ollamaOpenInstallLink();
}

/**
 * Start Ollama if it is not already running.
 * @returns {Promise<{started:boolean,available:boolean,error?:string}>}
 */
export async function ollamaStart() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.ollamaStart();
}

/* ============================================
 * Settings
 * ============================================ */

/** @returns {Promise<Object>} */
export async function settingsGetAll() {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.getSettings();
}

/** @param {string} key @returns {Promise<string|null>} */
export async function settingGet(key) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.settingGet(key);
}

/** @param {string} key @param {string} value */
export async function settingSet(key, value) {
    const a = getApi();
    if (!a) throw new Error(NOT_IN_ELECTRON);
    return a.settingSet(key, value);
}

export const isElectron = !!getApi();

export default {
    chatStart,
    chatStop,
    onToken,
    onDone,
    onError,
    ollamaStatus,
    conversationList,
    conversationGet,
    conversationCreate,
    conversationRename,
    conversationDelete,
    conversationMessages,
    messageSave,
    messageUpdate,
    messageDelete,
    messageSearch,
    conversationSetMode,
    modeList,
    modeGet,
    modeSave,
    modeDelete,
    contextGet,
    contextSet,
    contextAppendFact,
    contextCountWords,
    contextBuildMessages,
    vaultGet,
    vaultSet,
    vaultPick,
    noteSave,
    noteListTitles,
    commandParse,
    getPathForFile,
    fileParse,
    fileChunk,
    fileDetectDates,
    fileEstimateTokens,
    fileIsSupported,
    documentProcess,
    documentCancel,
    batchProcess,
    batchCancel,
    watchStart,
    watchStop,
    watchApprove,
    onDocumentProgress,
    onDocumentDone,
    onDocumentError,
    onDocumentCancelled,
    onBatchProgress,
    onBatchDone,
    onBatchError,
    onWatchDetected,
    ragIndex,
    ragStop,
    ragStatus,
    ragChunkCount,
    ragSearch,
    ragBuildPrompt,
    ragRemoveFile,
    onRAGProgress,
    onRAGDone,
    onRAGError,
    onRAGIdle,
    hotkeyRegister,
    hotkeyUnregister,
    hotkeyToggleQuickWindow,
    hotkeyIsQuickWindowVisible,
    clipboardRead,
    clipboardWrite,
    clipboardProcessAndOpen,
    trayCreate,
    trayDestroy,
    windowHide,
    startupGet,
    startupSet,
    ollamaWarmUp,
    ollamaCheckAvailable,
    backupCreate,
    backupRestore,
    backupGetDefaultPath,
    lockIsConfigured,
    lockSet,
    lockRemove,
    lockCheck,
    lockRequireUnlock,
    ollamaOpenInstallLink,
    ollamaStart,
    settingsGetAll,
    settingGet,
    settingSet,
    isElectron,
};
