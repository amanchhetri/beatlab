import * as Tone from 'tone';
import {
  DRUM_SAMPLES,
  DRUM_SAMPLE_IDS,
  type DrumSampleId,
} from '../audio/samples';
import { SYNTH_PRESETS } from '../audio/presets';
import { findPlaylistPatterns } from './playlist';
import { stepsToSeconds } from './positionMath';
import { STEPS_PER_BAR } from '../store/types';
import type {
  Channel,
  Pattern,
  PatternId,
  PlaylistBlock,
} from '../store/types';

export type RenderInput = {
  channels: Channel[];
  patterns: Record<PatternId, Pattern>;
  playlist: PlaylistBlock[];
  bpm: number;
};

const REVERB_TAIL_SECONDS = 1.5;

export function lastUsedBar(playlist: PlaylistBlock[]): number {
  let max = 0;
  for (const b of playlist) {
    max = Math.max(max, b.startBar + b.lengthBars);
  }
  return max;
}

export async function renderPlaylistToBuffer(input: RenderInput): Promise<AudioBuffer> {
  const totalBars = lastUsedBar(input.playlist);
  if (totalBars === 0) {
    throw new Error('Playlist is empty — drop at least one pattern before exporting.');
  }

  const barSec = (4 * 60) / input.bpm;
  const totalSec = totalBars * barSec + REVERB_TAIL_SECONDS;
  const stepSec = barSec / STEPS_PER_BAR;

  const result = await Tone.Offline(async ({ transport }) => {
    // Build drum players
    const drumPlayers: Partial<Record<DrumSampleId, Tone.Player>> = {};
    for (const id of DRUM_SAMPLE_IDS) {
      drumPlayers[id] = new Tone.Player({ url: DRUM_SAMPLES[id] }).toDestination();
    }

    // Build synth chain matching the live engine
    const preset = SYNTH_PRESETS.default;
    const synth = new Tone.PolySynth(Tone.Synth, preset.synthOptions);
    const filter = new Tone.Filter(preset.filterCutoff, 'lowpass');
    const reverb = new Tone.Reverb({ decay: preset.reverbDecay, wet: preset.reverbWet });
    synth.chain(filter, reverb, Tone.getDestination());

    await Tone.loaded();

    transport.bpm.value = input.bpm;

    // Walk every (bar, step) and schedule events at absolute offline-transport times
    for (let bar = 0; bar < totalBars; bar++) {
      for (let step = 0; step < STEPS_PER_BAR; step++) {
        const time = (bar * STEPS_PER_BAR + step) * stepSec;
        const hits = findPlaylistPatterns(input.playlist, bar, step);
        for (const hit of hits) {
          const pattern = input.patterns[hit.patternId];
          if (!pattern) continue;
          for (const ch of input.channels) {
            if (ch.type === 'drum') {
              if (pattern.drumGrid[ch.id]?.[step]) {
                const player = drumPlayers[ch.sampleId];
                if (player) player.start(time);
              }
            } else if (ch.type === 'synth') {
              for (const note of pattern.notes[ch.id] ?? []) {
                if (note.step !== step) continue;
                const freq = Tone.Frequency(note.pitch, 'midi').toFrequency();
                const lengthSec = stepsToSeconds(note.length, input.bpm);
                synth.triggerAttackRelease(freq, lengthSec, time, note.velocity);
              }
            }
          }
        }
      }
    }

    transport.start();
  }, totalSec);

  // Tone.Offline returns a ToneAudioBuffer; .get() exposes the AudioBuffer.
  const native = (result as unknown as { get: () => AudioBuffer | undefined }).get?.();
  return native ?? (result as unknown as AudioBuffer);
}
