import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PERSISTENCE_KEYS,
  attachPersistence,
  loadInitialBpm,
  loadInitialProject,
} from '../../src/store/persistence';
import { createStore } from '../../src/store/useStore';

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('persistence', () => {
  it('loadInitialProject returns a fresh project when nothing is saved', () => {
    const p = loadInitialProject();
    expect(p.schemaVersion).toBe(1);
    expect(p.patternOrder).toHaveLength(1);
  });

  it('loadInitialProject discards corrupt JSON and returns fresh state', () => {
    localStorage.setItem(PERSISTENCE_KEYS.PROJECT_KEY, '{garbage');
    const p = loadInitialProject();
    expect(p.schemaVersion).toBe(1);
  });

  it('loadInitialProject ignores wrong schemaVersion', () => {
    localStorage.setItem(
      PERSISTENCE_KEYS.PROJECT_KEY,
      JSON.stringify({ schemaVersion: 99, channels: [], patterns: {}, patternOrder: [], playlist: [] })
    );
    const p = loadInitialProject();
    expect(p.schemaVersion).toBe(1);
    expect(p.patternOrder).toHaveLength(1);
  });

  it('loadInitialBpm returns 120 when unset, and clamps invalid values', () => {
    expect(loadInitialBpm()).toBe(120);
    localStorage.setItem(PERSISTENCE_KEYS.BPM_KEY, '9999');
    expect(loadInitialBpm()).toBe(120);
    localStorage.setItem(PERSISTENCE_KEYS.BPM_KEY, '140');
    expect(loadInitialBpm()).toBe(140);
  });

  it('attachPersistence writes BPM immediately on change', () => {
    const store = createStore();
    attachPersistence(store);
    store.getState().setBpm(150);
    expect(localStorage.getItem(PERSISTENCE_KEYS.BPM_KEY)).toBe('150');
  });

  it('attachPersistence debounces project writes and writes a valid schema', () => {
    vi.useFakeTimers();
    const store = createStore();
    attachPersistence(store);
    const pid = store.getState().activePatternId;
    store.getState().toggleStep(pid, 'ch-kick', 0);
    expect(localStorage.getItem(PERSISTENCE_KEYS.PROJECT_KEY)).toBeNull();
    vi.advanceTimersByTime(350);
    const raw = localStorage.getItem(PERSISTENCE_KEYS.PROJECT_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.patterns[pid].drumGrid['ch-kick'][0]).toBe(true);
  });
});
