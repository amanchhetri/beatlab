import * as Tone from 'tone';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { StoreState } from '../store/useStore';
import { STEPS_PER_BAR, TOTAL_PLAYLIST_BARS } from '../store/types';
import { dispatchAtStep, type AudioEngineLike } from './scheduler';

export class StepScheduler {
  private engine: AudioEngineLike;
  private store: UseBoundStore<StoreApi<StoreState>>;
  private repeatId: number | null = null;

  constructor(engine: AudioEngineLike, store: UseBoundStore<StoreApi<StoreState>>) {
    this.engine = engine;
    this.store = store;
  }

  start(): void {
    const state = this.store.getState();
    Tone.Transport.bpm.value = state.bpm;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd =
      state.playbackMode === 'pattern' ? '1m' : `${TOTAL_PLAYLIST_BARS}m`;
    Tone.Transport.loop = true;
    Tone.Transport.position = '0:0:0';
    this.repeatId = Tone.Transport.scheduleRepeat(this.onTick, '16n') as unknown as number;
    Tone.Transport.start();
  }

  stop(): void {
    if (this.repeatId !== null) {
      Tone.Transport.clear(this.repeatId);
      this.repeatId = null;
    }
    Tone.Transport.stop();
    Tone.Transport.position = '0:0:0';
    this.store.getState().tick(0, 0);
  }

  private onTick = (time: number) => {
    // Tone.Transport.position is "BARS:BEATS:SIXTEENTHS" where BEATS is 0..3
    // and SIXTEENTHS is 0..3.999 within the current beat. Global step in bar = beat*4 + sixteenth.
    const pos = Tone.Transport.position.toString();
    const [barsStr, beatsStr, sixteenthsStr] = pos.split(':');
    const bar = parseInt(barsStr, 10) || 0;
    const beat = parseInt(beatsStr ?? '0', 10) || 0;
    const sixteenth = Math.floor(parseFloat(sixteenthsStr ?? '0'));
    const step = (beat * 4 + sixteenth) % STEPS_PER_BAR;
    const state = this.store.getState();
    state.tick(bar, step);
    dispatchAtStep(state, this.engine, time, bar, step);
  };
}
