import React, { useState } from 'react';
import { useTask } from '../hooks/useTask';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';

export function HomePage() {
  const { isRunning, progress, error, run, cancel } = useTask();
  const [name, setName] = useState('');

  const handleRun = async () => {
    await run({ name });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-display font-bold tracking-tight text-text">
          Jade
        </h1>
        <StatusBadge status={isRunning ? 'running' : progress?.status || 'idle'} />
      </div>

      <div className="panel p-6 space-y-4">
        <div>
          <label className="tech-label text-muted mb-2 block">// task name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="june-journal-entry"
            className="w-full bg-surface-3 border border-line rounded px-3 py-2 text-text focus-ring font-mono text-sm"
            disabled={isRunning}
          />
        </div>

        <div className="flex items-center gap-4">
          {!isRunning ? (
            <button
              onClick={handleRun}
              disabled={!name.trim()}
              className="px-6 py-2 rounded bg-yellow text-black font-technical font-bold hover:bg-surface-3 hover:border-yellow hover:border disabled:opacity-50 transition-colors"
            >
              Run Task
            </button>
          ) : (
            <button
              onClick={cancel}
              className="px-6 py-2 rounded bg-pink text-text font-technical font-bold hover:bg-surface-3 hover:border-pink hover:border transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ProgressBar current={progress?.current || 0} total={progress?.total || 0} label={progress?.message || ''} />
        </div>

        {error && (
          <div className="p-3 bg-pink/10 border border-pink/30 rounded text-pink text-sm font-mono">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
}
