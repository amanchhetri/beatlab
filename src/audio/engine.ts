import * as Tone from 'tone';
import { DRUM_SAMPLES, DRUM_SAMPLE_IDS, type DrumSampleId } from './samples';
import { SYNTH_PRESETS, type SynthPresetId } from './presets';

const DEFAULT_NOTE_SECONDS = 0.25;

class AudioEngine {
  private started = false;
  private drumPlayers: Partial<Record<DrumSampleId, Tone.Player>> = {};
  private synth: Tone.PolySynth | null = null;
  private synthFilter: Tone.Filter | null = null;
  private synthReverb: Tone.Reverb | null = null;
  public failedSamples = new Set<DrumSampleId>();

  isStarted(): boolean {
    return this.started;
  }

  async start(): Promise<void> {
    if (this.started) return;
    await Tone.start();

    for (const id of DRUM_SAMPLE_IDS) {
      try {
        const player = new Tone.Player({ url: DRUM_SAMPLES[id], autostart: false }).toDestination();
        this.drumPlayers[id] = player;
      } catch {
        this.failedSamples.add(id);
      }
    }

    const preset = SYNTH_PRESETS.default;
    this.synth = new Tone.PolySynth(Tone.Synth, preset.synthOptions);
    this.synthFilter = new Tone.Filter(preset.filterCutoff, 'lowpass');
    this.synthReverb = new Tone.Reverb({ decay: preset.reverbDecay, wet: preset.reverbWet });
    this.synth.chain(this.synthFilter, this.synthReverb, Tone.Destination);

    await Tone.loaded();
    this.started = true;
  }

  playDrum(sampleId: DrumSampleId, time?: number, velocity = 1): void {
    if (!this.started) return;
    const player = this.drumPlayers[sampleId];
    if (!player || !player.loaded) return;
    player.volume.value = Tone.gainToDb(velocity);
    player.start(time);
  }

  playSynth(pitch: number, time?: number, lengthSeconds = DEFAULT_NOTE_SECONDS, velocity = 1): void {
    if (!this.started || !this.synth) return;
    const note = Tone.Frequency(pitch, 'midi').toFrequency();
    this.synth.triggerAttackRelease(note, lengthSeconds, time, velocity);
  }

  setSynthPreset(id: SynthPresetId): void {
    if (!this.synth || !this.synthFilter || !this.synthReverb) return;
    const preset = SYNTH_PRESETS[id];
    this.synth.set(preset.synthOptions);
    this.synthFilter.frequency.value = preset.filterCutoff;
    this.synthReverb.decay = preset.reverbDecay;
    this.synthReverb.wet.value = preset.reverbWet;
  }
}

export const audio = new AudioEngine();
export type { DrumSampleId } from './samples';
export type { SynthPresetId } from './presets';
