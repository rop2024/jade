import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, RotateCw, Edit2 } from 'lucide-react';
import { MessageActions } from './MessageActions';

export function MessageBubble({ message, onCopy, onRegenerate, onEdit, onSaveToVault, onFeedback }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const [hovered, setHovered] = React.useState(false);

  const actions = (
    <div className="flex gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); onCopy(message.content); }}
        className="p-1.5 text-muted hover:text-accent hover:bg-surface-hover rounded-md transition-colors"
        title="Copy"
      >
        <Copy size={14} />
      </button>
      {isAssistant && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onRegenerate(message.id); }}
            className="p-1.5 text-muted hover:text-accent hover:bg-surface-hover rounded-md transition-colors"
            title="Regenerate"
          >
            <RotateCw size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(message.id); }}
            className="p-1.5 text-muted hover:text-accent hover:bg-surface-hover rounded-md transition-colors"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
        </>
      )}
    </div>
  );

  return (
    <div
      className="flex mb-6 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isUser ? (
        <>
          <div className="ml-auto flex flex-col gap-1">
            <div className="max-w-[80%]">
              <div className="bg-sidebar border border-border rounded-2xl rounded-tl-none px-4 py-2.5 text-text text-sm leading-relaxed sans shadow-sm">
                {message.content}
              </div>
              {hovered && <div className="mt-1">{actions}</div>}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mr-auto flex flex-col gap-1">
            <div className="max-w-[80%]">
              <div className={`serif text-body pb-1 ${
                hovered ? 'group-hover-with-actions' : ''
              }`}>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
              {hovered && <div className="mt-2">{actions}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
