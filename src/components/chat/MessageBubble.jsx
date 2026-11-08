import React from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageActions } from './MessageActions';

export function MessageBubble({ message, onCopy, onRegenerate, onEdit, onSaveToVault, onFeedback }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={`flex ${
        isUser ? 'justify-end' : 'justify-start'
      } mb-4 group`}
    >
      <div
        className={`max-w-[85%] px-4 py-3 rounded panel relative text-text text-sm leading-relaxed font-mono ${
          isUser
            ? 'border border-cyan/30 bg-surface-3 border-l-4 border-l-yellow rounded-tr-none'
            : 'border border-line surface-2 rounded-tl-none'
        }`}
      >
        {isAssistant ? (
          <ReactMarkdown className="prose prose-sm text-text" children={message.content} />
        ) : (
          message.content
        )}
        <MessageActions
          message={message}
          onCopy={onCopy}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          onSaveToVault={onSaveToVault}
          onFeedback={onFeedback}
        />
      </div>
    </div>
  );
}
