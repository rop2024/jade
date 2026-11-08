import React from 'react';

const TYPE_LABELS = {
    txt: 'Text',
    md: 'Markdown',
    pdf: 'PDF',
    docx: 'Word',
};

const TYPE_COLORS = {
    txt: 'bg-blue-500/20 text-blue-400',
    md: 'bg-green-500/20 text-green-400',
    pdf: 'bg-red-500/20 text-red-400',
    docx: 'bg-purple-500/20 text-purple-400',
};

export function AttachmentChip({ attachment, onRemove }) {
    const typeLabel = TYPE_LABELS[attachment.fileType] || attachment.fileType.toUpperCase();
    const typeColor = TYPE_COLORS[attachment.fileType] || 'bg-gray-500/20 text-gray-400';

    return (
        <div
            className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg"
        >
            <div className="flex items-center gap-1.5">
                <span className={`text-xs ${typeColor} font-mono px-1.5 py-0.5 rounded`}>
                    {attachment.fileType.toUpperCase()}
                </span>
                <span className="text-sm truncate" title={attachment.filename}>
                    {attachment.filename}
                </span>
                <span className="text-[10px] text-gray-500">
                    {attachment.wordCount} words
                </span>
            </div>
            <button
                onClick={() => onRemove(attachment.id)}
                className="p-1 text-gray-500 hover:text-red-400 rounded hover:bg-red-900/20"
                title="Remove attachment"
            >
                ×
            </button>
        </div>
    );
}
