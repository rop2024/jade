import React from 'react';

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1 text-dim text-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse shadow-neon-cyan" />
      <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse shadow-neon-cyan" style={{ animationDelay: '0.2s' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse shadow-neon-cyan" style={{ animationDelay: '0.4s' }} />
    </div>
  );
}
