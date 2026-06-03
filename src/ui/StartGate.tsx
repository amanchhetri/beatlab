import { useEffect, useMemo, useState } from 'react';
import { audio } from '../audio/engine';
import { syncEngineFromStore } from '../audio';
import './StartGate.css';

type Status = 'idle' | 'loading' | 'failed';

const GRID_COLS = 16;
const GRID_ROWS = 8;
const TICK_MS = 220; // ~68 BPM 1/16 — slow hypnotic rolling pattern

/**
 * A drum-pattern-ish set of cell positions {col, row} that light up when
 * the playhead passes their column. Cyan = drum-ish hits, magenta = synth-ish.
 */
const HITS: Array<{ col: number; row: number; color: 'cyan' | 'magenta' }> = [
  // kick on quarter notes, low row
  { col: 0, row: 7, color: 'cyan' },
  { col: 4, row: 7, color: 'cyan' },
  { col: 8, row: 7, color: 'cyan' },
  { col: 12, row: 7, color: 'cyan' },
  // snare on 2 & 4
  { col: 4, row: 5, color: 'cyan' },
  { col: 12, row: 5, color: 'cyan' },
  // hi-hat on every 8th, middle row
  ...Array.from({ length: 8 }, (_, i) => ({ col: i * 2, row: 3, color: 'cyan' as const })),
  // synth melody, sparser, top rows
  { col: 0, row: 1, color: 'magenta' },
  { col: 6, row: 0, color: 'magenta' },
  { col: 10, row: 2, color: 'magenta' },
  { col: 14, row: 1, color: 'magenta' },
];

function generateSinePath(
  totalWidth: number,
  height: number,
  period: number,
  amp: number,
  phase: number
): string {
  const points: string[] = [];
  const step = 4;
  for (let x = 0; x <= totalWidth; x += step) {
    const y = height / 2 + amp * Math.sin((x / period) * Math.PI * 2 + phase);
    points.push(`${x === 0 ? 'M' : 'L'} ${x.toFixed(0)} ${y.toFixed(2)}`);
  }
  return points.join(' ');
}

export function StartGate({ onReady }: { onReady: () => void }) {
  const [status, setStatus] = useState<Status>('idle');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => (t + 1) % GRID_COLS), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Compute which cells are currently lit + their colors
  const litMap = useMemo(() => {
    const map = new Map<number, 'cyan' | 'magenta'>();
    for (const h of HITS) {
      if (h.col === tick) {
        map.set(h.row * GRID_COLS + h.col, h.color);
      }
    }
    return map;
  }, [tick]);

  // Pre-compute the seamless-looping waveform paths (covers 2x viewport)
  const wavePaths = useMemo(() => {
    const w = 2400;
    const h = 200;
    return {
      primary: generateSinePath(w, h, 360, 26, 0),
      secondary: generateSinePath(w, h, 480, 38, Math.PI / 3),
      tertiary: generateSinePath(w, h, 280, 16, Math.PI),
    };
  }, []);

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
    <div className="sg" role="region" aria-label="BeatLab — welcome screen">
      {/* ambient gradient wash */}
      <div className="sg-glow sg-glow-cyan" aria-hidden="true" />
      <div className="sg-glow sg-glow-magenta" aria-hidden="true" />
      <div className="sg-noise" aria-hidden="true" />

      {/* background step-grid pattern */}
      <div className="sg-grid" aria-hidden="true">
        {Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => {
          const color = litMap.get(i);
          const col = i % GRID_COLS;
          const onPlayhead = col === tick;
          return (
            <div
              key={i}
              className={[
                'sg-cell',
                onPlayhead ? 'sg-cell--playhead' : '',
                color === 'cyan' ? 'sg-cell--cyan' : '',
                color === 'magenta' ? 'sg-cell--magenta' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          );
        })}
      </div>

      {/* flowing waveform ribbon */}
      <div className="sg-waveform-wrap" aria-hidden="true">
        <svg
          className="sg-waveform"
          viewBox="0 0 2400 200"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="sg-wave-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4ec5d4" stopOpacity="0.0" />
              <stop offset="15%" stopColor="#4ec5d4" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#9aa7ff" stopOpacity="0.65" />
              <stop offset="85%" stopColor="#e84caa" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#e84caa" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <g className="sg-wave-flow">
            <path d={wavePaths.tertiary} stroke="url(#sg-wave-grad)" strokeWidth="1" fill="none" opacity="0.35" />
            <path d={wavePaths.secondary} stroke="url(#sg-wave-grad)" strokeWidth="1.5" fill="none" opacity="0.7" />
            <path d={wavePaths.primary} stroke="url(#sg-wave-grad)" strokeWidth="2" fill="none" />
          </g>
        </svg>
      </div>

      {/* top bar */}
      <header className="sg-top">
        <div className="sg-status">
          <span className="sg-status__dot" />
          <span className="sg-mono">AUDIO ENGINE — STANDBY</span>
        </div>
        <div className="sg-version sg-mono">v1 · build {(typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev')}</div>
      </header>

      {/* hero */}
      <main className="sg-hero">
        <p className="sg-eyebrow sg-mono">A WEB MINI-DAW</p>
        <h1 className="sg-wordmark">
          BEAT<span className="sg-wordmark__accent">LAB</span>
        </h1>
        <p className="sg-tagline">
          Channel rack. Piano roll. Multi-lane playlist.
          <br className="sg-tagline-br" />
          Render the whole arrangement to a single WAV.
        </p>

        <div className="sg-cta-block">
          <button
            type="button"
            className={`sg-cta ${status === 'loading' ? 'is-loading' : ''}`}
            onClick={handleStart}
            disabled={status === 'loading'}
          >
            <span className="sg-cta__label">
              {status === 'loading' ? 'Loading samples' : status === 'failed' ? 'Retry' : 'Open the studio'}
            </span>
            <span className="sg-cta__arrow" aria-hidden="true">
              →
            </span>
          </button>
          <p className="sg-cta__hint sg-mono">
            HEADPHONES RECOMMENDED · ~1 MB OF SAMPLES WILL LOAD
          </p>
          {status === 'failed' && (
            <p className="sg-cta__error">
              Audio couldn't start in this browser. Try again, or use Chrome/Firefox/Safari latest.
            </p>
          )}
        </div>
      </main>

      {/* footer */}
      <footer className="sg-foot">
        <div className="sg-foot__left sg-mono">
          Built with React 19 · Tone.js · Vite · TypeScript
        </div>
        <a
          className="sg-foot__author"
          href="https://github.com/amanchhetri/beatlab"
          target="_blank"
          rel="noreferrer noopener"
        >
          <span>Made by Aman Chhetri</span>
          <span className="sg-foot__author-arrow" aria-hidden="true">↗</span>
        </a>
      </footer>
    </div>
  );
}

// Vite-injected build hash declaration; harmless if not defined.
declare const __BUILD_HASH__: string;
