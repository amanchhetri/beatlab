import { useEffect, useState } from 'react';
import { useStore } from '../store/singleton';
import { PLAYLIST_LANES, TOTAL_PLAYLIST_BARS } from '../store/types';
import { PATTERN_DRAG_MIME } from './PatternList';
import './Playlist.css';

const PX_PER_BAR = 40;
const LANE_HEIGHT = 44;
const BLOCK_DRAG_MIME = 'text/x-block-id';
const BLOCK_OFFSET_MIME = 'text/x-block-offset';

// Stable hash → HSL so each pattern has a consistent color across blocks.
function patternColor(patternId: string): string {
  let h = 0;
  for (let i = 0; i < patternId.length; i++) {
    h = (h * 31 + patternId.charCodeAt(i)) >>> 0;
  }
  return `hsl(${h % 360}, 55%, 55%)`;
}

export function Playlist() {
  const playlist = useStore(s => s.playlist);
  const patterns = useStore(s => s.patterns);
  const addPlaylistBlock = useStore(s => s.addPlaylistBlock);
  const deletePlaylistBlock = useStore(s => s.deletePlaylistBlock);
  const movePlaylistBlock = useStore(s => s.movePlaylistBlock);
  const resizePlaylistBlock = useStore(s => s.resizePlaylistBlock);
  const position = useStore(s => s.position);
  const isPlaying = useStore(s => s.isPlaying);
  const playbackMode = useStore(s => s.playbackMode);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleDrop(e: React.DragEvent, lane: number) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();

    const movingId = e.dataTransfer.getData(BLOCK_DRAG_MIME);
    if (movingId) {
      const offsetPx = parseFloat(e.dataTransfer.getData(BLOCK_OFFSET_MIME) || '0');
      const leftPx = e.clientX - rect.left - offsetPx;
      const bar = Math.max(0, Math.min(TOTAL_PLAYLIST_BARS - 1, Math.round(leftPx / PX_PER_BAR)));
      movePlaylistBlock(movingId, lane, bar);
      setSelectedId(movingId);
      return;
    }

    const patternId = e.dataTransfer.getData(PATTERN_DRAG_MIME);
    if (!patternId || !patterns[patternId]) return;
    const px = e.clientX - rect.left;
    const bar = Math.max(0, Math.min(TOTAL_PLAYLIST_BARS - 1, Math.round(px / PX_PER_BAR)));
    const id = addPlaylistBlock(patternId, lane, bar);
    setSelectedId(id);
  }

  // Backspace / Delete to remove the selected block
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selectedId) return;
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        deletePlaylistBlock(selectedId);
        setSelectedId(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, deletePlaylistBlock]);

  const playheadPx = isPlaying && playbackMode === 'playlist'
    ? (position.bar + position.step / 16) * PX_PER_BAR
    : null;

  return (
    <section className="playlist">
      <div className="playlist__header">
        <span className="playlist__title">Playlist</span>
        <span className="playlist__hint">
          Drag patterns to add · Drag blocks to move · Click block to select · × / Backspace to delete · +/− to resize
        </span>
      </div>
      <div className="playlist__scroll">
        <div className="playlist__ruler" style={{ width: PX_PER_BAR * TOTAL_PLAYLIST_BARS }}>
          {Array.from({ length: TOTAL_PLAYLIST_BARS }, (_, i) => (
            <div key={i} className={`playlist__tick ${i % 4 === 0 ? 'is-major' : ''}`} style={{ left: i * PX_PER_BAR }}>
              {i % 4 === 0 && <span>{i + 1}</span>}
            </div>
          ))}
        </div>

        <div className="playlist__lanes" style={{ width: PX_PER_BAR * TOTAL_PLAYLIST_BARS }}>
          {Array.from({ length: PLAYLIST_LANES }, (_, lane) => (
            <div
              key={lane}
              className="playlist__lane"
              style={{ height: LANE_HEIGHT }}
              onDragOver={e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = e.dataTransfer.types.includes(BLOCK_DRAG_MIME) ? 'move' : 'copy';
              }}
              onDrop={e => handleDrop(e, lane)}
              onClick={() => setSelectedId(null)}
            >
              {playlist
                .filter(b => b.lane === lane)
                .map(b => {
                  const isSelected = b.id === selectedId;
                  return (
                    <div
                      key={b.id}
                      className={`playlist__block ${isSelected ? 'is-selected' : ''}`}
                      style={{
                        left: b.startBar * PX_PER_BAR,
                        width: b.lengthBars * PX_PER_BAR - 2,
                        background: patternColor(b.patternId),
                      }}
                      draggable
                      onDragStart={e => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        e.dataTransfer.setData(BLOCK_DRAG_MIME, b.id);
                        e.dataTransfer.setData(BLOCK_OFFSET_MIME, String(e.clientX - rect.left));
                        e.dataTransfer.effectAllowed = 'move';
                        setSelectedId(b.id);
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedId(b.id);
                      }}
                      onContextMenu={e => {
                        e.preventDefault();
                        deletePlaylistBlock(b.id);
                        if (selectedId === b.id) setSelectedId(null);
                      }}
                    >
                      <span className="playlist__block-label">{patterns[b.patternId]?.name ?? '?'}</span>
                      {isSelected && (
                        <span className="playlist__block-actions">
                          <button
                            type="button"
                            className="playlist__block-action"
                            title="Shorter"
                            onClick={e => {
                              e.stopPropagation();
                              resizePlaylistBlock(b.id, b.lengthBars - 1);
                            }}
                            onMouseDown={e => e.stopPropagation()}
                          >
                            −
                          </button>
                          <span className="playlist__block-len">{b.lengthBars}</span>
                          <button
                            type="button"
                            className="playlist__block-action"
                            title="Longer"
                            onClick={e => {
                              e.stopPropagation();
                              resizePlaylistBlock(b.id, b.lengthBars + 1);
                            }}
                            onMouseDown={e => e.stopPropagation()}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="playlist__block-action playlist__block-action--delete"
                            title="Delete (Backspace)"
                            onClick={e => {
                              e.stopPropagation();
                              deletePlaylistBlock(b.id);
                              setSelectedId(null);
                            }}
                            onMouseDown={e => e.stopPropagation()}
                          >
                            ×
                          </button>
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
          {playheadPx !== null && (
            <div
              className="playlist__playhead"
              style={{ left: playheadPx, height: LANE_HEIGHT * PLAYLIST_LANES }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
