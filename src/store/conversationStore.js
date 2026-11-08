import { create } from 'zustand';
import {
    chatStart,
    chatStop,
    onToken,
    onDone,
    onError,
    ollamaStatus,
    conversationList,
    conversationCreate,
    conversationRename,
    conversationDelete,
    conversationSetMode,
    conversationMessages,
    messageSave,
    messageUpdate,
    messageDelete,
    messageSearch,
    modeList,
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
    settingGet,
    settingSet,
    isElectron,
} from '../api/chatAPI';

export const useConversationStore = create((set, get) => ({
    conversations: [],
    activeConversationId: null,
    messages: [],
    input: '',
    loading: false,
    requestId: null,
    streaming: false,
    error: null,
    systemPrompt: 'You are a helpful assistant.',

    // ----- Models / presets -----
    models: [],
    modelPresets: { fast: null, deep: null },
    selectedModelKey: 'fast',

    loadModels: async () => {
        try {
            const { models } = await ollamaStatus();
            set({ models });
            return models;
        } catch (err) {
            console.error('Failed to load models:', err);
            set({ models: [] });
            return [];
        }
    },

    setSelectedModelKey: (key) => {
        set({ selectedModelKey: key });
    },

    setModelPreset: async (key, model) => {
        await settingSet(`model_preset_${key}`, model);
        set((state) => ({
            modelPresets: { ...state.modelPresets, [key]: model },
        }));
    },

    getSelectedModel: () => {
        const { selectedModelKey, modelPresets } = get();
        if (selectedModelKey === 'fast' || selectedModelKey === 'deep') {
            return modelPresets[selectedModelKey] || null;
        }
        return selectedModelKey;
    },

    loadModelPresets: async () => {
        try {
            const fast = await settingGet('model_preset_fast');
            const deep = await settingGet('model_preset_deep');
            set({ modelPresets: { fast, deep } });
            return { fast, deep };
        } catch {
            return { fast: null, deep: null };
        }
    },

    // ----- Modes -----
    modes: [],
    activeModeId: null,

    loadModes: async () => {
        try {
            const modes = await modeList();
            set({ modes });
            return modes;
        } catch (err) {
            console.error('Failed to load modes:', err);
            set({ modes: [] });
            return [];
        }
    },

    saveMode: async (mode) => {
        const saved = await modeSave(mode);
        set((state) => {
            const existing = state.modes.findIndex((m) => m.id === saved.id);
            const updated = [...state.modes];
            if (existing === -1) {
                updated.push(saved);
            } else {
                updated[existing] = saved;
            }
            return { modes: updated };
        });
        return saved;
    },

    deleteMode: async (id) => {
        await modeDelete(id);
        set((state) => ({
            modes: state.modes.filter((m) => m.id !== id),
            activeModeId: state.activeModeId === id ? null : state.activeModeId,
        }));
    },

    getMode: (id) => get().modes.find((m) => m.id === id) || null,

    setActiveMode: (modeId) => {
        set({ activeModeId: modeId });
        if (get().activeConversationId) {
            conversationSetMode(get().activeConversationId, modeId);
        }
    },

    // Mode stored per conversation (persisted via conversation.mode_id)
    setConversationMode: async (conversationId, modeId) => {
        await conversationSetMode(conversationId, modeId);
        set((state) => {
            if (state.activeConversationId === conversationId) {
                return { activeModeId: modeId };
            }
            return {};
        });
    },

    // ----- Personal context -----
    aboutMe: '',

    loadAboutMe: async () => {
        try {
            const content = await contextGet();
            set({ aboutMe: content });
            return content;
        } catch (err) {
            console.error('Failed to load about-me:', err);
            return '';
        }
    },

    saveAboutMe: async (content) => {
        await contextSet(content);
        set({ aboutMe: content });
    },

    appendFact: async (fact) => {
        const content = await contextAppendFact(fact);
        set({ aboutMe: content });
        return content;
    },

    countWords: async (text) => {
        try {
            return await contextCountWords(text);
        } catch {
            return (text || '').trim().split(/\s+/).filter(Boolean).length;
        }
    },

    // ----- Conversation list -----
    setConversations: (conversations) => set({ conversations }),

    loadConversations: async () => {
        try {
            const conversations = await conversationList();
            set({ conversations });
            return conversations;
        } catch (err) {
            console.error('Failed to load conversations:', err);
            return [];
        }
    },

    createConversation: async ({ title, mode_id, model }) => {
        const conversation = await conversationCreate({ title, mode_id, model });
        set((state) => ({
            conversations: [conversation, ...state.conversations],
        }));
        return conversation;
    },

    renameConversation: async (id, title) => {
        await conversationRename(id, title);
        set((state) => ({
            conversations: state.conversations.map((c) =>
                c.id === id ? { ...c, title, updated_at: new Date().toISOString() } : c
            ),
        }));
    },

    deleteConversation: async (id) => {
        await conversationDelete(id);
        set((state) => {
            let nextActive = state.activeConversationId;
            if (nextActive === id) nextActive = null;
            return {
                conversations: state.conversations.filter((c) => c.id !== id),
                activeConversationId: nextActive,
                activeModeId: nextActive === null ? null : state.activeModeId,
                messages: nextActive === null ? [] : state.messages,
            };
        });
    },

    // ----- Active conversation -----
    setActiveConversation: async (conversationId) => {
        set({ activeConversationId: conversationId, messages: [], error: null });
        if (!conversationId) {
            set({ activeModeId: null });
            return;
        }
        try {
            const messages = await conversationMessages(conversationId);
            const conversation = get().conversations.find((c) => c.id === conversationId);
            set({ messages, activeModeId: conversation ? conversation.mode_id || null : null });
        } catch (err) {
            console.error('Failed to load messages:', err);
            set({ error: 'Failed to load conversation messages.' });
        }
    },

    // ----- Ephemeral chat state -----
    setInput: (input) => set({ input }),

    setMessages: (messages) => set({ messages }),

    addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

    replaceLastMessage: (message) =>
        set((state) => {
            const messages = [...state.messages];
            messages[messages.length - 1] = message;
            return { messages };
        }),

    appendToken: (token) =>
        set((state) => {
            const messages = [...state.messages];
            const last = messages[messages.length - 1];
            if (last && last.role === 'assistant') {
                last.content += token;
            } else {
                messages.push({ id: crypto.randomUUID(), role: 'assistant', content: token });
            }
            return { messages };
        }),

    startStream: (requestId) =>
        set({
            loading: true,
            streaming: true,
            requestId,
            error: null,
        }),

    finishStream: () =>
        set({
            loading: false,
            streaming: false,
            requestId: null,
        }),

    setError: (error) =>
        set({
            error,
            loading: false,
            streaming: false,
            requestId: null,
        }),

    stopStream: () =>
        set({
            loading: false,
            streaming: false,
            requestId: null,
        }),

    reset: () =>
        set({
            messages: [],
            input: '',
            loading: false,
            requestId: null,
            streaming: false,
            error: null,
        }),

    // ----- Message mutation (regenerate / edit) -----
    updateMessageContent: async (id, content) => {
        await messageUpdate(id, content);
        set((state) => ({
            messages: state.messages.map((m) =>
                m.id === id ? { ...m, content } : m
            ),
        }));
    },

    removeMessagesAfter: async (messageId) => {
        const { messages } = get();
        const idx = messages.findIndex((m) => m.id === messageId);
        if (idx === -1) return;
        const toRemove = messages.slice(idx + 1);
        await Promise.all(toRemove.map((m) => messageDelete(m.id)));
        set((state) => ({
            messages: state.messages.slice(0, idx + 1),
        }));
    },

    removeMessageAndAfter: async (messageId) => {
        const { messages } = get();
        const idx = messages.findIndex((m) => m.id === messageId);
        if (idx === -1) return;
        const toRemove = messages.slice(idx);
        await Promise.all(toRemove.map((m) => messageDelete(m.id)));
        set((state) => ({
            messages: state.messages.slice(0, idx),
        }));
    },

    // ----- Search -----
    searchMessages: async (query) => {
        try {
            return await messageSearch(query);
        } catch (err) {
            console.error('Search failed:', err);
            return [];
        }
    },

    // ----- Settings -----
    loadSystemPrompt: async () => {
        try {
            const value = await settingGet('system_prompt');
            if (value) set({ systemPrompt: value });
            return value;
        } catch {
            return null;
        }
    },

    saveSystemPrompt: async (value) => {
        await settingSet('system_prompt', value);
        set({ systemPrompt: value });
    },

    // ----- Vault -----
    vaultGet: async () => {
        try {
            return await vaultGet();
        } catch {
            return { vaultPath: null };
        }
    },

    vaultSet: async (vaultPath) => {
        return await vaultSet(vaultPath);
    },

    vaultPick: async () => {
        return await vaultPick();
    },

    // ----- File attachments -----
    attachments: [],

    addAttachment: (attachment) =>
        set((state) => ({
            attachments: [...state.attachments.filter((a) => a.id !== attachment.id), attachment],
        })),

    removeAttachment: (id) =>
        set((state) => ({
            attachments: state.attachments.filter((a) => a.id !== id),
        })),

    clearAttachments: () => set({ attachments: [] }),

    setAttachments: (attachments) => set({ attachments }),

    // ----- File import helpers -----
    importFile: async (file) => {
        const filePath = await getPathForFile(file);
        const parsed = await fileParse(filePath);
        return {
            ...parsed,
            id: crypto.randomUUID(),
            filePath,
        };
    },

    chunkFileContent: async ({ text, maxWords = 1500, detectDates = true }) => {
        return await fileChunk({ text, maxWords, detectDates });
    },

    // ----- Document processing -----
    processing: null,

    setProcessing: (processing) => set({ processing }),

    clearProcessing: () => set({ processing: null }),

    processDocument: async (payload) => {
        return await documentProcess(payload);
    },

    cancelDocument: (payload) => {
        documentCancel(payload);
    },

    processBatch: async (payload) => {
        return await batchProcess(payload);
    },

    cancelBatch: (payload) => {
        batchCancel(payload);
    },

    startWatch: async (payload) => {
        return await watchStart(payload);
    },

    stopWatch: async (payload) => {
        return await watchStop(payload);
    },

    approveWatch: async (payload) => {
        return await watchApprove(payload);
    },
}));

