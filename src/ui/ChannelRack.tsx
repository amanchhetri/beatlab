import { useStore } from '../store/singleton';
import { STEPS_PER_BAR } from '../store/types';
import './ChannelRack.css';

export function ChannelRack() {
  const channels = useStore(s => s.channels);
  const activePatternId = useStore(s => s.activePatternId);
  const patterns = useStore(s => s.patterns);
  const toggleStep = useStore(s => s.toggleStep);
  const clearChannel = useStore(s => s.clearChannel);
  const openPianoRoll = useStore(s => s.openPianoRoll);
  const position = useStore(s => s.position);
  const isPlaying = useStore(s => s.isPlaying);
  const playbackMode = useStore(s => s.playbackMode);

  const pattern = patterns[activePatternId];
  const showPlayhead = isPlaying && playbackMode === 'pattern';

  return (
    <section className="channel-rack">
      <div className="channel-rack__header">
        <span className="channel-rack__title">Channel Rack</span>
        <span className="channel-rack__pattern">{pattern.name}</span>
      </div>
      <div className="channel-rack__grid">
        <div className="rack-row rack-row--header">
          <div className="rack-row__label rack-row__label--header" aria-hidden="true" />
          <div className="rack-row__steps">
            {Array.from({ length: STEPS_PER_BAR }, (_, i) => (
              <div
                key={i}
                className={`step-label ${i % 4 === 0 ? 'is-beat' : ''} ${showPlayhead && position.step === i ? 'is-playhead' : ''}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {channels.map(ch => (
          <div
            key={ch.id}
            className={`rack-row rack-row--${ch.type}`}
            onDoubleClick={() => {
              if (ch.type === 'synth') openPianoRoll(ch.id);
            }}
          >
            <div className="rack-row__label" title={ch.type === 'synth' ? 'Double-click to open piano roll' : undefined}>
              <span className="rack-row__name">{ch.name}</span>
              <span className="rack-row__label-actions">
                {ch.type === 'synth' && <span className="rack-row__hint">↗</span>}
                <button
                  type="button"
                  className="rack-row__clear"
                  title={ch.type === 'synth' ? 'Remove all synth notes from this pattern' : 'Clear all steps in this row'}
                  aria-label={`Clear ${ch.name}`}
                  onClick={e => {
                    e.stopPropagation();
                    clearChannel(activePatternId, ch.id);
                  }}
                >
                  ⌫
                </button>
              </span>
            </div>
            <div className="rack-row__steps">
              {Array.from({ length: STEPS_PER_BAR }, (_, i) => {
                const lit =
                  ch.type === 'drum'
                    ? !!pattern.drumGrid[ch.id]?.[i]
                    : (pattern.notes[ch.id] ?? []).some(n => n.step === i);
                const beatMarker = i % 4 === 0;
                const onPlayhead = showPlayhead && position.step === i;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Step ${i + 1}`}
                    className={[
                      'step-cell',
                      lit ? 'is-lit' : '',
                      beatMarker ? 'is-beat' : '',
                      onPlayhead ? 'is-playhead' : '',
                      ch.type === 'synth' ? 'is-synth' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      if (ch.type === 'drum') {
                        toggleStep(activePatternId, ch.id, i);
                      } else {
                        openPianoRoll(ch.id);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
