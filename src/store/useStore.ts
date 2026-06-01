import { create, type StoreApi, type UseBoundStore } from 'zustand';
import {
  DEFAULT_MIXER_SETTINGS,
  MAX_BPM,
  MIN_BPM,
  TOTAL_PLAYLIST_BARS,
  PLAYLIST_LANES,
  type BlockId,
  type Channel,
  type ChannelId,
  type MixerSettings,
  type Note,
  type NoteId,
  type Pattern,
  type PatternId,
  type PlaybackMode,
  type PlaylistBlock,
  type SynthChannel,
  type TransportPosition,
} from './types';
import { DEFAULT_CHANNELS, defaultMixer, emptyPattern } from './defaults';
import type { SynthPresetId } from '../audio/presets';
import { MAX_CUTOFF, MIN_CUTOFF, SYNTH_PRESETS } from '../audio/presets';

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function snapBar(bar: number): number {
  return clamp(Math.round(bar), 0, TOTAL_PLAYLIST_BARS - 1);
}

function snapLane(lane: number): number {
  return clamp(Math.round(lane), 0, PLAYLIST_LANES - 1);
}

export type ProjectSlice = {
  channels: Channel[];
  patterns: Record<PatternId, Pattern>;
  patternOrder: PatternId[];
  playlist: PlaylistBlock[];
  mixer: Record<ChannelId, MixerSettings>;

  toggleStep: (patternId: PatternId, channelId: ChannelId, stepIndex: number) => void;
  addNote: (patternId: PatternId, channelId: ChannelId, note: Omit<Note, 'id'>) => NoteId;
  removeNote: (patternId: PatternId, channelId: ChannelId, noteId: NoteId) => void;
  updateNote: (patternId: PatternId, channelId: ChannelId, noteId: NoteId, partial: Partial<Omit<Note, 'id'>>) => void;
  createPattern: (name?: string) => PatternId;
  renamePattern: (patternId: PatternId, name: string) => void;
  duplicatePattern: (patternId: PatternId) => PatternId;
  deletePattern: (patternId: PatternId) => void;
  clearChannel: (patternId: PatternId, channelId: ChannelId) => void;
  addPlaylistBlock: (patternId: PatternId, lane: number, startBar: number) => BlockId;
  movePlaylistBlock: (blockId: BlockId, lane: number, startBar: number) => void;
  resizePlaylistBlock: (blockId: BlockId, lengthBars: number) => void;
  deletePlaylistBlock: (blockId: BlockId) => void;
  captureLiveHit: (channelId: ChannelId, pitch?: number, velocity?: number) => void;
  setChannelVolume: (channelId: ChannelId, volume: number) => void;
  toggleChannelMute: (channelId: ChannelId) => void;
  toggleChannelSolo: (channelId: ChannelId) => void;
  setSynthPreset: (channelId: ChannelId, presetId: SynthPresetId) => void;
  setSynthCutoff: (channelId: ChannelId, cutoff: number) => void;
  setSynthReverbWet: (channelId: ChannelId, wet: number) => void;
};

export type TransportSlice = {
  bpm: number;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  position: TransportPosition;
  recordArm: boolean;
  activePatternId: PatternId;

  play: () => void;
  stop: () => void;
  setBpm: (bpm: number) => void;
  setPlaybackMode: (mode: PlaybackMode) => void;
  toggleRecordArm: () => void;
  setActivePattern: (patternId: PatternId) => void;
  tick: (bar: number, step: number) => void;
};

export type UiSlice = {
  selectedSynthChannelId: ChannelId | null;
  pianoRollOpen: boolean;

  openPianoRoll: (channelId: ChannelId) => void;
  closePianoRoll: () => void;
};

export type StoreState = ProjectSlice & TransportSlice & UiSlice;

function deepClonePattern(pattern: Pattern, newId: PatternId, newName: string): Pattern {
  const drumGrid: Record<ChannelId, boolean[]> = {};
  const notes: Record<ChannelId, Note[]> = {};
  for (const [chId, row] of Object.entries(pattern.drumGrid)) {
    drumGrid[chId] = [...row];
  }
  for (const [chId, list] of Object.entries(pattern.notes)) {
    notes[chId] = list.map(n => ({ ...n }));
  }
  return { id: newId, name: newName, drumGrid, notes };
}

