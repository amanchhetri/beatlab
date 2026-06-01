import { useRef, useState } from 'react';
import { useStore, replaceProject } from '../store/singleton';
import {
  downloadProjectFile,
  encodeProjectToUrlParam,
  readProjectFile,
  triggerDownload,
} from '../lib/projectIO';
import { renderPlaylistToBuffer, lastUsedBar } from '../lib/render';
import { audioBufferToWavBlob } from '../lib/wavEncoder';
import './ShareMenu.css';

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; message: string }
  | { kind: 'note'; message: string }
  | { kind: 'error'; message: string };

function timestampedFilename(ext: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `beatlab-${stamp}.${ext}`;
}

export function ShareMenu() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  function snapshot() {
    const s = useStore.getState();
    return {
      schemaVersion: 1 as const,
      channels: s.channels,
      patterns: s.patterns,
      patternOrder: s.patternOrder,
      playlist: s.playlist,
      bpm: s.bpm,
      mixer: s.mixer,
    };
  }

  function flashNote(message: string) {
    setStatus({ kind: 'note', message });
    setTimeout(() => setStatus(s => (s.kind === 'note' ? { kind: 'idle' } : s)), 2500);
  }

  function flashError(message: string) {
    setStatus({ kind: 'error', message });
    setTimeout(() => setStatus(s => (s.kind === 'error' ? { kind: 'idle' } : s)), 4000);
  }

  function handleSave() {
    downloadProjectFile(snapshot(), timestampedFilename('beatlab'));
    flashNote('Saved .beatlab file');
  }

  function handleLoadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    const parsed = await readProjectFile(file);
    if (!parsed) {
      flashError('That file is not a valid .beatlab project');
      return;
    }
    replaceProject({
      channels: parsed.channels,
      patterns: parsed.patterns,
      patternOrder: parsed.patternOrder,
      playlist: parsed.playlist,
      bpm: parsed.bpm,
      mixer: parsed.mixer,
    });
    flashNote(`Loaded ${file.name}`);
  }

  async function handleShareUrl() {
    try {
      const encoded = encodeProjectToUrlParam(snapshot());
      const url = `${window.location.origin}${window.location.pathname}?p=${encoded}`;
      if (url.length > 8000) {
        flashError('Project is too big for a URL — use Save instead');
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        flashNote(`Link copied (${(url.length / 1024).toFixed(1)} KB)`);
      } catch {
        // Clipboard blocked — show the URL in a prompt so the user can copy manually
        window.prompt('Copy this URL', url);
      }
    } catch (err) {
      console.error(err);
      flashError('Could not build share URL');
    }
  }

  async function handleExportWav() {
    const state = useStore.getState();
    if (lastUsedBar(state.playlist) === 0) {
      flashError('Playlist is empty — drop at least one pattern before exporting');
      return;
    }
    setStatus({ kind: 'busy', message: 'Rendering WAV…' });
    try {
      const buffer = await renderPlaylistToBuffer({
        channels: state.channels,
        patterns: state.patterns,
        playlist: state.playlist,
        bpm: state.bpm,
      });
      const blob = audioBufferToWavBlob(buffer);
      triggerDownload(blob, timestampedFilename('wav'));
      flashNote(`Exported ${(blob.size / 1024 / 1024).toFixed(2)} MB WAV`);
    } catch (err) {
      console.error(err);
      flashError((err as Error).message || 'WAV export failed');
    }
  }

  const busy = status.kind === 'busy';

  return (
    <div className="share-menu">
      {status.kind !== 'idle' && (
        <span
          className={`share-menu__status share-menu__status--${status.kind}`}
          role={status.kind === 'error' ? 'alert' : 'status'}
        >
          {status.message}
        </span>
      )}
      <button type="button" className="share-btn" disabled={busy} onClick={handleSave} title="Save .beatlab file">
        Save
      </button>
      <button type="button" className="share-btn" disabled={busy} onClick={handleLoadClick} title="Load .beatlab file">
        Load
      </button>
      <button type="button" className="share-btn" disabled={busy} onClick={handleShareUrl} title="Copy share URL">
        Share
      </button>
      <button
        type="button"
        className="share-btn share-btn--primary"
        disabled={busy}
        onClick={handleExportWav}
        title="Render the playlist to a WAV file"
      >
        {busy ? 'Rendering…' : 'Export WAV'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".beatlab,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />
    </div>
  );
}
