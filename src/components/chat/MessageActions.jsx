import React, { useState } from 'react';

export function MessageActions({ message, onCopy, onRegenerate, onEdit, onSaveToVault, onFeedback }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  return (
    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
      <button
        onClick={() => onCopy(message.content)}
        title="Copy message"
        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
      >
        <span aria-hidden="true">&#128203;</span>
      </button>
      {isAssistant && (
        <>
          <button
            onClick={() => onRegenerate(message.id)}
            title="Regenerate response"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <span aria-hidden="true">&#x267B;</span>
          </button>
          <button
            onClick={() => onSaveToVault(message.id)}
            title="Save to Vault"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <span aria-hidden="true">&#128207;</span>
          </button>
          <button
            onClick={() => {
              onFeedback?.(message.id, message.content);
              setFeedbackSaved(true);
              setTimeout(() => setFeedbackSaved(false), 1500);
            }}
            title="Good response"
            className={`p-1.5 rounded transition-colors ${feedbackSaved ? 'text-green-400 bg-green-900/30' : 'text-gray-400 hover:text-green-400 hover:bg-gray-700'}`}
          >
            <span aria-hidden="true">👍</span>
          </button>
        </>
      )}
      {isUser && (
        <button
          onClick={() => onEdit(message.id)}
          title="Edit message"
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          <span aria-hidden="true">&#9998;</span>
        </button>
      )}
    </div>
  );
}
