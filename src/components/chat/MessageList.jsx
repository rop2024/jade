import React from 'react';
import { MessageBubble } from './MessageBubble';
import { StreamingIndicator } from './StreamingIndicator';

export function SourceLink({ path, heading, similarity }) {
    const encodedPath = encodeURI(path);
    const obsidianUrl = `obsidian://open?path=${encodedPath}`;
    const displayName = path.split(/[\\/]/).pop() || path;
    const headingLabel = heading ? ` › ${heading}` : '';

    return (
        <div className="flex items-start gap-2 bg-[#1a1a2e] border border-gray-700 rounded-lg p-3 mb-2">
            <a
                href={obsidianUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-blue-400 hover:text-blue-300 truncate"
                title={path}
            >
                {displayName}{headingLabel}
            </a>
            <span className="text-[10px] text-gray-500 ml-auto">
                {Math.round((similarity || 0) * 100)}% match
            </span>
        </div>
    );
}

export function SourcesPanel({ sources }) {
    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-4 border-t border-gray-700 pt-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Sources
            </h4>
            <div className="space-y-2">
                {sources.map((s, i) => (
                    <SourceLink
                        key={i}
                        path={s.path}
                        heading={s.heading}
                        similarity={s.similarity}
                    />
                ))}
            </div>
        </div>
    );
}

export function MessageList({ messages, streaming, onCopy, onRegenerate, onEdit, onSaveToVault, sources, onFeedback }) {
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
          onFeedback={onFeedback}
        />
      ))}
      {streaming && (
        <div className="flex justify-start mb-4">
          <div className="px-4 py-3 bg-[#1a1a2e] border border-gray-700 text-gray-200 text-sm leading-relaxed rounded-tl-none">
            <StreamingIndicator />
          </div>
        </div>
      )}
      {sources && sources.length > 0 && <SourcesPanel sources={sources} />}
    </div>
  );
}
