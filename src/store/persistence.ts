import type { StoreApi, UseBoundStore } from 'zustand';
import {
  MIN_BPM,
  MAX_BPM,
  type Channel,
  type ChannelId,
  type MixerSettings,
  type Pattern,
  type PatternId,
  type PlaylistBlock,
} from './types';
import { DEFAULT_CHANNELS, defaultMixer, emptyPattern } from './defaults';
import type { StoreState } from './useStore';
import { decodeProjectFromUrlParam } from '../lib/projectIO';

const PROJECT_KEY = 'beatlab:project';
const BPM_KEY = 'beatlab:bpm';
const DEBOUNCE_MS = 300;

type SerializedProject = {
  schemaVersion: 1;
  channels: Channel[];
  patterns: Record<PatternId, Pattern>;
  patternOrder: PatternId[];
  playlist: PlaylistBlock[];
  // Added after v1 shipped — optional for backward compat with older saves.
  mixer?: Record<ChannelId, MixerSettings>;
};

function freshProject(): SerializedProject {
  const id = `pat-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
  return {
    schemaVersion: 1,
    channels: DEFAULT_CHANNELS,
    patterns: { [id]: emptyPattern(id, 'Pattern 1', DEFAULT_CHANNELS) },
    patternOrder: [id],
    playlist: [],
    mixer: defaultMixer(DEFAULT_CHANNELS),
  };
}

type HydrationResult = SerializedProject & { source: 'url' | 'storage' | 'fresh'; sharedBpm?: number };

export function loadInitialProject(): SerializedProject {
  return loadInitialProjectWithSource();
}

export function loadInitialProjectWithSource(): HydrationResult {
  // URL takes priority — opening a shared link should show that project.
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get('p');
      if (encoded) {
        const payload = decodeProjectFromUrlParam(encoded);
        if (payload && payload.schemaVersion === 1) {
          // Clear the param so subsequent edits don't keep the user "on" the shared snapshot.
          try {
            window.history.replaceState({}, '', window.location.pathname);
          } catch {
            /* noop */
          }
          return {
            source: 'url',
            sharedBpm: payload.bpm,
            schemaVersion: 1,
            channels: payload.channels,
            patterns: payload.patterns,
            patternOrder: payload.patternOrder,
            playlist: payload.playlist,
            mixer: payload.mixer,
          };
        }
      }
    } catch {
      /* fall through */
    }
  }

  if (typeof localStorage === 'undefined') return { source: 'fresh', ...freshProject() };
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    if (!raw) return { source: 'fresh', ...freshProject() };
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== 1) return { source: 'fresh', ...freshProject() };
    return { source: 'storage', ...(parsed as SerializedProject) };
  } catch {
    console.warn('beatlab: project autoload failed, starting fresh');
    return { source: 'fresh', ...freshProject() };
  }
}

export function loadInitialBpm(): number {
  try {
    if (typeof localStorage === 'undefined') return 120;
    const raw = localStorage.getItem(BPM_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= MIN_BPM && n <= MAX_BPM ? n : 120;
  } catch {
    return 120;
  }
}

export function attachPersistence(store: UseBoundStore<StoreApi<StoreState>>): () => void {
  let timer: number | null = null;

  const unsubProject = store.subscribe((state, prev) => {
    if (
      state.channels === prev.channels &&
      state.patterns === prev.patterns &&
      state.patternOrder === prev.patternOrder &&
      state.playlist === prev.playlist &&
      state.mixer === prev.mixer
    ) {
      return;
    }
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      try {
        const payload: SerializedProject = {
          schemaVersion: 1,
          channels: state.channels,
          patterns: state.patterns,
          patternOrder: state.patternOrder,
          playlist: state.playlist,
          mixer: state.mixer,
        };
        localStorage.setItem(PROJECT_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn('beatlab: project autosave failed', e);
      }
    }, DEBOUNCE_MS);
  });

  const unsubBpm = store.subscribe((state, prev) => {
    if (state.bpm === prev.bpm) return;
    try {
      localStorage.setItem(BPM_KEY, String(state.bpm));
    } catch (e) {
      console.warn('beatlab: bpm autosave failed', e);
    }
  });

  return () => {
    unsubProject();
    unsubBpm();
    if (timer !== null) window.clearTimeout(timer);
  };
}

export const PERSISTENCE_KEYS = { PROJECT_KEY, BPM_KEY };
