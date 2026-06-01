import type { SynthOptions } from 'tone';
import type { RecursivePartial } from 'tone/build/esm/core/util/Interface';

export type SynthPresetId = 'default' | 'bass' | 'lead' | 'pad' | 'pluck';

export type SynthPreset = {
  id: SynthPresetId;
  label: string;
  synthOptions: RecursivePartial<SynthOptions>;
  filterCutoff: number;
  reverbDecay: number;
  reverbWet: number;
};

export const SYNTH_PRESETS: Record<SynthPresetId, SynthPreset> = {
  default: {
    id: 'default',
    label: 'Saw',
    synthOptions: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.7, release: 0.3 },
    },
    filterCutoff: 1500,
    reverbDecay: 1.2,
    reverbWet: 0.15,
  },
  bass: {
    id: 'bass',
    label: 'Bass',
    synthOptions: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.8, release: 0.2 },
    },
    filterCutoff: 600,
    reverbDecay: 0.8,
    reverbWet: 0.05,
  },
  lead: {
    id: 'lead',
    label: 'Lead',
    synthOptions: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.05, sustain: 0.6, release: 0.15 },
    },
    filterCutoff: 3500,
    reverbDecay: 1.5,
    reverbWet: 0.25,
  },
  pad: {
    id: 'pad',
    label: 'Pad',
    synthOptions: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.5, decay: 0.3, sustain: 0.85, release: 1.2 },
    },
    filterCutoff: 1200,
    reverbDecay: 2.5,
    reverbWet: 0.5,
  },
  pluck: {
    id: 'pluck',
    label: 'Pluck',
    synthOptions: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0.0, release: 0.18 },
    },
    filterCutoff: 2500,
    reverbDecay: 1.0,
    reverbWet: 0.2,
  },
};

export const SYNTH_PRESET_IDS: SynthPresetId[] = ['default', 'bass', 'lead', 'pad', 'pluck'];
export const MIN_CUTOFF = 200;
export const MAX_CUTOFF = 8000;
