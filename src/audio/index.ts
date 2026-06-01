import { audio } from './engine';
import { StepScheduler } from './stepScheduler';
import { useStore } from '../store/singleton';
import { effectiveGain } from '../lib/mixer';

export const scheduler = new StepScheduler(audio, useStore);
export { audio } from './engine';

// Subscribe once: any change to the mixer or synth channel parameters
// is pushed into the audio engine.
let lastMixer = useStore.getState().mixer;
let lastChannels = useStore.getState().channels;

useStore.subscribe(state => {
  if (state.mixer !== lastMixer) {
    for (const ch of state.channels) {
      audio.setChannelGain(ch.id, effectiveGain(state.mixer, ch.id));
    }
    lastMixer = state.mixer;
  }

  if (state.channels !== lastChannels) {
    const oldSynth = lastChannels.find(c => c.type === 'synth');
    const newSynth = state.channels.find(c => c.type === 'synth');
    if (newSynth && newSynth.type === 'synth') {
      const oldPreset = oldSynth?.type === 'synth' ? oldSynth.presetId : undefined;
      if (newSynth.presetId !== oldPreset) {
        audio.setSynthPreset(newSynth.presetId);
      }
      const oldCutoff = oldSynth?.type === 'synth' ? oldSynth.cutoff : undefined;
      if (newSynth.cutoff !== oldCutoff && newSynth.cutoff !== undefined) {
        audio.setSynthCutoff(newSynth.cutoff);
      }
      const oldWet = oldSynth?.type === 'synth' ? oldSynth.reverbWet : undefined;
      if (newSynth.reverbWet !== oldWet && newSynth.reverbWet !== undefined) {
        audio.setSynthReverbWet(newSynth.reverbWet);
      }
    }
    lastChannels = state.channels;
  }
});

// Push the current store snapshot into the engine. Call after engine.start()
// completes so the engine reflects mixer/preset/cutoff/reverb on first frame.
export function syncEngineFromStore(): void {
  const state = useStore.getState();
  for (const ch of state.channels) {
    audio.setChannelGain(ch.id, effectiveGain(state.mixer, ch.id));
  }
  const synth = state.channels.find(c => c.type === 'synth');
  if (synth && synth.type === 'synth') {
    audio.setSynthPreset(synth.presetId);
    if (synth.cutoff !== undefined) audio.setSynthCutoff(synth.cutoff);
    if (synth.reverbWet !== undefined) audio.setSynthReverbWet(synth.reverbWet);
  }
}
