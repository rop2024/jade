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
import { SaveToVaultDialog } from './SaveToVaultDialog';
import { AttachFileDialog } from '../files/AttachFileDialog';
import { Copy, RotateCw, Edit2, Trash2, Menu, AlertCircle, ChevronDown } from 'lucide-react';

const EMBED = /embed|nomic|bge|minilm/i;

export function ChatView() {
  const {
    messages,
    input,
    loading,
    streaming,
    error,
    activeConversationId,
    activeModeId,
    models,
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
    defaultModel,
    loadDefaultModel,
    setUseMyVault,
  } = useConversationStore();

  const assistantMessageIdRef = useRef(null);
  const assistantContentRef = useRef('');
  const currentRequestIdRef = useRef(null);
  const pendingTokenFlushRef = useRef(null);
  const activeConversationIdRef = useRef(activeConversationId);
  activeConversationIdRef.current = activeConversationId;
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [userAtBottom, setUserAtBottom] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [pendingModeId, setPendingModeId] = useState(null);
  const [saveToVault, setSaveToVault] = useState({ open: false, content: '' });
  const [summariseNote, setSummariseNote] = useState({ open: false, content: '' });
  const [attachDialog, setAttachDialog] = useState(false);
  const [ragSources, setRAGSources] = useState([]);
  const [showScrollPrompt, setShowScrollPrompt] = useState(false);

  // ============================================
  // One-time init: Ollama status, modes, context, default model
  // ============================================
  useEffect(() => {
    (async () => {
      try {
        const status = await ollamaStatus();
        if (!status.available) {
          setError('Ollama is not running.\nStart Ollama and try again.');
        }
        await loadModes();
        await loadAboutMe();
        await loadDefaultModel();
      } catch {
        setError('Ollama is not running.\nStart Ollama and try again.');
      }
    })();
  }, [loadModes, loadAboutMe, loadDefaultModel, setError]);

  // ============================================
  // Auto-scroll logic
  // ============================================
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    setUserAtBottom(isAtBottom);
    if (isAtBottom && (streaming || loading)) {
      scrollToBottom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, streaming, loading, userAtBottom]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    setUserAtBottom(isAtBottom);
    setShowScrollPrompt(!isAtBottom);
  }, []);

  // ============================================
  // Subscribe once; read current values through refs
  // ============================================
  useEffect(() => {
    let unsubToken;
    let unsubDone;
    let unsubError;
    let unsubRAGDone;
    let unsubRAGError;

    unsubToken = onToken(({ requestId, token }) => {
      if (requestId !== currentRequestIdRef.current) return;
      if (assistantMessageIdRef.current === null) {
        assistantMessageIdRef.current = crypto.randomUUID();
        assistantContentRef.current = '';
        addMessage({
          id: assistantMessageIdRef.current,
          role: 'assistant',
          content: '',
        });
      }
      const assistantId = assistantMessageIdRef.current;
      assistantContentRef.current += token;
      if (pendingTokenFlushRef.current === null) {
        pendingTokenFlushRef.current = requestAnimationFrame(() => {
          pendingTokenFlushRef.current = null;
          if (!assistantId || assistantMessageIdRef.current !== assistantId) return;
          useConversationStore.setState((state) => ({
            messages: state.messages.map((message) =>
              message.id === assistantId
                ? { ...message, content: assistantContentRef.current }
                : message
            ),
          }));
        });
      }
    });

    unsubDone = onDone(({ requestId: doneId }) => {
      if (doneId !== currentRequestIdRef.current) return;
      const conversationId = activeConversationIdRef.current;
      if (conversationId && assistantMessageIdRef.current) {
        messageSave({
          id: assistantMessageIdRef.current,
          conversationId,
          role: 'assistant',
          content: assistantContentRef.current,
          createdAt: new Date().toISOString(),
        });
      }
      const completedAssistantId = assistantMessageIdRef.current;
      if (pendingTokenFlushRef.current !== null) {
        cancelAnimationFrame(pendingTokenFlushRef.current);
        pendingTokenFlushRef.current = null;
      }
      if (assistantMessageIdRef.current !== completedAssistantId) return;
      assistantMessageIdRef.current = null;
      assistantContentRef.current = '';
      currentRequestIdRef.current = null;
      finishStream();
    });

    unsubError = onError(({ requestId: errId, message }) => {
      if (errId !== currentRequestIdRef.current) return;
      if (pendingTokenFlushRef.current !== null) {
        cancelAnimationFrame(pendingTokenFlushRef.current);
        pendingTokenFlushRef.current = null;
      }
      if (assistantMessageIdRef.current) {
        useConversationStore.setState((state) => ({
          messages: state.messages.filter((m) => m.id !== assistantMessageIdRef.current),
        }));
      }
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
      if (pendingTokenFlushRef.current !== null) {
        cancelAnimationFrame(pendingTokenFlushRef.current);
      }
      unsubToken?.();
      unsubDone?.();
      unsubError?.();
      unsubRAGDone?.();
      unsubRAGError?.();
    };
  }, [addMessage, messageSave, setError, finishStream]);

  // ============================================
  // Model resolution
  // ============================================
  const resolveModel = useCallback(() => {
    const mode = activeModeId ? getMode(activeModeId) : null;
    return (
      mode?.model ||
      useConversationStore.getState().getSelectedModel() ||
      defaultModel ||
      models.find((m) => !EMBED.test(m.name))?.name ||
      ''
    );
  }, [activeModeId, defaultModel, getMode, models]);

  // ============================================
  // Send
  // ============================================
  const sendMessages = useCallback(async (conversationId, messageList, modeId) => {
    const mode = modeId ? getMode(modeId) : null;
    const firstUserMessage =
      messageList.find((m) => m.role === 'user')?.content || input;
    const model = (mode && mode.model) || resolveModel();
    if (!model) {
      throw new Error('No Ollama model is configured or installed.');
    }
    const requestId = crypto.randomUUID();
    currentRequestIdRef.current = requestId;
    startStream(requestId);
    try {
      await chatStart({
        requestId,
        model,
        conversationId,
        firstUserMessage,
        modeId,
        messages: messageList,
      });
    } catch (e) {
      currentRequestIdRef.current = null;
      throw e;
    }
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

    let attachmentContext = '';
    if (attachments.length > 0) {
      attachmentContext =
        '\n\n---\nAttached files:\n' +
        attachments.map((a) => `### ${a.filename}\n${a.content}`).join('\n---\n');
    }

    let finalContent = content + attachmentContext;
    if (useMyVault) {
      try {
        const { vaultPath } = await vaultGet();
        if (vaultPath) {
          const chunks = await searchRAG(content, vaultPath, 6);
          if (chunks.length > 0) {
            const { prompt } = await buildRAGPrompt(content, chunks, aboutMe);
            finalContent = prompt + attachmentContext;
            setRAGSources(
              chunks.map((c) => ({
                path: c.sourcePath || c.path,
                heading: c.sourceHeading || c.heading,
                text: c.text,
                similarity: c.similarity,
              }))
            );
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
      scrollToBottom();
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
    setRAGSources,
    scrollToBottom,
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
        input: '',
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
        model: summaryMode.model || resolveModel(),
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
  }, [activeConversationId, getMode, aboutMe, contextBuildMessages, chatStart, onToken, onDone, onError, setError, resolveModel]);

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

  // ============================================
  // Empty state
  // ============================================
  const isEmpty = messages.length === 0 && !error && !loading && !streaming;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const suggestionChips = [
    { label: 'Summarize', modeId: 'summary' },
    { label: 'Brainstorm', modeId: 'brainstorm' },
    { label: 'Code helper', modeId: 'code' },
  ];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
        <div className="bg-err/10 border border-err/20 panel p-8 max-w-md">
          <AlertCircle size={32} className="text-err mb-3" />
          <p className="text-text text-sm font-mono mb-4">{error}</p>
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 text-accent hover:text-accent-hover underline font-medium"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-w-0 flex flex-col"
    >
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <h1 className="font-serif text-2xl text-text">{greeting}</h1>
            </div>
            <p className="text-muted text-sm mb-8">
              Start a new conversation. Pick a mode or just type.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {suggestionChips.map((chip) => {
                const mode = modes.find((m) => m.id === chip.modeId);
                return (
                  <button
                    key={chip.modeId}
                    onClick={() => {
                      setPendingModeId(chip.modeId);
                      if (mode) setConversationMode(null, mode.id);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-text bg-surface border border-border hover:bg-accent/10 hover:text-accent transition-colors"
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-muted font-mono">
              Tip: type <span className="text-accent">/</span> followed by a mode name to switch modes.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <div className="max-w-3xl mx-auto px-6 w-full">
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
              assistantMessageIdRef={assistantMessageIdRef}
            />
            {showScrollPrompt && userAtBottom === false && (
              <button
                onClick={scrollToBottom}
                className="absolute right-6 bottom-20 z-20 px-3 py-1.5 rounded-full bg-surface border border-border text-xs text-muted hover:bg-accent hover:text-white transition-colors shadow-sm"
              >
                <ChevronDown size={14} /> Scroll to latest
              </button>
            )}
          </div>
        </div>
      )}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="surface border border-line panel p-5 w-full max-w-md shadow-sm">
            <h3 className="font-serif font-bold text-lg mb-3">Edit message</h3>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-surface-3 border border-border p-3 text-text focus-ring font-mono text-sm mb-3"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleEditCancel}
                className="px-4 py-2 text-muted hover:text-text font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEditSave(editingId, editContent)}
                className="px-4 py-2 bg-accent text-white font-medium hover:bg-accent-hover transition-colors"
              >
                Save & regenerate
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="border-t border-line bg-sidebar shrink-0">
        <div className="max-w-3xl mx-auto px-6 py-4">
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
        </div>
      </div>
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
