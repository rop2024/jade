import React, { useState } from 'react';
import { useTask } from '../hooks/useTask';

export function HomePage() {
  const { isRunning, progress, error, run, cancel } = useTask();
  const [name, setName] = useState('');

  const handleRun = async () => {
    await run({ name });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Starter App</h1>
        <StatusBadge status={isRunning ? 'running' : progress?.status || 'idle'} />
      </div>

      <div className="bg-[#16213e] rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Task Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a value..."
            className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-white"
            disabled={isRunning}
          />
        </div>

        <div className="flex items-center gap-4">
          {!isRunning ? (
            <button
              onClick={handleRun}
              disabled={!name.trim()}
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              Run Task
            </button>
          ) : (
            <button
              onClick={cancel}
              className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-medium"
            >
              Cancel
            </button>
          )}
        </div>

        {progress && progress.message && (
          <div className="p-3 bg-[#1a1a2e] rounded border border-gray-700 text-sm text-gray-300">
            {progress.message}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
}
