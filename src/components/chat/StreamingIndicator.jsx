import React from 'react';

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1 text-gray-400 text-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse" />
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
    </div>
  );
}
