import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
 chatStart,
 onToken,
 onDone,
 onError,
 contextBuildMessages,
} from '../../api/chatAPI';
import { useConversationStore } from '../../store/conversationStore';

export function ModeTestPanel({ mode }) {
 const { loadAboutMe: loadAboutMeStore, aboutMe } = useConversationStore();
 const [sampleInput, setSampleInput] = useState('');
 const [output, setOutput] = useState('');
 const [testing, setTesting] = useState(false);

 useEffect(() => {
 loadAboutMeStore();
 }, [loadAboutMeStore]);

 const handleTest = useCallback(async () => {
 if (!sampleInput.trim() || !mode) return;
 setOutput('');
 setTesting(true);
 try {
 const messages = await contextBuildMessages({
 mode,
 aboutMe,
 history: [{ role: 'user', content: sampleInput }],
 });
 const { requestId } = await chatStart({
 model: mode.model || 'llama3.2',
 messages,
 firstUserMessage: sampleInput,
 });

 const unsubscribeToken = onToken(({ requestId: rid, token }) => {
 if (rid === requestId) setOutput((prev) => prev + token);
 });
 const unsubscribeDone = onDone(({ requestId: rid }) => {
 if (rid === requestId) {
 setTesting(false);
 unsubscribeToken();
 unsubscribeDone();
 }
 });
 const unsubscribeError = onError(({ requestId: rid, message }) => {
 if (rid === requestId) {
 setOutput('Error: ' + message);
 setTesting(false);
 unsubscribeToken();
 unsubscribeDone();
 unsubscribeError();
 }
 });
 } catch (err) {
 setOutput('Error: ' + (err.message || 'Test failed.'));
 setTesting(false);
 }
 }, [sampleInput, mode, aboutMe, loadAboutMeStore]);

 return (
 <div className="surface-2 border border-line panel p-6 space-y-4 shadow-neon-cyan">
 <h3 className="text-lg font-display font-bold text-text">Test Mode</h3>
 <p className="text-sm text-dim">
 Send sample input through this mode and inspect the output.
 </p>
 <div className="space-y-3">
 <label className="tech-label text-dim mb-1 block">// sample input</label>
 <textarea
 value={sampleInput}
 onChange={(e) => setSampleInput(e.target.value)}
 rows={3}
 className="w-full bg-surface-3 border border-line px-3 py-2 text-text focus-ring font-mono text-sm"
 placeholder="e.g. Process my journal entry from today…"
 />
 <button
 onClick={handleTest}
 disabled={testing || !sampleInput.trim() || !mode}
 className="px-4 py-2 bg-yellow text-black font-technical font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 {testing ? 'Testing…' : 'Test'}
 </button>
 </div>
 {output && (
 <div className="space-y-2">
 <label className="tech-label text-dim mb-1 block">// output</label>
 <div className="bg-surface-3 border border-line p-4 text-sm text-text max-h-[400px] overflow-y-auto font-mono">
 {output}
 </div>
 </div>
 )}
 </div>
 );
}

