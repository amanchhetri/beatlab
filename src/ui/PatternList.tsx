import { useState } from 'react';
import { useStore } from '../store/singleton';
import './PatternList.css';

export const PATTERN_DRAG_MIME = 'text/x-pattern-id';

export function PatternList() {
  const patternOrder = useStore(s => s.patternOrder);
  const patterns = useStore(s => s.patterns);
  const activePatternId = useStore(s => s.activePatternId);
  const setActivePattern = useStore(s => s.setActivePattern);
  const createPattern = useStore(s => s.createPattern);
  const renamePattern = useStore(s => s.renamePattern);
  const duplicatePattern = useStore(s => s.duplicatePattern);
  const deletePattern = useStore(s => s.deletePattern);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  function commitRename(id: string) {
    if (draftName.trim()) renamePattern(id, draftName.trim());
    setEditingId(null);
  }

  return (
    <aside className="pattern-list">
      <div className="pattern-list__header">Patterns</div>
      <ul className="pattern-list__items">
        {patternOrder.map(id => {
          const p = patterns[id];
          const isActive = id === activePatternId;
          return (
            <li
              key={id}
              className={`pattern-item ${isActive ? 'is-active' : ''}`}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData(PATTERN_DRAG_MIME, id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => setActivePattern(id)}
              onDoubleClick={() => {
                setEditingId(id);
                setDraftName(p.name);
              }}
            >
              <span className={`pattern-item__dot ${isActive ? 'is-active' : ''}`} />
              {editingId === id ? (
                <input
                  type="text"
                  className="pattern-item__edit"
                  autoFocus
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onBlur={() => commitRename(id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename(id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="pattern-item__name">{p.name}</span>
              )}
              <span className="pattern-item__actions">
                <button
                  type="button"
                  className="pattern-item__action"
                  title="Duplicate"
                  onClick={e => {
                    e.stopPropagation();
                    duplicatePattern(id);
                  }}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  className="pattern-item__action"
                  title="Delete"
                  disabled={patternOrder.length <= 1}
                  onClick={e => {
                    e.stopPropagation();
                    deletePattern(id);
                  }}
                >
                  ×
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="pattern-list__new"
        onClick={() => {
          const id = createPattern();
          setActivePattern(id);
        }}
      >
        + New Pattern
      </button>
    </aside>
  );
}
