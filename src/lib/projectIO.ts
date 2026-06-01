import type {
  Channel,
  ChannelId,
  MixerSettings,
  Pattern,
  PatternId,
  PlaylistBlock,
} from '../store/types';

export type ProjectPayload = {
  schemaVersion: 1;
  channels: Channel[];
  patterns: Record<PatternId, Pattern>;
  patternOrder: PatternId[];
  playlist: PlaylistBlock[];
  bpm: number;
  // Added after the initial release — optional for backward compat with older `.beatlab` files / URLs.
  mixer?: Record<ChannelId, MixerSettings>;
};

export function serializeProject(p: ProjectPayload): string {
  return JSON.stringify(p);
}

export function parseProject(raw: string): ProjectPayload | null {
  try {
    const obj = JSON.parse(raw);
    if (obj?.schemaVersion !== 1) return null;
    return obj as ProjectPayload;
  } catch {
    return null;
  }
}

// URL-safe base64 (RFC 4648 §5) — strips padding, swaps + / for - _
function b64UrlEncode(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64UrlDecode(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (s.length % 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

export function encodeProjectToUrlParam(p: ProjectPayload): string {
  return b64UrlEncode(serializeProject(p));
}

export function decodeProjectFromUrlParam(encoded: string): ProjectPayload | null {
  try {
    return parseProject(b64UrlDecode(encoded));
  } catch {
    return null;
  }
}

export function downloadProjectFile(p: ProjectPayload, filename = 'project.beatlab'): void {
  const blob = new Blob([serializeProject(p)], { type: 'application/json' });
  triggerDownload(blob, filename);
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readProjectFile(file: File): Promise<ProjectPayload | null> {
  const text = await file.text();
  return parseProject(text);
}
