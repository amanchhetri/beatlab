import { useStore } from '../store/singleton';
import { MIN_BPM, MAX_BPM } from '../store/types';
import { ShareMenu } from './ShareMenu';
import './Transport.css';

export function Transport() {
  const isPlaying = useStore(s => s.isPlaying);
  const bpm = useStore(s => s.bpm);
  const playbackMode = useStore(s => s.playbackMode);
  const recordArm = useStore(s => s.recordArm);
  const position = useStore(s => s.position);

  const play = useStore(s => s.play);
  const stop = useStore(s => s.stop);
  const setBpm = useStore(s => s.setBpm);
  const setPlaybackMode = useStore(s => s.setPlaybackMode);
  const toggleRecordArm = useStore(s => s.toggleRecordArm);

  return (
    <header className="transport-bar">
      <div className="transport-group">
        <button
          type="button"
          className={`transport-btn transport-btn--play ${isPlaying ? 'is-playing' : ''}`}
          aria-label={isPlaying ? 'Stop' : 'Play'}
          onClick={isPlaying ? stop : play}
        >
          {isPlaying ? '■' : '▶'}
        </button>
      </div>

      <div className="transport-group">
        <label className="transport-label">BPM</label>
        <input
          type="number"
          className="transport-bpm"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={e => setBpm(Number(e.target.value))}
        />
      </div>

      <div className="transport-group transport-mode">
        <button
          type="button"
          className={`mode-btn ${playbackMode === 'pattern' ? 'is-active' : ''}`}
          onClick={() => setPlaybackMode('pattern')}
        >
          Pattern
        </button>
        <button
          type="button"
          className={`mode-btn ${playbackMode === 'playlist' ? 'is-active' : ''}`}
          onClick={() => setPlaybackMode('playlist')}
        >
          Playlist
        </button>
      </div>

      <div className="transport-group">
        <button
          type="button"
          className={`transport-btn transport-btn--rec ${recordArm ? 'is-armed' : ''}`}
          aria-label={recordArm ? 'Disarm record' : 'Arm record'}
          onClick={toggleRecordArm}
        >
          <span className="transport-btn__dot" aria-hidden="true" />
        </button>
        <span className="transport-rec-label mono">
          {recordArm ? 'REC ON' : 'SHIFT TO ARM'}
        </span>
      </div>

      <div className="transport-group transport-readout mono">
        <span className="transport-readout__chunk">
          <span className="transport-readout__cap">BAR</span>
          <span className="transport-readout__val">{String(position.bar + 1).padStart(2, '0')}</span>
        </span>
        <span className="transport-readout__sep">·</span>
        <span className="transport-readout__chunk">
          <span className="transport-readout__cap">STEP</span>
          <span className="transport-readout__val">{String(position.step + 1).padStart(2, '0')}</span>
        </span>
      </div>

      <div className="transport-group transport-share">
        <ShareMenu />
      </div>

      <div className="transport-group transport-title-group">
        <span className="transport-title">BeatLab</span>
      </div>
    </header>
  );
}
