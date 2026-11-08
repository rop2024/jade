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
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed relative ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-none'
            : 'bg-[#1a1a2e] border border-gray-700 text-gray-200 rounded-tl-none'
        }`}
      >
        {isAssistant ? (
          <ReactMarkdown className="prose prose-sm text-gray-200" children={message.content} />
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
