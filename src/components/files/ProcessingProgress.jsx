import React, { useCallback } from 'react';
import { useConversationStore } from '../../store/conversationStore';
import { documentCancel, batchCancel } from '../../api/chatAPI';

export function ProcessingProgress() {
    const { processing, setProcessing, clearProcessing } = useConversationStore();

    if (!processing) return null;

    const { jobId, type, stage, part, total, message, status } = processing;

    const handleCancel = useCallback(() => {
        if (type === 'batch') {
            batchCancel({ jobId });
        } else {
            documentCancel({ jobId });
        }
        setProcessing(null);
    }, [jobId, type, setProcessing]);

    const pct = total > 0 ? Math.round((part / total) * 100) : 0;

    const stageLabels = {
        chunking: 'Chunking document…',
        map: 'Summarizing parts…',
        reduce: 'Combining summaries…',
        single: 'Processing document…',
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#16213e] border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold">
                        {type === 'batch' ? 'Batch Processing' : 'Processing Document'}
                    </h3>
                    <button
                        onClick={handleCancel}
                        className="p-1 text-gray-500 hover:text-red-400 rounded hover:bg-red-900/20"
                    >
                        &times;
                    </button>
                </div>

                <p className="text-sm text-gray-400 mb-4">
                    {message || stageLabels[stage] || 'Processing…'}
                </p>

                {total > 0 && (
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Part {part} of {total}</span>
                            <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-[#1a1a2e] border border-gray-700 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                )}

                {status === 'completed' && (
                    <div className="text-xs text-green-400 mb-4">Completed.</div>
                )}
                {status === 'error' && (
                    <div className="text-xs text-red-400 mb-4">Error occurred.</div>
                )}

                <div className="flex justify-end">
                    <button
                        onClick={() => {
                            clearProcessing();
                        }}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {status === 'completed' || status === 'error' ? 'Close' : 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
}
