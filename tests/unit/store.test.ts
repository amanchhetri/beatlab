import { beforeEach, describe, expect, it } from 'vitest';
import { createFreshStore } from '../../src/store/useStore';
import { SYNTH_CHANNEL_ID } from '../../src/store/defaults';
import { MIN_BPM, MAX_BPM, STEPS_PER_BAR } from '../../src/store/types';

const KICK = 'ch-kick';
const SNARE = 'ch-snare';

describe('store — initial state', () => {
  it('boots with 8 default channels and one empty pattern', () => {
    const store = createFreshStore();
    const s = store.getState();
    expect(s.channels).toHaveLength(8);
    expect(s.channels.find(c => c.id === KICK)?.type).toBe('drum');
    expect(s.channels.find(c => c.id === SYNTH_CHANNEL_ID)?.type).toBe('synth');
    expect(s.patternOrder).toHaveLength(1);
    expect(s.patterns[s.patternOrder[0]].name).toBe('Pattern 1');
    expect(s.activePatternId).toBe(s.patternOrder[0]);
    expect(s.playlist).toEqual([]);
    expect(s.bpm).toBe(120);
    expect(s.isPlaying).toBe(false);
    expect(s.playbackMode).toBe('pattern');
    expect(s.recordArm).toBe(false);
  });
});

describe('toggleStep', () => {
  it('flips a drum step true then false', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    store.getState().toggleStep(pid, KICK, 0);
    expect(store.getState().patterns[pid].drumGrid[KICK][0]).toBe(true);
    store.getState().toggleStep(pid, KICK, 0);
    expect(store.getState().patterns[pid].drumGrid[KICK][0]).toBe(false);
  });

  it('only affects the targeted step', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    store.getState().toggleStep(pid, KICK, 4);
    const row = store.getState().patterns[pid].drumGrid[KICK];
    expect(row[4]).toBe(true);
    expect(row.filter((v, i) => v && i !== 4)).toEqual([]);
  });
});

describe('synth notes', () => {
  it('addNote appends a note with a unique id', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    const id1 = store.getState().addNote(pid, SYNTH_CHANNEL_ID, { step: 0, pitch: 60, length: 1, velocity: 1 });
    const id2 = store.getState().addNote(pid, SYNTH_CHANNEL_ID, { step: 4, pitch: 64, length: 2, velocity: 0.8 });
    expect(id1).not.toBe(id2);
    const notes = store.getState().patterns[pid].notes[SYNTH_CHANNEL_ID];
    expect(notes).toHaveLength(2);
    expect(notes.find(n => n.id === id1)?.pitch).toBe(60);
  });

  it('removeNote removes by id', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    const id = store.getState().addNote(pid, SYNTH_CHANNEL_ID, { step: 0, pitch: 60, length: 1, velocity: 1 });
    store.getState().removeNote(pid, SYNTH_CHANNEL_ID, id);
    expect(store.getState().patterns[pid].notes[SYNTH_CHANNEL_ID]).toHaveLength(0);
  });

  it('updateNote applies a partial', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    const id = store.getState().addNote(pid, SYNTH_CHANNEL_ID, { step: 0, pitch: 60, length: 1, velocity: 1 });
    store.getState().updateNote(pid, SYNTH_CHANNEL_ID, id, { length: 4 });
    const note = store.getState().patterns[pid].notes[SYNTH_CHANNEL_ID].find(n => n.id === id);
    expect(note?.length).toBe(4);
    expect(note?.pitch).toBe(60);
  });
});

