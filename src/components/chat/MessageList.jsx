import React from 'react';
import { MessageBubble } from './MessageBubble';

export function SourceLink({ path, heading, similarity }) {
  const encodedPath = encodeURI(path);
  const obsidianUrl = `obsidian://open?path=${encodedPath}`;
  const displayName = path.split(/[\\/]/).pop() || path;
  const headingLabel = heading ? ` › ${heading}` : '';

  return (
    <div className="flex items-start gap-2 surface-3 border border-border p-3 mb-2 border-l-2 border-l-accent rounded-lg">
      <a
        href={obsidianUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-mono text-accent hover:text-accent-hover truncate"
        title={path}
      >
        {displayName}{headingLabel}
      </a>
      <span className="text-[10px] text-muted ml-auto">
        {Math.round((similarity || 0) * 100)}% match
      </span>
    </div>
  );
}

export function SourcesPanel({ sources }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h4 className="tech-label text-muted mb-3">// sources</h4>
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

export function StreamingCursor() {
  return (
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
  );
}

export function MessageList({ messages, streaming, onCopy, onRegenerate, onEdit, onSaveToVault, sources, onFeedback, assistantMessageIdRef }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 scroll-thin">
      {messages.length === 0 && !streaming ? (
        <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
          <div className="skeleton-title w-1/3 mb-4" />
          <div className="skeleton-text w-full mb-2" />
          <div className="skeleton-text w-3/4" />
        </div>
      ) : null}
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
        <div className="flex justify-start mb-6">
          <div className="max-w-[80%] serif text-body pb-1">
            <div className="prose prose-sm max-w-none inline">
              {assistantMessageIdRef.current && messages.find((m) => m.id === assistantMessageIdRef.current)?.content || ''}
              <StreamingCursor />
            </div>
          </div>
        </div>
      )}
      {sources && sources.length > 0 && <SourcesPanel sources={sources} />}
    </div>
  );
}
