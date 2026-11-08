import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useConversationStore } from '../../store/conversationStore';
import {
    chatStart,
    chatStop,
    onToken,
    onDone,
    onError,
    ollamaStatus,
    contextBuildMessages,
    ragSearch,
    ragBuildPrompt,
    onRAGDone,
    onRAGError,
} from '../../api/chatAPI';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SaveToVaultDialog } from './SaveToVaultDialog';
import { AttachFileDialog } from '../files/AttachFileDialog';

export function ChatView() {
    const {
        messages,
        input,
        loading,
        streaming,
        error,
        activeConversationId,
        activeModeId,
        setInput,
        addMessage,
        appendToken,
        startStream,
        finishStream,
        setError,
        stopStream,
        setActiveConversation,
        createConversation,
        messageSave,
        setConversationMode,
        modes,
        loadModes,
        loadAboutMe,
        aboutMe,
        getMode,
        updateMessageContent,
        removeMessagesAfter,
        removeMessageAndAfter,
        appendFact,
        attachments,
        addAttachment,
        removeAttachment,
        clearAttachments,
        importFile,
        chunkFileContent,
        useMyVault,
        searchRAG,
        buildRAGPrompt,
        vaultGet,
        addFeedbackExample,
    } = useConversationStore();

    const assistantMessageIdRef = useRef(null);
    const assistantContentRef = useRef('');
    const currentRequestIdRef = useRef(null);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [pendingModeId, setPendingModeId] = useState(null);
    const [saveToVault, setSaveToVault] = useState({ open: false, content: '' });
    const [summariseNote, setSummariseNote] = useState({ open: false, content: '' });
    const [attachDialog, setAttachDialog] = useState(false);
    const [ragSources, setRAGSources] = useState([]);

    useEffect(() => {
        let unsubToken;
        let unsubDone;
        let unsubError;
        let unsubRAGDone;
        let unsubRAGError;

        (async () => {
            try {
                const status = await ollamaStatus();
                if (!status.available) {
                    setError('Ollama is not running.\nStart Ollama and try again.');
                }
                await loadModes();
                await loadAboutMe();
            } catch {
                setError('Ollama is not running.\nStart Ollama and try again.');
            }
        })();

        unsubToken = onToken(({ requestId, token }) => {
            currentRequestIdRef.current = requestId;
            if (assistantMessageIdRef.current === null) {
                assistantMessageIdRef.current = crypto.randomUUID();
                assistantContentRef.current = '';
                addMessage({
                    id: assistantMessageIdRef.current,
                    role: 'assistant',
                    content: '',
                });
            }
            appendToken(token);
            assistantContentRef.current += token;
        });

        unsubDone = onDone(({ requestId: doneId }) => {
            if (doneId !== currentRequestIdRef.current) return;
            const conversationId = activeConversationId;
            if (conversationId && assistantMessageIdRef.current) {
                messageSave({
                    id: assistantMessageIdRef.current,
                    conversationId,
                    role: 'assistant',
                    content: assistantContentRef.current,
                    createdAt: new Date().toISOString(),
                });
            }
            assistantMessageIdRef.current = null;
            assistantContentRef.current = '';
            currentRequestIdRef.current = null;
            finishStream();
        });

        unsubError = onError(({ requestId: errId, message }) => {
            if (errId !== currentRequestIdRef.current) return;
            assistantMessageIdRef.current = null;
            assistantContentRef.current = '';
            currentRequestIdRef.current = null;
            setError(message);
        });

        unsubRAGDone = onRAGDone(({ results, query }) => {
            setRAGSources(results);
        });

        unsubRAGError = onRAGError(({ message }) => {
            console.error('RAG error:', message);
        });

        return () => {
            unsubToken?.();
            unsubDone?.();
            unsubError?.();
            unsubRAGDone?.();
            unsubRAGError?.();
        };
    }, [
        addMessage,
        appendToken,
        messageSave,
        setError,
        finishStream,
        activeConversationId,
        loadModes,
        loadAboutMe,
    ]);

    const resolveModel = useCallback(() => {
        const mode = activeModeId ? getMode(activeModeId) : null;
        return (mode && mode.model) || 'llama3.2';
    }, [activeModeId, getMode]);

    const sendMessages = useCallback(async (conversationId, sendMessages, modeId) => {
        const mode = modeId ? getMode(modeId) : null;
        const firstUserMessage =
            sendMessages.find((m) => m.role === 'user')?.content || input;
        const { requestId: newId } = await chatStart({
            model: (mode && mode.model) || resolveModel(),
            conversationId,
            firstUserMessage,
            modeId,
            messages: sendMessages,
        });
        startStream(newId);
        currentRequestIdRef.current = newId;
    }, [input, resolveModel, getMode, startStream]);

    const handleSend = useCallback(async () => {
        if (!input.trim()) return;

        let conversationId = activeConversationId;
        if (!conversationId) {
            const created = await createConversation({
                title: input.slice(0, 40),
                model: null,
            });
            conversationId = created.id;
            await setActiveConversation(conversationId);
        } else {
            await setActiveConversation(conversationId);
        }

        // Slash command parsing: switch mode for this message.
        let modeId = activeModeId;
        let content = input;
        const slashMatch = input.match(/^\/(\S+)\s*(.*)$/);
        if (slashMatch) {
            const command = slashMatch[1];
            const rest = slashMatch[2];

            if (command === 'remember') {
                const fact = rest.trim();
                if (!fact) {
                    setError('Usage: /remember <fact>');
                    setInput('');
                    return;
                }
                if (!window.confirm(`Remember this fact?\n\n"${fact}"`)) {
                    setInput('');
                    return;
                }
                try {
                    await appendFact(fact);
                    setInput('');
                    alert('Saved to personal context.');
                } catch (err) {
                    setError('Failed to save fact: ' + err.message);
                }
                return;
            }

            content = rest;
            const matching = modes.find(
                (m) => m.slash === `/${command}` || m.id === command
            );
            if (matching) {
                modeId = matching.id;
                await setConversationMode(conversationId, matching.id);
            }
        }

        const userMessageId = crypto.randomUUID();
        const now = new Date().toISOString();

        // Build attachment context prepended to the user message.
        let attachmentContext = '';
        if (attachments.length > 0) {
            attachmentContext = '\n\n---\nAttached files:\n' +
                attachments.map((a) => `### ${a.filename}\n${a.content}`).join('\n---\n');
        }

        // RAG: when "Use My Vault" is enabled, retrieve relevant notes and
        // build a contextual prompt before sending to the model.
        let finalContent = content + attachmentContext;
        if (useMyVault) {
            try {
                const { vaultPath } = await vaultGet();
                if (vaultPath) {
                    const chunks = await searchRAG(content, vaultPath, 6);
                    if (chunks.length > 0) {
                        const { prompt } = await buildRAGPrompt(content, chunks, aboutMe);
                        finalContent = prompt + attachmentContext;
                        setRAGSources(chunks.map((c) => ({
                            path: c.sourcePath || c.path,
                            heading: c.sourceHeading || c.heading,
                            text: c.text,
                            similarity: c.similarity,
                        })));
                    } else {
                        setRAGSources([]);
                    }
                }
            } catch (err) {
                console.error('RAG retrieval failed:', err.message);
                setRAGSources([]);
            }
        } else {
            setRAGSources([]);
        }

        addMessage({ id: userMessageId, role: 'user', content, created_at: now });
        await messageSave({
            id: userMessageId,
            conversationId,
            role: 'user',
            content,
            createdAt: now,
        });

        setInput('');
        setPendingModeId(null);

        const currentMessages = useConversationStore.getState().messages;
        try {
            await sendMessages(conversationId, [
                ...currentMessages,
                { role: 'user', content: finalContent },
            ], modeId);
            clearAttachments();
        } catch (err) {
            setError(err.message || 'Failed to start chat.');
        }
    }, [
        input,
        activeConversationId,
        activeModeId,
        setActiveConversation,
        createConversation,
        addMessage,
        messageSave,
        setInput,
        setError,
        sendMessages,
        modes,
        setConversationMode,
        setPendingModeId,
        attachments,
        clearAttachments,
        useMyVault,
        searchRAG,
        buildRAGPrompt,
        vaultGet,
        aboutMe,
    ]);

    const handleStop = useCallback(() => {
        if (currentRequestIdRef.current) {
            chatStop(currentRequestIdRef.current);
        }
        const conversationId = activeConversationId;
        if (conversationId && assistantMessageIdRef.current) {
            messageSave({
                id: assistantMessageIdRef.current,
                conversationId,
                role: 'assistant',
                content: assistantContentRef.current,
                createdAt: new Date().toISOString(),
            });
        }
        assistantMessageIdRef.current = null;
        assistantContentRef.current = '';
        currentRequestIdRef.current = null;
        stopStream();
    }, [chatStop, activeConversationId, messageSave, stopStream]);

    const handleCopy = useCallback(async (text) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Clipboard access may fail outside secure context; ignore.
        }
    }, []);

    const handleRegenerate = useCallback(async (messageId) => {
        await removeMessageAndAfter(messageId);
        const conversationId = activeConversationId;
        if (!conversationId) return;
        await setActiveConversation(conversationId);
        const currentMessages = useConversationStore.getState().messages;
        try {
            await sendMessages(conversationId, currentMessages, activeModeId);
        } catch (err) {
            setError(err.message || 'Failed to regenerate.');
        }
    }, [activeConversationId, setActiveConversation, activeModeId, sendMessages, setError, removeMessageAndAfter]);

    const handleSaveToVault = useCallback((content) => {
        setSaveToVault({ open: true, content });
    }, []);

    const handleFeedback = useCallback(async (messageId, content) => {
        if (!activeModeId) {
            setError('No active mode to save feedback example.');
            return;
        }
        try {
            await addFeedbackExample(activeModeId, {
                input: '', // We don't have the input here easily; could store it
                output: content,
                correctedOutput: content,
            });
        } catch (err) {
            setError('Failed to save feedback: ' + err.message);
        }
    }, [activeModeId, addFeedbackExample, setError]);

    const handleSummariseToNote = useCallback(async () => {
        const conversationId = activeConversationId;
        if (!conversationId) {
            setError('No conversation to summarise.');
            return;
        }
        const summaryMode = getMode('summary');
        if (!summaryMode) {
            setError('Summary mode not found.');
            return;
        }
        const currentMessages = useConversationStore.getState().messages;
        if (!currentMessages.length) {
            setError('No messages to summarise.');
            return;
        }
        try {
            const built = await contextBuildMessages({
                mode: summaryMode,
                aboutMe,
                history: currentMessages,
            });
            const { requestId } = await chatStart({
                model: summaryMode.model || 'llama3.2',
                messages: built,
                firstUserMessage: 'Summarise this conversation',
                modeId: 'summary',
            });
            let content = '';
            const unsubToken = onToken(({ requestId: rid, token }) => {
                if (rid === requestId) content += token;
            });
            const unsubDone = onDone(({ requestId: rid }) => {
                if (rid === requestId) {
                    setSummariseNote({ open: true, content });
                    unsubToken();
                    unsubDone();
                }
            });
            const unsubError = onError(({ requestId: rid, message }) => {
                if (rid === requestId) {
                    setError(message);
                    unsubToken();
                    unsubDone();
                    unsubError();
                }
            });
        } catch (err) {
            setError(err.message || 'Failed to summarise conversation.');
        }
    }, [activeConversationId, getMode, aboutMe, contextBuildMessages, chatStart, onToken, onDone, onError, setError]);

    const handleEditSave = useCallback(async (messageId, newContent) => {
        const trimmed = (newContent || '').trim();
        if (!trimmed) return;
        await updateMessageContent(messageId, trimmed);
        await removeMessagesAfter(messageId);
        const conversationId = activeConversationId;
        if (!conversationId) return;
        await setActiveConversation(conversationId);
        const currentMessages = useConversationStore.getState().messages;
        setEditingId(null);
        try {
            await sendMessages(conversationId, currentMessages, activeModeId);
        } catch (err) {
            setError(err.message || 'Failed to regenerate.');
        }
    }, [
        activeConversationId,
        setActiveConversation,
        activeModeId,
        sendMessages,
        setError,
        updateMessageContent,
        removeMessagesAfter,
    ]);

    const handleEditCancel = useCallback(() => {
        setEditingId(null);
    }, []);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                <div className="bg-red-900/30 border border-red-700 rounded-xl px-6 py-4 text-red-300 text-sm max-w-md">
                    {error}
                </div>
                <button
                    onClick={() => setError(null)}
                    className="mt-4 text-sm text-blue-400 underline"
                >
                    Dismiss
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {attachments.length > 0 && (
                <div className="px-4 py-2 overflow-x-auto space-x-2 border-b border-gray-700 bg-[#0a0f1a]/50">
                    {attachments.map((a) => (
                        <AttachmentChip
                            key={a.id}
                            attachment={a}
                            onRemove={() => removeAttachment(a.id)}
                        />
                    ))}
                    <button
                        onClick={clearAttachments}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-white rounded hover:bg-gray-700/50"
                    >
                        Clear all
                    </button>
                </div>
            )}
            <div
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => e.preventDefault()}
                onDrop={async (e) => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files || []);
                    setAttachDialog(true);
                    // Store files for the dialog to process; re-open triggers import.
                    window.__pendingDropFiles = files;
                }}
                className="flex-1 min-w-0"
            >
                <MessageList
                messages={messages}
                streaming={streaming}
                onCopy={handleCopy}
                onRegenerate={handleRegenerate}
                onEdit={(id) => {
                    const msg = messages.find((m) => m.id === id);
                    setEditContent(msg?.content || '');
                    setEditingId(id);
                }}
                onSaveToVault={handleSaveToVault}
                sources={ragSources}
                onFeedback={handleFeedback}
            />
            </div>
            {editingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#16213e] border border-gray-700 rounded-xl p-5 w-full max-w-md shadow-xl">
                        <h3 className="text-white font-semibold mb-3">Edit message</h3>
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full bg-[#1a1a2e] border border-gray-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none mb-3"
                            rows={4}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={handleEditCancel}
                                className="px-4 py-2 rounded text-gray-300 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleEditSave(editingId, editContent)}
                                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Save & regenerate
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ChatInput
                input={input}
                onChange={setInput}
                onSend={handleSend}
                onStop={handleStop}
                streaming={streaming}
                modes={modes}
                activeModeId={activeModeId}
                onModeChange={(modeId) => setPendingModeId(modeId)}
                onAttach={() => setAttachDialog(true)}
            />
            {saveToVault.open && (
                <SaveToVaultDialog
                    content={saveToVault.content}
                    open={saveToVault.open}
                    onClose={() => setSaveToVault({ open: false, content: '' })}
                    onSaved={() => {
                        setSaveToVault({ open: false, content: '' });
                    }}
                />
            )}
            {attachDialog && (
                <AttachFileDialog
                    open={attachDialog}
                    onClose={() => setAttachDialog(false)}
                    onAttach={() => {
                        setAttachDialog(false);
                    }}
                />
            )}
        </div>
    );
}
