import { STEPS_PER_BAR } from './types';
import type { Channel, ChannelId, Note, Pattern, PatternId } from './types';

const FIXED_CHANNEL_IDS = {
  kick: 'ch-kick',
  snare: 'ch-snare',
  hatClosed: 'ch-hat-closed',
  hatOpen: 'ch-hat-open',
  clap: 'ch-clap',
  perc: 'ch-perc',
  crash: 'ch-crash',
  synth: 'ch-synth',
} as const;

export const SYNTH_CHANNEL_ID: ChannelId = FIXED_CHANNEL_IDS.synth;

export const DEFAULT_CHANNELS: Channel[] = [
  { id: FIXED_CHANNEL_IDS.kick, type: 'drum', name: 'Kick', sampleId: 'kick' },
  { id: FIXED_CHANNEL_IDS.snare, type: 'drum', name: 'Snare', sampleId: 'snare' },
  { id: FIXED_CHANNEL_IDS.hatClosed, type: 'drum', name: 'Hat Closed', sampleId: 'hat-closed' },
  { id: FIXED_CHANNEL_IDS.hatOpen, type: 'drum', name: 'Hat Open', sampleId: 'hat-open' },
  { id: FIXED_CHANNEL_IDS.clap, type: 'drum', name: 'Clap', sampleId: 'clap' },
  { id: FIXED_CHANNEL_IDS.perc, type: 'drum', name: 'Perc', sampleId: 'perc' },
  { id: FIXED_CHANNEL_IDS.crash, type: 'drum', name: 'Crash', sampleId: 'crash' },
  { id: FIXED_CHANNEL_IDS.synth, type: 'synth', name: 'Synth', presetId: 'default' },
];

export function emptyPattern(id: PatternId, name: string, channels: Channel[]): Pattern {
  const drumGrid: Record<ChannelId, boolean[]> = {};
  const notes: Record<ChannelId, Note[]> = {};
  for (const ch of channels) {
    if (ch.type === 'drum') {
      drumGrid[ch.id] = new Array(STEPS_PER_BAR).fill(false);
    } else {
      notes[ch.id] = [];
    }
  }
  return { id, name, drumGrid, notes };
}
