import type { ChannelId, MixerSettings } from '../store/types';

export type MixerMap = Record<ChannelId, MixerSettings>;

/**
 * A channel is effectively muted if:
 *   - it's explicitly muted, OR
 *   - any other channel is soloed and this channel is not.
 */
export function isEffectivelyMuted(mixer: MixerMap, channelId: ChannelId): boolean {
  const settings = mixer[channelId];
  if (!settings) return false;
  if (settings.muted) return true;
  const anySoloed = Object.values(mixer).some(m => m.soloed);
  if (anySoloed && !settings.soloed) return true;
  return false;
}

/** Effective audible gain for a channel: volume × (effectivelyMuted ? 0 : 1). */
export function effectiveGain(mixer: MixerMap, channelId: ChannelId): number {
  if (isEffectivelyMuted(mixer, channelId)) return 0;
  return mixer[channelId]?.volume ?? 1;
}