describe('pattern CRUD', () => {
  it('createPattern adds an empty pattern and returns its id', () => {
    const store = createFreshStore();
    const id = store.getState().createPattern('My Pattern');
    expect(store.getState().patternOrder).toContain(id);
    expect(store.getState().patterns[id].name).toBe('My Pattern');
    expect(store.getState().patterns[id].drumGrid[KICK]).toHaveLength(STEPS_PER_BAR);
    expect(store.getState().patterns[id].drumGrid[KICK].every(v => v === false)).toBe(true);
  });

  it('renamePattern updates the name', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    store.getState().renamePattern(pid, 'Verse');
    expect(store.getState().patterns[pid].name).toBe('Verse');
  });

  it('duplicatePattern deep-copies grid and notes', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    store.getState().toggleStep(pid, KICK, 0);
    store.getState().addNote(pid, SYNTH_CHANNEL_ID, { step: 0, pitch: 60, length: 1, velocity: 1 });
    const newId = store.getState().duplicatePattern(pid);
    expect(newId).not.toBe(pid);
    // Mutating original must not affect copy
    store.getState().toggleStep(pid, KICK, 0);
    expect(store.getState().patterns[newId].drumGrid[KICK][0]).toBe(true);
    expect(store.getState().patterns[pid].drumGrid[KICK][0]).toBe(false);
    expect(store.getState().patterns[newId].notes[SYNTH_CHANNEL_ID]).toHaveLength(1);
  });

  it('deletePattern removes from order and cascades into playlist', () => {
    const store = createFreshStore();
    const a = store.getState().activePatternId;
    const b = store.getState().createPattern('B');
    store.getState().addPlaylistBlock(a, 0, 0);
    const blockB = store.getState().addPlaylistBlock(b, 1, 4);
    store.getState().deletePattern(a);
    expect(store.getState().patternOrder).not.toContain(a);
    expect(store.getState().patterns[a]).toBeUndefined();
    expect(store.getState().playlist.map(p => p.id)).toEqual([blockB]);
  });

  it('deletePattern shifts activePatternId to a sibling if the deleted one was active', () => {
    const store = createFreshStore();
    const a = store.getState().activePatternId;
    const b = store.getState().createPattern('B');
    store.getState().setActivePattern(a);
    store.getState().deletePattern(a);
    expect(store.getState().activePatternId).toBe(b);
  });

  it('deletePattern on the only remaining pattern replaces it with a fresh empty one', () => {
    const store = createFreshStore();
    const a = store.getState().activePatternId;
    store.getState().toggleStep(a, KICK, 0);
    store.getState().addNote(a, SYNTH_CHANNEL_ID, { step: 0, pitch: 60, length: 1, velocity: 1 });
    store.getState().deletePattern(a);
    const order = store.getState().patternOrder;
    expect(order).toHaveLength(1);
    expect(order[0]).not.toBe(a);
    const newPat = store.getState().patterns[order[0]];
    expect(newPat.drumGrid[KICK].every(v => v === false)).toBe(true);
    expect(newPat.notes[SYNTH_CHANNEL_ID]).toEqual([]);
    expect(store.getState().activePatternId).toBe(order[0]);
  });
});

describe('clearChannel', () => {
  it('clears all drum steps in the targeted row only', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    store.getState().toggleStep(pid, KICK, 0);
    store.getState().toggleStep(pid, KICK, 4);
    store.getState().toggleStep(pid, SNARE, 8);
    store.getState().clearChannel(pid, KICK);
    expect(store.getState().patterns[pid].drumGrid[KICK].every(v => v === false)).toBe(true);
    expect(store.getState().patterns[pid].drumGrid[SNARE][8]).toBe(true);
  });

  it('clears all synth notes in the targeted channel only', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    store.getState().addNote(pid, SYNTH_CHANNEL_ID, { step: 0, pitch: 60, length: 1, velocity: 1 });
    store.getState().addNote(pid, SYNTH_CHANNEL_ID, { step: 4, pitch: 64, length: 1, velocity: 1 });
    store.getState().toggleStep(pid, KICK, 0);
    store.getState().clearChannel(pid, SYNTH_CHANNEL_ID);
    expect(store.getState().patterns[pid].notes[SYNTH_CHANNEL_ID]).toEqual([]);
    expect(store.getState().patterns[pid].drumGrid[KICK][0]).toBe(true);
  });
});

