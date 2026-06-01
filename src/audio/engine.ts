import * as Tone from 'tone';
import { DRUM_SAMPLES, DRUM_SAMPLE_IDS, type DrumSampleId } from './samples';
import { SYNTH_PRESETS, type SynthPresetId } from './presets';

const DEFAULT_NOTE_SECONDS = 0.25;

// Maps the fixed channel ids in the store to the engine's internal slots so the
// engine doesn't have to know about the store layer.
const DRUM_CHANNEL_ID_BY_SAMPLE: Record<DrumSampleId, string> = {
  kick: 'ch-kick',
  snare: 'ch-snare',
  'hat-closed': 'ch-hat-closed',
  'hat-open': 'ch-hat-open',
  clap: 'ch-clap',
  perc: 'ch-perc',
  crash: 'ch-crash',
};
const SYNTH_CHANNEL_ID = 'ch-synth';

class AudioEngine {
  private started = false;
  private drumPlayers: Partial<Record<DrumSampleId, Tone.Player>> = {};
  private channelGains: Record<string, Tone.Gain> = {};
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

    // Per-channel master gain nodes (mixer faders). Each voice routes through
    // its channel's gain, and gain.toDestination() goes to the speakers.
    for (const drumId of DRUM_SAMPLE_IDS) {
      const channelId = DRUM_CHANNEL_ID_BY_SAMPLE[drumId];
      const gain = new Tone.Gain(0.85).toDestination();
      this.channelGains[channelId] = gain;
      try {
        const player = new Tone.Player({ url: DRUM_SAMPLES[drumId], autostart: false }).connect(gain);
        this.drumPlayers[drumId] = player;
      } catch {
        this.failedSamples.add(drumId);
      }
    }

    const preset = SYNTH_PRESETS.default;
    const synthGain = new Tone.Gain(0.85).toDestination();
    this.channelGains[SYNTH_CHANNEL_ID] = synthGain;
    this.synth = new Tone.PolySynth(Tone.Synth, preset.synthOptions);
    this.synthFilter = new Tone.Filter(preset.filterCutoff, 'lowpass');
    this.synthReverb = new Tone.Reverb({ decay: preset.reverbDecay, wet: preset.reverbWet });
    this.synth.chain(this.synthFilter, this.synthReverb, synthGain);

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

  setChannelGain(channelId: string, gain: number): void {
    const node = this.channelGains[channelId];
    if (!node) return;
    // Ramp slightly to avoid zipper noise on rapid slider drags.
    node.gain.rampTo(Math.max(0, Math.min(1, gain)), 0.02);
  }

  setSynthPreset(id: SynthPresetId): void {
    if (!this.synth || !this.synthFilter || !this.synthReverb) return;
    const preset = SYNTH_PRESETS[id];
    this.synth.set(preset.synthOptions);
    this.synthFilter.frequency.value = preset.filterCutoff;
    this.synthReverb.decay = preset.reverbDecay;
    this.synthReverb.wet.value = preset.reverbWet;
  }

  setSynthCutoff(hz: number): void {
    if (!this.synthFilter) return;
    this.synthFilter.frequency.rampTo(hz, 0.05);
  }

  setSynthReverbWet(wet: number): void {
    if (!this.synthReverb) return;
    this.synthReverb.wet.rampTo(Math.max(0, Math.min(1, wet)), 0.05);
  }
}

export const audio = new AudioEngine();
export type { DrumSampleId } from './samples';
export type { SynthPresetId } from './presets';
