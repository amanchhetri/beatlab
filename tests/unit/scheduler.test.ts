import { describe, expect, it } from 'vitest';
import { dispatchAtStep, type AudioEngineLike, type SchedulerState } from '../../src/audio/scheduler';
import { DEFAULT_CHANNELS, SYNTH_CHANNEL_ID, emptyPattern } from '../../src/store/defaults';
import { STEPS_PER_BAR } from '../../src/store/types';

class FakeEngine implements AudioEngineLike {
  drumCalls: Array<{ sampleId: string; time: number; velocity?: number }> = [];
  synthCalls: Array<{ pitch: number; time: number; length: number; velocity: number }> = [];
  playDrum(sampleId: string, time: number, velocity?: number) {
    this.drumCalls.push({ sampleId, time, velocity });
  }
  playSynth(pitch: number, time: number, length: number, velocity: number) {
    this.synthCalls.push({ pitch, time, length, velocity });
  }
}

function makeState(overrides: Partial<SchedulerState> = {}): SchedulerState {
  const patternId = 'pat-1';
  const pattern = emptyPattern(patternId, 'Pattern 1', DEFAULT_CHANNELS);
  return {
    channels: DEFAULT_CHANNELS,
    patterns: { [patternId]: pattern },
    playlist: [],
    playbackMode: 'pattern',
    activePatternId: patternId,
    bpm: 120,
    ...overrides,
  };
}

describe('dispatchAtStep — pattern mode', () => {
  it('plays a drum hit when the active pattern has a lit step', () => {
    const state = makeState();
    state.patterns[state.activePatternId].drumGrid['ch-kick'][4] = true;
    const engine = new FakeEngine();

    dispatchAtStep(state, engine, 1.0, 0, 4);

    expect(engine.drumCalls).toEqual([{ sampleId: 'kick', time: 1.0, velocity: undefined }]);
  });

  it('plays nothing when the step is not lit', () => {
    const state = makeState();
    const engine = new FakeEngine();
    dispatchAtStep(state, engine, 1.0, 0, 4);
    expect(engine.drumCalls).toEqual([]);
    expect(engine.synthCalls).toEqual([]);
  });

  it('plays multiple drums when several rows are lit at the same step', () => {
    const state = makeState();
    state.patterns[state.activePatternId].drumGrid['ch-kick'][0] = true;
    state.patterns[state.activePatternId].drumGrid['ch-snare'][0] = true;
    const engine = new FakeEngine();
    dispatchAtStep(state, engine, 0, 0, 0);
    expect(engine.drumCalls.map(c => c.sampleId).sort()).toEqual(['kick', 'snare']);
  });

  it('plays a synth note when one starts at the current step', () => {
    const state = makeState();
    state.patterns[state.activePatternId].notes[SYNTH_CHANNEL_ID] = [
      { id: 'n1', step: 4, pitch: 60, length: 2, velocity: 0.9 },
    ];
    const engine = new FakeEngine();
    dispatchAtStep(state, engine, 2.0, 0, 4);
    expect(engine.synthCalls).toHaveLength(1);
    expect(engine.synthCalls[0].pitch).toBe(60);
    expect(engine.synthCalls[0].velocity).toBe(0.9);
    expect(engine.synthCalls[0].length).toBeCloseTo(0.25); // 2 steps @ 120 BPM = 0.25s
  });

  it('does not retrigger a synth note on a step it does not start at', () => {
    const state = makeState();
    state.patterns[state.activePatternId].notes[SYNTH_CHANNEL_ID] = [
      { id: 'n1', step: 4, pitch: 60, length: 4, velocity: 1 },
    ];
    const engine = new FakeEngine();
    dispatchAtStep(state, engine, 0, 0, 5); // playhead is at step 5; note started at 4
    expect(engine.synthCalls).toEqual([]);
  });

  it('ignores the playlist entirely when in pattern mode', () => {
    const state = makeState();
    state.patterns[state.activePatternId].drumGrid['ch-kick'][0] = true;
    state.playlist = [
      { id: 'b1', patternId: 'nonexistent', lane: 0, startBar: 0, lengthBars: 32 },
    ];
    const engine = new FakeEngine();
    dispatchAtStep(state, engine, 0, 0, 0);
    expect(engine.drumCalls).toEqual([{ sampleId: 'kick', time: 0, velocity: undefined }]);
  });

  it('does not crash if the active pattern is missing', () => {
    const state = makeState({ activePatternId: 'ghost', patterns: {} });
    const engine = new FakeEngine();
    expect(() => dispatchAtStep(state, engine, 0, 0, 0)).not.toThrow();
    expect(engine.drumCalls).toEqual([]);
  });
});

