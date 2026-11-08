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
        <div className="bg-[#16213e] border border-gray-700 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold">Test Mode</h3>
            <p className="text-sm text-gray-400">
                Send sample input through this mode and inspect the output.
            </p>
            <div className="space-y-3">
                <label className="block text-xs font-medium text-gray-400">Sample input</label>
                <textarea
                    value={sampleInput}
                    onChange={(e) => setSampleInput(e.target.value)}
                    rows={3}
                    className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g. Process my journal entry from today…"
                />
                <button
                    onClick={handleTest}
                    disabled={testing || !sampleInput.trim() || !mode}
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium text-white"
                >
                    {testing ? 'Testing…' : 'Test'}
                </button>
            </div>
            {output && (
                <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-400">Output</label>
                    <div className="bg-[#0b1020] border border-gray-700 rounded p-4 text-sm text-gray-200 max-h-[400px] overflow-y-auto font-mono">
                        {output}
                    </div>
                </div>
            )}
        </div>
    );
}
