import { describe, expect, it } from 'vitest';
import { findPlaylistPatterns } from '../../src/lib/playlist';
import { stepsToSeconds, snapToNearestStep, pixelToBar } from '../../src/lib/positionMath';
import { effectiveGain, isEffectivelyMuted, type MixerMap } from '../../src/lib/mixer';
import type { PlaylistBlock } from '../../src/store/types';

const block = (overrides: Partial<PlaylistBlock>): PlaylistBlock => ({
  id: 'b1',
  patternId: 'p1',
  lane: 0,
  startBar: 0,
  lengthBars: 1,
  ...overrides,
});

describe('findPlaylistPatterns', () => {
  it('returns nothing for an empty playlist', () => {
    expect(findPlaylistPatterns([], 0, 0)).toEqual([]);
  });

  it('returns a block at its exact starting bar', () => {
    const blocks = [block({ id: 'a', patternId: 'pA', startBar: 2, lengthBars: 1 })];
    const result = findPlaylistPatterns(blocks, 2, 0);
    expect(result).toEqual([{ blockId: 'a', patternId: 'pA', localStep: 0 }]);
  });

  it('returns nothing one bar past a 1-bar block (exclusive end)', () => {
    const blocks = [block({ id: 'a', patternId: 'pA', startBar: 2, lengthBars: 1 })];
    expect(findPlaylistPatterns(blocks, 3, 0)).toEqual([]);
  });

  it('returns the block for a multi-bar span', () => {
    const blocks = [block({ id: 'a', patternId: 'pA', startBar: 0, lengthBars: 4 })];
    expect(findPlaylistPatterns(blocks, 0, 0)).toHaveLength(1);
    expect(findPlaylistPatterns(blocks, 3, 15)).toHaveLength(1);
    expect(findPlaylistPatterns(blocks, 4, 0)).toEqual([]);
  });

  it('returns all overlapping blocks across lanes at the same bar', () => {
    const blocks = [
      block({ id: 'a', patternId: 'pA', lane: 0, startBar: 0, lengthBars: 2 }),
      block({ id: 'b', patternId: 'pB', lane: 1, startBar: 0, lengthBars: 2 }),
      block({ id: 'c', patternId: 'pC', lane: 2, startBar: 1, lengthBars: 1 }),
    ];
    const result = findPlaylistPatterns(blocks, 1, 5);
    expect(result.map(r => r.patternId).sort()).toEqual(['pA', 'pB', 'pC']);
    expect(result.every(r => r.localStep === 5)).toBe(true);
  });
});

describe('stepsToSeconds', () => {
  it('converts 16 steps at 120 BPM to 2 seconds (one bar)', () => {
    expect(stepsToSeconds(16, 120)).toBeCloseTo(2);
  });

  it('converts 4 steps at 120 BPM to one beat (0.5s)', () => {
    expect(stepsToSeconds(4, 120)).toBeCloseTo(0.5);
  });

  it('scales inversely with BPM', () => {
    expect(stepsToSeconds(16, 60)).toBeCloseTo(4);
    expect(stepsToSeconds(16, 240)).toBeCloseTo(1);
  });
});

describe('snapToNearestStep', () => {
  it('rounds to the nearest integer step', () => {
    expect(snapToNearestStep(0)).toBe(0);
    expect(snapToNearestStep(3.4)).toBe(3);
    expect(snapToNearestStep(3.6)).toBe(4);
  });

  it('wraps step 16 to step 0 of next bar (returns 0)', () => {
    expect(snapToNearestStep(15.7)).toBe(0);
  });
});

describe('pixelToBar', () => {
  it('returns 0 at pixel 0', () => {
    expect(pixelToBar(0, 32)).toBe(0);
  });

  it('rounds to the nearest bar based on pixels-per-bar', () => {
    expect(pixelToBar(40, 32)).toBe(1);
    expect(pixelToBar(95, 32)).toBe(3);
  });

  it('clamps negatives to 0', () => {
    expect(pixelToBar(-10, 32)).toBe(0);
  });
});

describe('mixer — isEffectivelyMuted / effectiveGain', () => {
  const make = (overrides: MixerMap = {}): MixerMap => ({
    a: { volume: 0.8, muted: false, soloed: false },
    b: { volume: 0.5, muted: false, soloed: false },
    c: { volume: 1.0, muted: false, soloed: false },
    ...overrides,
  });

  it('returns false when nothing is muted or soloed', () => {
    const m = make();
    expect(isEffectivelyMuted(m, 'a')).toBe(false);
    expect(isEffectivelyMuted(m, 'b')).toBe(false);
  });

  it('explicit mute returns true', () => {
    const m = make({ a: { volume: 0.8, muted: true, soloed: false } });
    expect(isEffectivelyMuted(m, 'a')).toBe(true);
    expect(isEffectivelyMuted(m, 'b')).toBe(false);
  });

  it('any solo silences all non-solo channels', () => {
    const m = make({ b: { volume: 0.5, muted: false, soloed: true } });
    expect(isEffectivelyMuted(m, 'a')).toBe(true);
    expect(isEffectivelyMuted(m, 'b')).toBe(false);
    expect(isEffectivelyMuted(m, 'c')).toBe(true);
  });

  it('multiple solos play together', () => {
    const m = make({
      a: { volume: 0.8, muted: false, soloed: true },
      b: { volume: 0.5, muted: false, soloed: true },
    });
    expect(isEffectivelyMuted(m, 'a')).toBe(false);
    expect(isEffectivelyMuted(m, 'b')).toBe(false);
    expect(isEffectivelyMuted(m, 'c')).toBe(true);
  });

  it('explicit mute on a solo channel still silences it', () => {
    const m = make({ a: { volume: 0.8, muted: true, soloed: true } });
    expect(isEffectivelyMuted(m, 'a')).toBe(true);
  });

  it('effectiveGain returns 0 when muted, volume otherwise', () => {
    const m = make();
    expect(effectiveGain(m, 'a')).toBeCloseTo(0.8);
    const muted = make({ a: { volume: 0.8, muted: true, soloed: false } });
    expect(effectiveGain(muted, 'a')).toBe(0);
  });

  it('unknown channel id is treated as not muted, default gain 1', () => {
    const m = make();
    expect(isEffectivelyMuted(m, 'unknown')).toBe(false);
    expect(effectiveGain(m, 'unknown')).toBe(1);
  });
});
