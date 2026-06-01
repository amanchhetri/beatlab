import { createStore } from './useStore';
import { loadInitialProjectWithSource, loadInitialBpm, attachPersistence } from './persistence';

const initial = loadInitialProjectWithSource();
export const useStore = createStore({
  channels: initial.channels,
  patterns: initial.patterns,
  patternOrder: initial.patternOrder,
  playlist: initial.playlist,
  // Shared links carry their own BPM; otherwise fall back to localStorage / default.
  bpm: initial.source === 'url' && initial.sharedBpm ? initial.sharedBpm : loadInitialBpm(),
});
attachPersistence(useStore);

// Bulk replace for "Load .beatlab" — replaces project data + bpm without recreating the store.
export function replaceProject(payload: {
  channels: typeof initial.channels;
  patterns: typeof initial.patterns;
  patternOrder: typeof initial.patternOrder;
  playlist: typeof initial.playlist;
  bpm: number;
}): void {
  useStore.setState({
    channels: payload.channels,
    patterns: payload.patterns,
    patternOrder: payload.patternOrder,
    playlist: payload.playlist,
    activePatternId: payload.patternOrder[0],
    bpm: payload.bpm,
    isPlaying: false,
    position: { bar: 0, step: 0 },
    recordArm: false,
    pianoRollOpen: false,
    selectedSynthChannelId: null,
  });
}
