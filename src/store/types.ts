import type { DrumSampleId, SynthPresetId } from '../audio/engine';

export const STEPS_PER_BAR = 16;
export const TOTAL_PLAYLIST_BARS = 32;
export const PLAYLIST_LANES = 4;
export const MIN_BPM = 40;
export const MAX_BPM = 240;

export type ChannelId = string;
export type PatternId = string;
export type NoteId = string;
export type BlockId = string;

export type DrumChannel = {
  id: ChannelId;
  type: 'drum';
  name: string;
  sampleId: DrumSampleId;
};

export type SynthChannel = {
  id: ChannelId;
  type: 'synth';
  name: string;
  presetId: SynthPresetId;
  // When undefined, fall back to the preset's defaults.
  cutoff?: number;
  reverbWet?: number;
};

export type MixerSettings = {
  volume: number; // 0..1, linear gain
  muted: boolean;
  soloed: boolean;
};

export const DEFAULT_MIXER_SETTINGS: MixerSettings = {
  volume: 0.85,
  muted: false,
  soloed: false,
};

export type Channel = DrumChannel | SynthChannel;

export type Note = {
  id: NoteId;
  step: number;
  pitch: number;
  length: number;
  velocity: number;
};

export type Pattern = {
  id: PatternId;
  name: string;
  drumGrid: Record<ChannelId, boolean[]>;
  notes: Record<ChannelId, Note[]>;
};

export type PlaylistBlock = {
  id: BlockId;
  patternId: PatternId;
  lane: number;
  startBar: number;
  lengthBars: number;
};

export type PlaybackMode = 'pattern' | 'playlist';
export type RecState = 'idle' | 'armed';

export type TransportPosition = {
  bar: number;
  step: number;
};
