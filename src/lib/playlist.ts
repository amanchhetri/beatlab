import type { BlockId, PatternId, PlaylistBlock } from '../store/types';

export type ActivePatternHit = {
  blockId: BlockId;
  patternId: PatternId;
  localStep: number;
};

export function findPlaylistPatterns(
  playlist: PlaylistBlock[],
  bar: number,
  step: number
): ActivePatternHit[] {
  const hits: ActivePatternHit[] = [];
  for (const b of playlist) {
    if (bar >= b.startBar && bar < b.startBar + b.lengthBars) {
      hits.push({ blockId: b.id, patternId: b.patternId, localStep: step });
    }
  }
  return hits;
}
