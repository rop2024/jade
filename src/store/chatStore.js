import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
    messages: [],
    input: '',
    loading: false,
    requestId: null,
    streaming: false,
    error: null,

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
}));
