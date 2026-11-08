import React from 'react';

const TYPE_LABELS = {
    txt: 'Text',
    md: 'Markdown',
    pdf: 'PDF',
    docx: 'Word',
};

const TYPE_COLORS = {
    txt: 'bg-cyan/10 text-cyan border border-cyan/30',
    md: 'bg-green/10 text-green border border-green/30',
    pdf: 'bg-pink/10 text-pink border border-pink/30',
    docx: 'bg-magenta/10 text-magenta border border-magenta/30',
};

export function AttachmentChip({ attachment, onRemove }) {
    const typeLabel = TYPE_LABELS[attachment.fileType] || attachment.fileType.toUpperCase();
    const typeColor = TYPE_COLORS[attachment.fileType] || 'bg-surface-3 text-muted border border-line';

    return (
        <div
            className="flex items-center gap-2 px-3 py-2 surface-3 border border-line rounded"
        >
            <div className="flex items-center gap-1.5">
                <span className={`text-xs ${typeColor.split(' ')[0]} font-mono px-1.5 py-0.5 rounded`}>
                    {attachment.fileType.toUpperCase()}
                </span>
                <span className="text-sm truncate text-text" title={attachment.filename}>
                    {attachment.filename}
                </span>
                <span className="text-[10px] text-dim">
                    {attachment.wordCount} words
                </span>
            </div>
            <button
                onClick={() => onRemove(attachment.id)}
                className="p-1 text-dim hover:text-pink rounded hover:bg-pink/10"
                title="Remove attachment"
            >
                ×
            </button>
        </div>
    );
}
