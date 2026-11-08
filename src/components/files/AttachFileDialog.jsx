import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useConversationStore } from '../../store/conversationStore';

export function AttachFileDialog({ open, onClose, onAttach }) {
    const { attachments, addAttachment, clearAttachments, importFile, fileIsSupported } =
        useConversationStore();
    const [dragging, setDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        setProcessing(false);
    }, [open]);

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files || []);
        await processFiles(files);
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        await processFiles(files);
        e.target.value = '';
    };

    const processFiles = async (files) => {
        const supported = files.filter((f) => {
            const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
            return ['.txt', '.md', '.pdf', '.docx'].includes(ext);
        });

        if (supported.length === 0) {
            alert('No supported files selected (.txt, .md, .pdf, .docx).');
            return;
        }

        setProcessing(true);
        try {
            for (const file of supported) {
                try {
                    const attachment = await importFile(file);
                    addAttachment(attachment);
                } catch (err) {
                    alert(`Failed to import "${file.name}": ${err.message}`);
                }
            }
            onClose();
            onAttach?.();
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="bg-[#16213e] border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold">Attach File</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        &times;
                    </button>
                </div>

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed border-gray-600 rounded-lg p-8 text-center transition-colors hover:bg-[#1a1a2e] hover:border-blue-500"
                    className={dragging ? 'bg-[#1a1a2e] border-blue-500' : ''}
                >
                    <p className="text-sm text-gray-400 mb-2">Drag & drop files here, or</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".txt,.md,.pdf,.docx"
                        onChange={handleFileSelect}
                        className="sr-only"
                    />
                    <button
                        type="button"
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                    >
                        Browse files
                    </button>
                    <p className="text-[10px] text-gray-500 mt-3">
                        Supported: .txt, .md, .pdf, .docx
                    </p>
                </div>

                {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <p className="text-xs font-medium text-gray-400">Attached files:</p>
                        {attachments.map((a) => (
                            <div
                                key={a.id}
                                className="flex items-center justify-between bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2"
                            >
                                <span className="text-sm truncate" title={a.filename}>
                                    {a.filename}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                    {a.wordCount} words
                                </span>
                                <button
                                    onClick={() => {
                                        useConversationStore.getState().removeAttachment(a.id);
                                    }}
                                    className="text-gray-500 hover:text-red-400"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded text-gray-300 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onAttach?.()}
                        disabled={attachments.length === 0 || processing}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
                    >
                        {processing ? 'Attaching…' : 'Attach'}
                    </button>
                </div>
            </div>
        </div>
    );
}
