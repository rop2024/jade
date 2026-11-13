import React from 'react';

export function StreamingIndicator() {
 return (
 <div role="status" aria-live="polite" className="w-48 space-y-2 text-dim text-sm">
 <div className="flex items-center gap-2">
 <span>Generating response</span>
 <span className="h-1.5 w-1.5 bg-cyan animate-pulse shadow-neon-cyan" />
 <span className="h-1.5 w-1.5 bg-cyan animate-pulse shadow-neon-cyan" style={{ animationDelay: '0.2s' }} />
 <span className="h-1.5 w-1.5 bg-cyan animate-pulse shadow-neon-cyan" style={{ animationDelay: '0.4s' }} />
 </div>
 <div className="h-1 w-full overflow-hidden bg-surface-1" aria-hidden="true">
 <div className="h-full w-2/5 bg-cyan shadow-neon-cyan animate-pulse" />
 </div>
 </div>
 );
}