describe('playlist', () => {
  it('addPlaylistBlock snaps startBar to integer', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    const blockId = store.getState().addPlaylistBlock(pid, 0, 3.7);
    const block = store.getState().playlist.find(b => b.id === blockId);
    expect(block?.startBar).toBe(4);
    expect(block?.lengthBars).toBe(1);
  });

  it('movePlaylistBlock snaps and updates lane', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    const id = store.getState().addPlaylistBlock(pid, 0, 0);
    store.getState().movePlaylistBlock(id, 2, 5.3);
    const block = store.getState().playlist.find(b => b.id === id);
    expect(block?.lane).toBe(2);
    expect(block?.startBar).toBe(5);
  });

  it('resizePlaylistBlock clamps to at least 1 bar', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    const id = store.getState().addPlaylistBlock(pid, 0, 0);
    store.getState().resizePlaylistBlock(id, 0);
    expect(store.getState().playlist.find(b => b.id === id)?.lengthBars).toBe(1);
    store.getState().resizePlaylistBlock(id, 5);
    expect(store.getState().playlist.find(b => b.id === id)?.lengthBars).toBe(5);
  });

  it('deletePlaylistBlock removes the block', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    const id = store.getState().addPlaylistBlock(pid, 0, 0);
    store.getState().deletePlaylistBlock(id);
    expect(store.getState().playlist).toEqual([]);
  });
});

describe('captureLiveHit', () => {
  beforeEach(() => {});

  it('on drum: sets the step true at current position (idempotent — never toggles off)', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    store.getState().tick(0, 4);
    store.getState().captureLiveHit(KICK);
    expect(store.getState().patterns[pid].drumGrid[KICK][4]).toBe(true);
    store.getState().captureLiveHit(KICK);
    expect(store.getState().patterns[pid].drumGrid[KICK][4]).toBe(true); // still true
  });

  it('on synth: adds a note at the current position with the given pitch', () => {
    const store = createFreshStore();
    const pid = store.getState().activePatternId;
    store.getState().tick(0, 8);
    store.getState().captureLiveHit(SYNTH_CHANNEL_ID, 72, 0.9);
    const notes = store.getState().patterns[pid].notes[SYNTH_CHANNEL_ID];
    expect(notes).toHaveLength(1);
    expect(notes[0].step).toBe(8);
    expect(notes[0].pitch).toBe(72);
    expect(notes[0].velocity).toBe(0.9);
    expect(notes[0].length).toBe(1);
  });
});

describe('transport', () => {
  it('setBpm clamps to 40..240', () => {
    const store = createFreshStore();
    store.getState().setBpm(1000);
    expect(store.getState().bpm).toBe(MAX_BPM);
    store.getState().setBpm(-5);
    expect(store.getState().bpm).toBe(MIN_BPM);
    store.getState().setBpm(140);
    expect(store.getState().bpm).toBe(140);
  });

  it('toggleRecordArm flips', () => {
    const store = createFreshStore();
    expect(store.getState().recordArm).toBe(false);
    store.getState().toggleRecordArm();
    expect(store.getState().recordArm).toBe(true);
    store.getState().toggleRecordArm();
    expect(store.getState().recordArm).toBe(false);
  });

  it('setActivePattern only switches to an existing pattern', () => {
    const store = createFreshStore();
    const a = store.getState().activePatternId;
    store.getState().setActivePattern('nonexistent');
    expect(store.getState().activePatternId).toBe(a);
    const b = store.getState().createPattern('B');
    store.getState().setActivePattern(b);
    expect(store.getState().activePatternId).toBe(b);
  });

  it('setPlaybackMode switches between pattern and playlist', () => {
    const store = createFreshStore();
    store.getState().setPlaybackMode('playlist');
    expect(store.getState().playbackMode).toBe('playlist');
    store.getState().setPlaybackMode('pattern');
    expect(store.getState().playbackMode).toBe('pattern');
  });

  it('tick updates position', () => {
    const store = createFreshStore();
    store.getState().tick(3, 11);
    expect(store.getState().position).toEqual({ bar: 3, step: 11 });
  });
});

describe('ui slice', () => {
  it('openPianoRoll sets selected synth channel and flag', () => {
    const store = createFreshStore();
    store.getState().openPianoRoll(SYNTH_CHANNEL_ID);
    expect(store.getState().pianoRollOpen).toBe(true);
    expect(store.getState().selectedSynthChannelId).toBe(SYNTH_CHANNEL_ID);
    store.getState().closePianoRoll();
    expect(store.getState().pianoRollOpen).toBe(false);
  });
});
