import { STEPS_PER_BAR } from '../store/types';

const BEATS_PER_BAR = 4;
const STEPS_PER_BEAT = STEPS_PER_BAR / BEATS_PER_BAR;

export function stepsToSeconds(steps: number, bpm: number): number {
  const secondsPerBeat = 60 / bpm;
  return (steps / STEPS_PER_BEAT) * secondsPerBeat;
}

export function snapToNearestStep(rawStep: number): number {
  const rounded = Math.round(rawStep);
  return ((rounded % STEPS_PER_BAR) + STEPS_PER_BAR) % STEPS_PER_BAR;
}

export function pixelToBar(px: number, pixelsPerBar: number): number {
  if (px <= 0) return 0;
  return Math.round(px / pixelsPerBar);
}
