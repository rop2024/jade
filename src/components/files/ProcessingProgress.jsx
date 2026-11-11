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
 <div className="surface-2 border border-line panel p-6 w-full max-w-md shadow-neon-cyan">
 <div className="flex justify-between items-start mb-3">
 <h3 className="text-lg font-display font-bold text-text">
 {type === 'batch' ? 'Batch Processing' : 'Processing Document'}
 </h3>
 <button
 onClick={handleCancel}
 className="p-1 text-dim hover:text-pink hover:bg-pink/10"
 >
 &times;
 </button>
 </div>

 <p className="text-sm text-dim mb-4">
 {message || stageLabels[stage] || 'Processing…'}
 </p>

 {total > 0 && (
 <div className="space-y-2 mb-4">
 <div className="flex justify-between text-xs text-dim mb-1 font-mono">
 <span>Part {part} of {total}</span>
 <span>{pct}%</span>
 </div>
 <div className="w-full bg-surface-3 border border-line h-2 overflow-hidden">
 <div
 className="bg-yellow h-2 shadow-neon-yellow transition-all"
 style={{ width: `${pct}%` }}
 />
 </div>
 </div>
 )}

 {status === 'completed' && (
 <div className="text-xs text-green mb-4">Completed.</div>
 )}
 {status === 'error' && (
 <div className="text-xs text-pink mb-4">Error occurred.</div>
 )}

 <div className="flex justify-end">
 <button
 onClick={() => {
 clearProcessing();
 }}
 className={`px-4 py-2 font-technical font-bold transition-colors ${
 status === 'completed' || status === 'error'
 ? 'bg-cyan text-black hover:bg-surface-3 hover:border-cyan hover:border'
 : 'bg-pink text-text hover:bg-surface-3 hover:border-pink hover:border'
 }`}
 >
 {status === 'completed' || status === 'error' ? 'Close' : 'Cancel'}
 </button>
 </div>
 </div>
 </div>
 );
}