export type StoreSeed = {
  channels: Channel[];
  patterns: Record<PatternId, Pattern>;
  patternOrder: PatternId[];
  playlist: PlaylistBlock[];
  bpm: number;
  mixer?: Record<ChannelId, MixerSettings>;
};

export function createStore(seed?: StoreSeed): UseBoundStore<StoreApi<StoreState>> {
  return create<StoreState>((set, get) => {
    const seeded = seed ?? null;
    let channels: Channel[];
    let patterns: Record<PatternId, Pattern>;
    let patternOrder: PatternId[];
    let playlist: PlaylistBlock[];
    let bpm: number;
    let mixer: Record<ChannelId, MixerSettings>;

    if (seeded) {
      channels = seeded.channels;
      patterns = seeded.patterns;
      patternOrder = seeded.patternOrder;
      playlist = seeded.playlist;
      bpm = seeded.bpm;
      // Backfill defaults for channels missing mixer entries (loading older files / URLs).
      const seededMixer = seeded.mixer ?? {};
      mixer = {};
      for (const ch of channels) {
        mixer[ch.id] = seededMixer[ch.id] ?? { ...DEFAULT_MIXER_SETTINGS };
      }
    } else {
      const initialPatternId = newId('pat');
      channels = DEFAULT_CHANNELS;
      patterns = { [initialPatternId]: emptyPattern(initialPatternId, 'Pattern 1', DEFAULT_CHANNELS) };
      patternOrder = [initialPatternId];
      playlist = [];
      bpm = 120;
      mixer = defaultMixer(channels);
    }

    const activePatternId = patternOrder[0];

    return {
      channels,
      patterns,
      patternOrder,
      playlist,
      mixer,

      bpm,
      isPlaying: false,
      playbackMode: 'pattern',
      position: { bar: 0, step: 0 },
      recordArm: false,
      activePatternId,

      selectedSynthChannelId: null,
      pianoRollOpen: false,

      toggleStep(patternId, channelId, stepIndex) {
        const pattern = get().patterns[patternId];
        if (!pattern || !pattern.drumGrid[channelId]) return;
        const row = pattern.drumGrid[channelId].slice();
        row[stepIndex] = !row[stepIndex];
        set({
          patterns: {
            ...get().patterns,
            [patternId]: {
              ...pattern,
              drumGrid: { ...pattern.drumGrid, [channelId]: row },
            },
          },
        });
      },

      addNote(patternId, channelId, note) {
        const pattern = get().patterns[patternId];
        if (!pattern) return '';
        const id = newId('note');
        const list = pattern.notes[channelId] ?? [];
        set({
          patterns: {
            ...get().patterns,
            [patternId]: {
              ...pattern,
              notes: { ...pattern.notes, [channelId]: [...list, { id, ...note }] },
            },
          },
        });
        return id;
      },

      removeNote(patternId, channelId, noteId) {
        const pattern = get().patterns[patternId];
        if (!pattern) return;
        const list = pattern.notes[channelId] ?? [];
        set({
          patterns: {
            ...get().patterns,
            [patternId]: {
              ...pattern,
              notes: { ...pattern.notes, [channelId]: list.filter(n => n.id !== noteId) },
            },
          },
        });
      },

      updateNote(patternId, channelId, noteId, partial) {
        const pattern = get().patterns[patternId];
        if (!pattern) return;
        const list = pattern.notes[channelId] ?? [];
        set({
          patterns: {
            ...get().patterns,
            [patternId]: {
              ...pattern,
              notes: {
                ...pattern.notes,
                [channelId]: list.map(n => (n.id === noteId ? { ...n, ...partial } : n)),
              },
            },
          },
        });
      },

      createPattern(name) {
        const id = newId('pat');
        const order = get().patternOrder;
        const finalName = name ?? `Pattern ${order.length + 1}`;
        const pattern = emptyPattern(id, finalName, get().channels);
        set({
          patterns: { ...get().patterns, [id]: pattern },
          patternOrder: [...order, id],
        });
        return id;
      },

      renamePattern(patternId, name) {
        const pattern = get().patterns[patternId];
        if (!pattern) return;
        set({
          patterns: { ...get().patterns, [patternId]: { ...pattern, name } },
        });
      },

      duplicatePattern(patternId) {
        const src = get().patterns[patternId];
        if (!src) return '';
        const id = newId('pat');
        const copy = deepClonePattern(src, id, `${src.name} (copy)`);
        const order = get().patternOrder;
        const srcIndex = order.indexOf(patternId);
        const newOrder = [...order];
        newOrder.splice(srcIndex + 1, 0, id);
        set({
          patterns: { ...get().patterns, [id]: copy },
          patternOrder: newOrder,
        });
        return id;
      },

      deletePattern(patternId) {
        const order = get().patternOrder;
        if (!get().patterns[patternId]) return;

        // Deleting the only remaining pattern → replace it with a fresh empty one
        // so the user can "wipe and restart" without ending up in a stateless app.
        if (order.length <= 1) {
          const freshId = newId('pat');
          const fresh = emptyPattern(freshId, 'Pattern 1', get().channels);
          set({
            patterns: { [freshId]: fresh },
            patternOrder: [freshId],
            playlist: get().playlist.filter(b => b.patternId !== patternId),
            activePatternId: freshId,
          });
          return;
        }

        const newOrder = order.filter(id => id !== patternId);
        const { [patternId]: _removed, ...rest } = get().patterns;
        const newPlaylist = get().playlist.filter(b => b.patternId !== patternId);
        const wasActive = get().activePatternId === patternId;
        set({
          patterns: rest,
          patternOrder: newOrder,
          playlist: newPlaylist,
          activePatternId: wasActive ? newOrder[0] : get().activePatternId,
        });
      },

      clearChannel(patternId, channelId) {
        const pattern = get().patterns[patternId];
        if (!pattern) return;
        const channel = get().channels.find(c => c.id === channelId);
        if (!channel) return;
        if (channel.type === 'drum') {
          if (!pattern.drumGrid[channelId]) return;
          set({
            patterns: {
              ...get().patterns,
              [patternId]: {
                ...pattern,
                drumGrid: {
                  ...pattern.drumGrid,
                  [channelId]: new Array(pattern.drumGrid[channelId].length).fill(false),
                },
              },
            },
          });
        } else {
          set({
            patterns: {
              ...get().patterns,
              [patternId]: {
                ...pattern,
                notes: { ...pattern.notes, [channelId]: [] },
              },
            },
          });
        }
      },

      setChannelVolume(channelId, volume) {
        const current = get().mixer[channelId];
        if (!current) return;
        const safe = clamp(volume, 0, 1);
        if (current.volume === safe) return;
        set({ mixer: { ...get().mixer, [channelId]: { ...current, volume: safe } } });
      },

      toggleChannelMute(channelId) {
        const current = get().mixer[channelId];
        if (!current) return;
        set({ mixer: { ...get().mixer, [channelId]: { ...current, muted: !current.muted } } });
      },

      toggleChannelSolo(channelId) {
        const current = get().mixer[channelId];
        if (!current) return;
        set({ mixer: { ...get().mixer, [channelId]: { ...current, soloed: !current.soloed } } });
      },

      setSynthPreset(channelId, presetId) {
        const channels = get().channels;
        const channel = channels.find(c => c.id === channelId);
        if (!channel || channel.type !== 'synth') return;
        if (!SYNTH_PRESETS[presetId]) return;
        // Switching presets resets the per-channel cutoff/reverbWet overrides
        // so the new preset's defaults take effect cleanly.
        const updated: SynthChannel = {
          ...channel,
          presetId,
          cutoff: undefined,
          reverbWet: undefined,
        };
        set({ channels: channels.map(c => (c.id === channelId ? updated : c)) });
      },

      setSynthCutoff(channelId, cutoff) {
        const channels = get().channels;
        const channel = channels.find(c => c.id === channelId);
        if (!channel || channel.type !== 'synth') return;
        const safe = clamp(Math.round(cutoff), MIN_CUTOFF, MAX_CUTOFF);
        const updated: SynthChannel = { ...channel, cutoff: safe };
        set({ channels: channels.map(c => (c.id === channelId ? updated : c)) });
      },

      setSynthReverbWet(channelId, wet) {
        const channels = get().channels;
        const channel = channels.find(c => c.id === channelId);
        if (!channel || channel.type !== 'synth') return;
        const safe = clamp(wet, 0, 1);
        const updated: SynthChannel = { ...channel, reverbWet: safe };
        set({ channels: channels.map(c => (c.id === channelId ? updated : c)) });
      },

      addPlaylistBlock(patternId, lane, startBar) {
        const id = newId('blk');
        set({
          playlist: [
            ...get().playlist,
            {
              id,
              patternId,
              lane: snapLane(lane),
              startBar: snapBar(startBar),
              lengthBars: 1,
            },
          ],
        });
        return id;
      },

      movePlaylistBlock(blockId, lane, startBar) {
        set({
          playlist: get().playlist.map(b =>
            b.id === blockId ? { ...b, lane: snapLane(lane), startBar: snapBar(startBar) } : b
          ),
        });
      },

      resizePlaylistBlock(blockId, lengthBars) {
        const safe = Math.max(1, Math.round(lengthBars));
        set({
          playlist: get().playlist.map(b => (b.id === blockId ? { ...b, lengthBars: safe } : b)),
        });
      },

      deletePlaylistBlock(blockId) {
        set({ playlist: get().playlist.filter(b => b.id !== blockId) });
      },

      captureLiveHit(channelId, pitch, velocity = 1) {
        const { activePatternId, position, patterns, channels } = get();
        const pattern = patterns[activePatternId];
        if (!pattern) return;
        const channel = channels.find(c => c.id === channelId);
        if (!channel) return;
        const step = clamp(Math.round(position.step), 0, 15);

        if (channel.type === 'drum' && pattern.drumGrid[channelId]) {
          if (pattern.drumGrid[channelId][step]) return; // idempotent — never toggles off
          const row = pattern.drumGrid[channelId].slice();
          row[step] = true;
          set({
            patterns: {
              ...patterns,
              [activePatternId]: {
                ...pattern,
                drumGrid: { ...pattern.drumGrid, [channelId]: row },
              },
            },
          });
          return;
        }

        if (channel.type === 'synth' && typeof pitch === 'number') {
          const id = newId('note');
          const list = pattern.notes[channelId] ?? [];
          set({
            patterns: {
              ...patterns,
              [activePatternId]: {
                ...pattern,
                notes: {
                  ...pattern.notes,
                  [channelId]: [...list, { id, step, pitch, length: 1, velocity }],
                },
              },
            },
          });
        }
      },

      play() {
        set({ isPlaying: true });
      },

      stop() {
        set({ isPlaying: false, position: { bar: 0, step: 0 } });
      },

      setBpm(bpm) {
        set({ bpm: clamp(Math.round(bpm), MIN_BPM, MAX_BPM) });
      },

      setPlaybackMode(mode) {
        set({ playbackMode: mode });
      },

      toggleRecordArm() {
        set({ recordArm: !get().recordArm });
      },

      setActivePattern(patternId) {
        if (!get().patterns[patternId]) return;
        set({ activePatternId: patternId });
      },

      tick(bar, step) {
        set({ position: { bar, step } });
      },

      openPianoRoll(channelId) {
        set({ selectedSynthChannelId: channelId, pianoRollOpen: true });
      },

      closePianoRoll() {
        set({ pianoRollOpen: false });
      },
    };
  });
}

export function createFreshStore(): UseBoundStore<StoreApi<StoreState>> {
  return createStore();
}

export { SYNTH_CHANNEL_ID } from './defaults';