describe('dispatchAtStep — playlist mode', () => {
  it('fires hits from blocks that contain the current bar', () => {
    const a = emptyPattern('pA', 'A', DEFAULT_CHANNELS);
    a.drumGrid['ch-kick'][0] = true;
    const b = emptyPattern('pB', 'B', DEFAULT_CHANNELS);
    b.drumGrid['ch-snare'][0] = true;

    const state: SchedulerState = {
      channels: DEFAULT_CHANNELS,
      patterns: { pA: a, pB: b },
      playlist: [
        { id: 'b1', patternId: 'pA', lane: 0, startBar: 0, lengthBars: 2 },
        { id: 'b2', patternId: 'pB', lane: 1, startBar: 0, lengthBars: 4 },
      ],
      playbackMode: 'playlist',
      activePatternId: 'pA',
      bpm: 120,
    };
    const engine = new FakeEngine();
    dispatchAtStep(state, engine, 0, 1, 0); // bar 1 — both blocks active
    expect(engine.drumCalls.map(c => c.sampleId).sort()).toEqual(['kick', 'snare']);
  });

  it('plays nothing past the end of a block', () => {
    const a = emptyPattern('pA', 'A', DEFAULT_CHANNELS);
    a.drumGrid['ch-kick'][0] = true;
    const state: SchedulerState = {
      channels: DEFAULT_CHANNELS,
      patterns: { pA: a },
      playlist: [{ id: 'b1', patternId: 'pA', lane: 0, startBar: 0, lengthBars: 2 }],
      playbackMode: 'playlist',
      activePatternId: 'pA',
      bpm: 120,
    };
    const engine = new FakeEngine();
    dispatchAtStep(state, engine, 0, 2, 0); // outside block
    expect(engine.drumCalls).toEqual([]);
  });

  it('plays nothing for a block pointing to a deleted pattern', () => {
    const state: SchedulerState = {
      channels: DEFAULT_CHANNELS,
      patterns: {},
      playlist: [{ id: 'b1', patternId: 'ghost', lane: 0, startBar: 0, lengthBars: 1 }],
      playbackMode: 'playlist',
      activePatternId: 'irrelevant',
      bpm: 120,
    };
    const engine = new FakeEngine();
    expect(() => dispatchAtStep(state, engine, 0, 0, 0)).not.toThrow();
    expect(engine.drumCalls).toEqual([]);
  });
});

describe('dispatchAtStep — synth note timing scales with BPM', () => {
  it('halves note length seconds at 240 BPM vs 120', () => {
    const state = makeState({ bpm: 240 });
    state.patterns[state.activePatternId].notes[SYNTH_CHANNEL_ID] = [
      { id: 'n1', step: 0, pitch: 60, length: 4, velocity: 1 }, // 4 steps = 1 beat
    ];
    const engine = new FakeEngine();
    dispatchAtStep(state, engine, 0, 0, 0);
    expect(engine.synthCalls[0].length).toBeCloseTo(60 / 240); // 0.25s
  });
});

describe('dispatchAtStep — full bar walk', () => {
  it('a 4-on-the-floor kick pattern fires exactly 4 times across a bar', () => {
    const state = makeState();
    for (const s of [0, 4, 8, 12]) {
      state.patterns[state.activePatternId].drumGrid['ch-kick'][s] = true;
    }
    const engine = new FakeEngine();
    for (let s = 0; s < STEPS_PER_BAR; s++) {
      dispatchAtStep(state, engine, s * 0.125, 0, s);
    }
    expect(engine.drumCalls).toHaveLength(4);
    expect(engine.drumCalls.map(c => c.time)).toEqual([0, 0.5, 1.0, 1.5]);
  });
});
