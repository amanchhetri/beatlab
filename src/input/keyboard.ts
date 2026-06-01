import type { StoreApi, UseBoundStore } from 'zustand';
import { audio } from '../audio/engine';
import type { StoreState } from '../store/useStore';
import { SYNTH_CHANNEL_ID } from '../store/defaults';

/**
 * Keyboard piano layout starting at C4 (MIDI 60):
 *   Black row (W,E,T,Y,U,O,P):    C#4 D#4 _ F#4 G#4 A#4 _ C#5 D#5 _
 *   White row (A,S,D,F,G,H,J,K,L):  C4 D4 E4 F4 G4 A4 B4 C5 D5
 *
 * Drums on Z..M:
 *   Z=kick X=snare C=hat-closed V=hat-open B=clap N=perc M=crash
 */
const SYNTH_KEYS: Record<string, number> = {
  a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71,
  k: 72, o: 73, l: 74, p: 75,
};

const DRUM_KEYS: Record<string, 'kick' | 'snare' | 'hat-closed' | 'hat-open' | 'clap' | 'perc' | 'crash'> = {
  z: 'kick',
  x: 'snare',
  c: 'hat-closed',
  v: 'hat-open',
  b: 'clap',
  n: 'perc',
  m: 'crash',
};

const DRUM_CHANNEL_BY_SAMPLE: Record<string, string> = {
  kick: 'ch-kick',
  snare: 'ch-snare',
  'hat-closed': 'ch-hat-closed',
  'hat-open': 'ch-hat-open',
  clap: 'ch-clap',
  perc: 'ch-perc',
  crash: 'ch-crash',
};

export function attachKeyboard(store: UseBoundStore<StoreApi<StoreState>>): () => void {
  const heldKeys = new Set<string>();

  function onKeyDown(e: KeyboardEvent) {
    // Don't capture while typing in form controls
    const target = e.target as HTMLElement;
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
      return;
    }

    const key = e.key.toLowerCase();
    if (heldKeys.has(key)) return; // ignore key repeat
    heldKeys.add(key);

    // Spacebar = play/stop
    if (key === ' ') {
      e.preventDefault();
      const s = store.getState();
      if (s.isPlaying) s.stop();
      else s.play();
      return;
    }

    // Shift = toggle record-arm
    if (key === 'shift') {
      e.preventDefault();
      store.getState().toggleRecordArm();
      return;
    }

    // Synth notes
    if (key in SYNTH_KEYS) {
      const pitch = SYNTH_KEYS[key];
      audio.playSynth(pitch);
      const s = store.getState();
      if (s.recordArm && s.isPlaying) {
        s.captureLiveHit(SYNTH_CHANNEL_ID, pitch, 1);
      }
      return;
    }

    // Drum hits
    if (key in DRUM_KEYS) {
      const sampleId = DRUM_KEYS[key];
      audio.playDrum(sampleId);
      const s = store.getState();
      if (s.recordArm && s.isPlaying) {
        const channelId = DRUM_CHANNEL_BY_SAMPLE[sampleId];
        s.captureLiveHit(channelId);
      }
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    heldKeys.delete(e.key.toLowerCase());
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}
