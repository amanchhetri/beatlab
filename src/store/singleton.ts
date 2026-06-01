import { createStore } from './useStore';
import { loadInitialProjectWithSource, loadInitialBpm, attachPersistence } from './persistence';
import { DEFAULT_MIXER_SETTINGS, type Channel, type ChannelId, type MixerSettings, type Pattern, type PatternId, type PlaylistBlock } from './types';

const initial = loadInitialProjectWithSource();
export const useStore = createStore({
  channels: initial.channels,
  patterns: initial.patterns,
  patternOrder: initial.patternOrder,
  playlist: initial.playlist,
  mixer: initial.mixer,
  // Shared links carry their own BPM; otherwise fall back to localStorage / default.
  bpm: initial.source === 'url' && initial.sharedBpm ? initial.sharedBpm : loadInitialBpm(),
});
attachPersistence(useStore);

// Bulk replace for "Load .beatlab" — replaces project data + bpm without recreating the store.
export function replaceProject(payload: {
  channels: Channel[];
  patterns: Record<PatternId, Pattern>;
  patternOrder: PatternId[];
  playlist: PlaylistBlock[];
  bpm: number;
  mixer?: Record<ChannelId, MixerSettings>;
}): void {
  const seededMixer = payload.mixer ?? {};
  const mixer: Record<ChannelId, MixerSettings> = {};
  for (const ch of payload.channels) {
    mixer[ch.id] = seededMixer[ch.id] ?? { ...DEFAULT_MIXER_SETTINGS };
  }
  useStore.setState({
    channels: payload.channels,
    patterns: payload.patterns,
    patternOrder: payload.patternOrder,
    playlist: payload.playlist,
    activePatternId: payload.patternOrder[0],
    bpm: payload.bpm,
    mixer,
    isPlaying: false,
    position: { bar: 0, step: 0 },
    recordArm: false,
    pianoRollOpen: false,
    selectedSynthChannelId: null,
  });
}
