import type { SynthOptions } from 'tone';
import type { RecursivePartial } from 'tone/build/esm/core/util/Interface';

export type SynthPresetId = 'default';

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
    label: 'Default Saw',
    synthOptions: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.7, release: 0.3 },
    },
    filterCutoff: 1500,
    reverbDecay: 1.2,
    reverbWet: 0.15,
  },
};
