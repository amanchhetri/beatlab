import { useStore } from '../store/singleton';
import { STEPS_PER_BAR, type Channel } from '../store/types';
import { MIN_CUTOFF, MAX_CUTOFF, SYNTH_PRESETS, SYNTH_PRESET_IDS, type SynthPresetId } from '../audio/presets';
import './ChannelRack.css';

export function ChannelRack() {
  const channels = useStore(s => s.channels);
  const mixer = useStore(s => s.mixer);
  const activePatternId = useStore(s => s.activePatternId);
  const patterns = useStore(s => s.patterns);
  const toggleStep = useStore(s => s.toggleStep);
  const clearChannel = useStore(s => s.clearChannel);
  const openPianoRoll = useStore(s => s.openPianoRoll);
  const position = useStore(s => s.position);
  const isPlaying = useStore(s => s.isPlaying);
  const playbackMode = useStore(s => s.playbackMode);
  const setChannelVolume = useStore(s => s.setChannelVolume);
  const toggleChannelMute = useStore(s => s.toggleChannelMute);
  const toggleChannelSolo = useStore(s => s.toggleChannelSolo);
  const setSynthPreset = useStore(s => s.setSynthPreset);
  const setSynthCutoff = useStore(s => s.setSynthCutoff);
  const setSynthReverbWet = useStore(s => s.setSynthReverbWet);

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

        {channels.map(ch => {
          const settings = mixer[ch.id];
          const volume = settings?.volume ?? 1;
          const muted = !!settings?.muted;
          const soloed = !!settings?.soloed;

          return (
            <div key={ch.id} className={`rack-row rack-row--${ch.type}`}>
              <div
                className="rack-row__label"
                title={ch.type === 'synth' ? 'Double-click to open piano roll' : undefined}
                onDoubleClick={() => {
                  if (ch.type === 'synth') openPianoRoll(ch.id);
                }}
              >
                <span className="rack-row__name">{ch.name}</span>
                <button
                  type="button"
                  className={`rack-row__mix-btn rack-row__mix-btn--mute ${muted ? 'is-active' : ''}`}
                  title={muted ? 'Unmute' : 'Mute'}
                  aria-label={`${muted ? 'Unmute' : 'Mute'} ${ch.name}`}
                  onClick={() => toggleChannelMute(ch.id)}
                >
                  M
                </button>
                <button
                  type="button"
                  className={`rack-row__mix-btn rack-row__mix-btn--solo ${soloed ? 'is-active' : ''}`}
                  title={soloed ? 'Unsolo' : 'Solo'}
                  aria-label={`${soloed ? 'Unsolo' : 'Solo'} ${ch.name}`}
                  onClick={() => toggleChannelSolo(ch.id)}
                >
                  S
                </button>
                <input
                  type="range"
                  className="rack-row__vol"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={e => setChannelVolume(ch.id, Number(e.target.value))}
                  aria-label={`${ch.name} volume`}
                  title={`Volume ${Math.round(volume * 100)}%`}
                />
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

              {ch.type === 'synth' && (
                <SynthSubRow
                  channel={ch}
                  onPresetChange={p => setSynthPreset(ch.id, p)}
                  onCutoffChange={v => setSynthCutoff(ch.id, v)}
                  onReverbChange={v => setSynthReverbWet(ch.id, v)}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SynthSubRow({
  channel,
  onPresetChange,
  onCutoffChange,
  onReverbChange,
}: {
  channel: Extract<Channel, { type: 'synth' }>;
  onPresetChange: (p: SynthPresetId) => void;
  onCutoffChange: (v: number) => void;
  onReverbChange: (v: number) => void;
}) {
  const preset = SYNTH_PRESETS[channel.presetId];
  const cutoff = channel.cutoff ?? preset.filterCutoff;
  const reverbWet = channel.reverbWet ?? preset.reverbWet;

  return (
    <div className="rack-row__synth-controls">
      <label className="rack-row__synth-field">
        <span>Preset</span>
        <select
          value={channel.presetId}
          onChange={e => onPresetChange(e.target.value as SynthPresetId)}
        >
          {SYNTH_PRESET_IDS.map(id => (
            <option key={id} value={id}>
              {SYNTH_PRESETS[id].label}
            </option>
          ))}
        </select>
      </label>
      <label className="rack-row__synth-field">
        <span>Cutoff</span>
        <input
          type="range"
          min={MIN_CUTOFF}
          max={MAX_CUTOFF}
          step={50}
          value={cutoff}
          onChange={e => onCutoffChange(Number(e.target.value))}
          title={`${Math.round(cutoff)} Hz`}
        />
      </label>
      <label className="rack-row__synth-field">
        <span>Reverb</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={reverbWet}
          onChange={e => onReverbChange(Number(e.target.value))}
          title={`${Math.round(reverbWet * 100)}%`}
        />
      </label>
    </div>
  );
}
