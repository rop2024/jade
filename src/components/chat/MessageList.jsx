import React from 'react';
import { MessageBubble } from './MessageBubble';
import { StreamingIndicator } from './StreamingIndicator';

export function MessageList({ messages, streaming, onCopy, onRegenerate, onEdit, onSaveToVault }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onCopy={onCopy}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          onSaveToVault={onSaveToVault}
        />
      ))}
      {streaming && (
        <div className="flex justify-start mb-4">
          <div className="px-4 py-3 bg-[#1a1a2e] border border-gray-700 text-gray-200 text-sm leading-relaxed rounded-tl-none">
            <StreamingIndicator />
          </div>
        </div>
      )}
    </div>
  );
}
