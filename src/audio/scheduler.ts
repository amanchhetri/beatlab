import type {
  Channel,
  Pattern,
  PatternId,
  PlaybackMode,
  PlaylistBlock,
} from '../store/types';
import { findPlaylistPatterns } from '../lib/playlist';
import { stepsToSeconds } from '../lib/positionMath';
import type { DrumSampleId } from './samples';

export type AudioEngineLike = {
  playDrum: (sampleId: DrumSampleId, time: number, velocity?: number) => void;
  playSynth: (pitch: number, time: number, lengthSeconds: number, velocity: number) => void;
};

export type SchedulerState = {
  channels: Channel[];
  patterns: Record<PatternId, Pattern>;
  playlist: PlaylistBlock[];
  playbackMode: PlaybackMode;
  activePatternId: PatternId;
  bpm: number;
};

export function dispatchAtStep(
  state: SchedulerState,
  engine: AudioEngineLike,
  time: number,
  bar: number,
  step: number
): void {
  const hits =
    state.playbackMode === 'pattern'
      ? [{ patternId: state.activePatternId, localStep: step }]
      : findPlaylistPatterns(state.playlist, bar, step).map(h => ({
          patternId: h.patternId,
          localStep: h.localStep,
        }));

  for (const { patternId, localStep } of hits) {
    const pattern = state.patterns[patternId];
    if (!pattern) continue;
    for (const ch of state.channels) {
      if (ch.type === 'drum') {
        if (pattern.drumGrid[ch.id]?.[localStep]) {
          engine.playDrum(ch.sampleId, time);
        }
      } else if (ch.type === 'synth') {
        const notes = pattern.notes[ch.id] ?? [];
        for (const note of notes) {
          if (note.step === localStep) {
            const lengthSec = stepsToSeconds(note.length, state.bpm);
            engine.playSynth(note.pitch, time, lengthSec, note.velocity);
          }
        }
      }
    }
  }
}
