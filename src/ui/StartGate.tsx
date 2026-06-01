import { useState } from 'react';
import { audio } from '../audio/engine';
import { syncEngineFromStore } from '../audio';
import './StartGate.css';

type Status = 'idle' | 'loading' | 'failed';

export function StartGate({ onReady }: { onReady: () => void }) {
  const [status, setStatus] = useState<Status>('idle');

  async function handleStart() {
    setStatus('loading');
    try {
      await audio.start();
      syncEngineFromStore();
      onReady();
    } catch (e) {
      console.error('Audio start failed', e);
      setStatus('failed');
    }
  }

  return (
    <div className="start-gate">
      <div className="start-gate__panel">
        <h1 className="start-gate__title">BeatLab</h1>
        <p className="start-gate__sub">A web mini-DAW</p>
        <button
          type="button"
          className="start-gate__button"
          onClick={handleStart}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Loading samples…' : status === 'failed' ? 'Retry' : 'Tap to start'}
        </button>
        {status === 'failed' && (
          <p className="start-gate__error">
            Audio could not start. Try again — modern browser required.
          </p>
        )}
      </div>
    </div>
  );
}
