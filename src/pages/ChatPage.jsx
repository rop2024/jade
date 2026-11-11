import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { ChatView } from '../components/chat/ChatView';
import { ModePicker } from '../components/modes/ModePicker';
import { SaveToVaultDialog } from '../components/chat/SaveToVaultDialog';
import { ProcessingProgress } from '../components/files/ProcessingProgress';
import {
 chatStart,
 onToken,
 onDone,
 onError,
 contextBuildMessages,
 onDocumentProgress,
 onDocumentDone,
 onDocumentError,
 onDocumentCancelled,
 onBatchProgress,
 onBatchDone,
 onBatchError,
 onRAGProgress,
 onRAGDone,
 onRAGError,
 onRAGIdle,
} from '../api/chatAPI';
import { useConversationStore } from '../store/conversationStore';

export function ChatPage() {
 const {
 activeConversationId,
 setActiveConversation,
 models,
 selectedModelKey,
 setSelectedModelKey,
 modelPresets,
 loadModels,
 loadModelPresets,
 messages,
 getMode,
 setError,
 processing,
 setProcessing,
 clearProcessing,
 useMyVault,
 setUseMyVault,
 vaultGet,
 } = useConversationStore();

 const [modelOptions, setModelOptions] = useState([]);
 const [summariseNote, setSummariseNote] = useState({ open: false, content: '' });
 const [vaultConfigured, setVaultConfigured] = useState(false);

 useEffect(() => {
 loadModels();
 loadModelPresets();
 (async () => {
 try {
 const { vaultPath } = await vaultGet();
 setVaultConfigured(!!vaultPath);
 } catch {}
 })();
 }, [loadModels, loadModelPresets, vaultGet]);

 useEffect(() => {
 const options = [];
 if (modelPresets.fast) options.push({ label: 'Fast', value: 'fast', model: modelPresets.fast });
 if (modelPresets.deep) options.push({ label: 'Deep', value: 'deep', model: modelPresets.deep });
 models.forEach((m) => {
 if (!options.some((o) => o.value === m.name)) {
 options.push({ label: m.name, value: m.name, model: m.name });
 }
 });
 setModelOptions(options);
 }, [models, modelPresets]);

 useEffect(() => {
 const unsubProgress = onDocumentProgress((payload) => {
 setProcessing({
 jobId: payload.jobId,
 type: 'document',
 stage: payload.stage,
 part: payload.part,
 total: payload.total,
 message: payload.message,
 status: 'processing',
 });
 });
 const unsubDone = onDocumentDone((payload) => {
 setProcessing({
 jobId: payload.jobId,
 type: 'document',
 stage: 'done',
 part: payload.total || 0,
 total: payload.total || 0,
 message: 'Processing complete.',
 status: 'completed',
 });
 });
 const unsubError = onDocumentError((payload) => {
 setProcessing({
 jobId: payload.jobId,
 type: 'document',
 stage: 'error',
 part: 0,
 total: 0,
 message: payload.message || 'Processing error.',
 status: 'error',
 });
 });
 const unsubCancelled = onDocumentCancelled((payload) => {
 setProcessing({
 jobId: payload.jobId,
 type: 'document',
 stage: 'cancelled',
 part: 0,
 total: 0,
 message: 'Cancelled.',
 status: 'error',
 });
 });

 return () => {
 unsubProgress();
 unsubDone();
 unsubError();
 unsubCancelled();
 };
 }, [setProcessing]);

 useEffect(() => {
 const unsubProgress = onBatchProgress((payload) => {
 setProcessing({
 jobId: payload.jobId,
 type: 'batch',
 stage: payload.status,
 part: payload.part,
 total: payload.total,
 message: `Processing ${payload.fileName}…`,
 status: payload.status,
 });
 });
 const unsubDone = onBatchDone((payload) => {
 setProcessing({
 jobId: payload.jobId,
 type: 'batch',
 stage: 'done',
 part: payload.results.length,
 total: payload.results.length,
 message: 'Batch complete.',
 status: 'completed',
 });
 });
 const unsubError = onBatchError((payload) => {
 setProcessing({
 jobId: payload.jobId,
 type: 'batch',
 stage: 'error',
 part: 0,
 total: 0,
 message: payload.message || 'Batch error.',
 status: 'error',
 });
 });

 return () => {
 unsubProgress();
 unsubDone();
 unsubError();
 };
 }, [setProcessing]);

 useEffect(() => {
 const unsubProgress = onRAGProgress((payload) => {
 setProcessing({
 jobId: 'rag',
 type: 'rag',
 stage: payload.status,
 part: payload.current,
 total: payload.total,
 message: `Indexing ${payload.file}…`,
 status: 'processing',
 });
 });
 const unsubDone = onRAGDone((payload) => {
 setProcessing({
 jobId: 'rag',
 type: 'rag',
 stage: 'done',
 part: payload.total || 0,
 total: payload.total || 0,
 message: `Indexed ${payload.indexed} files, skipped ${payload.skipped}.`,
 status: 'completed',
 });
 });
 const unsubError = onRAGError((payload) => {
 setProcessing({
 jobId: 'rag',
 type: 'rag',
 stage: 'error',
 part: 0,
 total: 0,
 message: payload.message || 'RAG error.',
 status: 'error',
 });
 });
 const unsubIdle = onRAGIdle(() => {
 setProcessing(null);
 });

 return () => {
 unsubProgress();
 unsubDone();
 unsubError();
 unsubIdle();
 };
 }, [setProcessing]);

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
 if (!messages.length) {
 setError('No messages to summarise.');
 return;
 }
 try {
 const built = await contextBuildMessages({
 mode: summaryMode,
 aboutMe: '',
 history: messages,
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
 }, [activeConversationId, getMode, messages, contextBuildMessages, chatStart, onToken, onDone, onError, setError]);

 return (
 <div className="min-h-screen text-text flex flex-col">
 <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col h-full">
 <div className="flex flex-col lg:flex-row h-full gap-4">
 <aside className="lg:w-80 flex flex-col">
 <Sidebar />
 </aside>
 <div className="flex-1 flex flex-col min-w-0">
 <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
 <div>
 <h1 className="text-3xl font-display font-bold tracking-tight">
 {activeConversationId ? 'Chat' : 'New Chat'}
 </h1>
 </div>
 <div className="flex items-center gap-2">
 <ModePicker />
 <button
 onClick={handleSummariseToNote}
 disabled={!activeConversationId || !messages.length}
 className="px-3 py-2 text-xs font-technical bg-cyan text-black hover:bg-surface-3 hover:border-cyan hover:border transition-colors"
 >
 Summarise to Note
 </button>
 <label className="flex items-center gap-1 text-xs font-technical text-dim cursor-pointer">
 <input
 type="checkbox"
 checked={useMyVault}
 onChange={(e) => setUseMyVault(e.target.checked)}
 disabled={!vaultConfigured}
 className=" bg-surface-3 border border-line text-cyan focus-ring"
 />
 {vaultConfigured ? 'Use My Vault' : 'Vault not configured'}
 </label>
 </div>
 <div className="flex items-center gap-2">
 <span className="tech-label text-dim">Model</span>
 <select
 value={selectedModelKey}
 onChange={(e) => setSelectedModelKey(e.target.value)}
 className="bg-surface-3 border border-line px-3 py-2 text-sm text-text focus-ring font-mono"
 >
 {modelOptions.map((o) => (
 <option key={o.value} value={o.value}>
 {o.label} {o.model ? `— ${o.model}` : ''}
 </option>
 ))}
 </select>
 </div>
 </div>
 <div className="flex-1 surface-2 border border-line panel flex flex-col overflow-hidden shadow-neon-cyan">
 <ChatView />
 </div>
 </div>
 </div>
 </div>
 {summariseNote.open && (
 <SaveToVaultDialog
 content={summariseNote.content}
 open={summariseNote.open}
 onClose={() => setSummariseNote({ open: false, content: '' })}
 onSaved={() => {
 setSummariseNote({ open: false, content: '' });
 }}
 />
 )}
 {processing && <ProcessingProgress />}
 </div>
 );
}

