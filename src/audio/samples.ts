import kick from '../assets/sounds/drums/kick.wav';
import snare from '../assets/sounds/drums/snare.wav';
import hatClosed from '../assets/sounds/drums/hat-closed.wav';
import hatOpen from '../assets/sounds/drums/hat-open.wav';
import clap from '../assets/sounds/drums/clap.wav';
import perc from '../assets/sounds/drums/perc.wav';
import crash from '../assets/sounds/drums/crash.wav';

export const DRUM_SAMPLES = {
  kick,
  snare,
  'hat-closed': hatClosed,
  'hat-open': hatOpen,
  clap,
  perc,
  crash,
} as const;

export type DrumSampleId = keyof typeof DRUM_SAMPLES;

export const DRUM_SAMPLE_IDS: DrumSampleId[] = [
  'kick',
  'snare',
  'hat-closed',
  'hat-open',
  'clap',
  'perc',
  'crash',
];
