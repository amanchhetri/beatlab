# BeatLab

A mini web DAW inspired by FL Studio — build beats in the browser, arrange them on a timeline, and export the result as a WAV.

Drum step sequencer + piano roll for a polyphonic synth + multi-lane playlist for arranging patterns into a song. No backend, no install — open it in a browser and start playing.

## Features

- **Channel rack** — 7 drum samples (kick, snare, hat-c, hat-o, clap, perc, crash) on a 16-step 4/4 grid
- **Piano roll** — write melodic lines on a polyphonic sawtooth synth (filter + reverb)
- **Pattern library** — create, rename, duplicate, delete patterns; each pattern holds drum steps + synth notes
- **Playlist arranger** — 4 lanes × 32 bars; drag patterns onto lanes to build a song, layer them across lanes to play simultaneously
- **Live record** — Shift-arm during playback to capture pad hits into the active pattern, auto-quantized to 1/16
- **WAV export** — render your full arrangement to a deterministic 16-bit WAV file using Tone.js Offline
- **Save / Load** — `.beatlab` project files (JSON)
- **Shareable URL** — encode the whole project into a URL you can paste into any browser
- **Autosave** — localStorage keeps your last session safe

## Stack

Vite 8 · React 19 · TypeScript · Zustand · Tone.js · Vitest · Playwright

## Run it locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and click **Tap to start** (browsers require a user gesture before the AudioContext can play).

## Keyboard shortcuts

| Key | Action |
|---|---|
| Spacebar | Play / Stop |
| Shift | Toggle record-arm (captures pad hits into the active pattern while playing) |
| Z X C V B N M | Drum hits — kick, snare, hat-closed, hat-open, clap, perc, crash |
| A S D F G H J K L | Synth white keys, C4 → D5 |
| W E T Y U O P | Synth black keys |
| Backspace / Delete | Delete selected playlist block |

## Architecture

The audio engine (Tone.js) and data layer (Zustand store) are decoupled from React. A JIT step scheduler reads the store on every 1/16 tick, so any edit — clicking a step, adding a piano roll note, dragging a playlist block — takes effect on the next pass with no re-scheduling. WAV export runs the same dispatch logic inside `Tone.Offline` for deterministic rendering.

State lives in three slices: a project slice (channels, patterns, playlist), a transport slice (BPM, play state, record-arm, position), and a UI slice. localStorage autosave debounces project writes to 300 ms.

## Scripts

```bash
npm run dev        # Vite dev server on :5173
npm run build      # production build (tsc + vite)
npm run test:run   # Vitest unit tests
npm run test:e2e   # Playwright smoke test
```

## Status

Personal portfolio project. v1 is feature-complete; the v1.5 backlog includes a mixer, per-channel effects, multi-bar patterns, drag-resize for playlist blocks and piano roll notes, and tap-tempo BPM.
