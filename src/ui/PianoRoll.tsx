import { useStore } from '../store/singleton';
import { STEPS_PER_BAR } from '../store/types';
import './PianoRoll.css';

const LOW_MIDI = 48; // C3
const HIGH_MIDI = 72; // C5 inclusive → 25 rows
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToLabel(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

function isBlackKey(midi: number): boolean {
  const class_ = midi % 12;
  return class_ === 1 || class_ === 3 || class_ === 6 || class_ === 8 || class_ === 10;
}

export function PianoRoll() {
  const open = useStore(s => s.pianoRollOpen);
  const selectedChannelId = useStore(s => s.selectedSynthChannelId);
  const closePianoRoll = useStore(s => s.closePianoRoll);
  const activePatternId = useStore(s => s.activePatternId);
  const patterns = useStore(s => s.patterns);
  const channels = useStore(s => s.channels);
  const addNote = useStore(s => s.addNote);
  const removeNote = useStore(s => s.removeNote);
  const position = useStore(s => s.position);
  const isPlaying = useStore(s => s.isPlaying);

  if (!open || !selectedChannelId) return null;

  const channel = channels.find(c => c.id === selectedChannelId);
  if (!channel || channel.type !== 'synth') return null;

  const notes = patterns[activePatternId].notes[selectedChannelId] ?? [];
  const pitches: number[] = [];
  for (let p = HIGH_MIDI; p >= LOW_MIDI; p--) pitches.push(p);

  function handleCellClick(step: number, pitch: number) {
    const existing = notes.find(n => n.step === step && n.pitch === pitch);
    if (existing) {
      removeNote(activePatternId, selectedChannelId!, existing.id);
    } else {
      addNote(activePatternId, selectedChannelId!, {
        step,
        pitch,
        length: 1,
        velocity: 1,
      });
    }
  }

  return (
    <div className="piano-roll">
      <header className="piano-roll__header">
        <div className="piano-roll__title">
          Piano Roll — <span className="accent">{channel.name}</span> ·{' '}
          <span className="muted">{patterns[activePatternId].name}</span>
        </div>
        <button type="button" className="piano-roll__close" onClick={closePianoRoll} aria-label="Close">
          ×
        </button>
      </header>
      <div className="piano-roll__body">
        {pitches.map(p => (
          <div key={p} className={`pr-row ${isBlackKey(p) ? 'is-black' : ''}`}>
            <div className="pr-row__label">{midiToLabel(p)}</div>
            <div className="pr-row__cells">
              {Array.from({ length: STEPS_PER_BAR }, (_, s) => {
                const noteAtCell = notes.find(n => n.step === s && n.pitch === p);
                const beatMarker = s % 4 === 0;
                const onPlayhead = isPlaying && position.step === s;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-label={`${midiToLabel(p)} step ${s + 1}`}
                    className={[
                      'pr-cell',
                      noteAtCell ? 'has-note' : '',
                      beatMarker ? 'is-beat' : '',
                      onPlayhead ? 'is-playhead' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => handleCellClick(s, p)}
                    onContextMenu={e => {
                      e.preventDefault();
                      if (noteAtCell) removeNote(activePatternId, selectedChannelId!, noteAtCell.id);
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <footer className="piano-roll__footer">
        <span>Click to add · Click again or right-click to delete</span>
      </footer>
    </div>
  );
}
