# BeatLab

> A mini web DAW inspired by FL Studio — build beats in the browser, arrange them on a timeline, and export the result as a WAV.

### 🔗 [Try it live → beatlab-eight.vercel.app](https://beatlab-eight.vercel.app/)

[![Live demo](https://img.shields.io/badge/demo-beatlab--eight.vercel.app-4ec5d4?style=flat-square)](https://beatlab-eight.vercel.app/)
[![Built with Vite](https://img.shields.io/badge/vite-8-646cff?style=flat-square)](https://vite.dev)
[![React 19](https://img.shields.io/badge/react-19-61dafb?style=flat-square)](https://react.dev)
[![Tone.js](https://img.shields.io/badge/audio-tone.js-blueviolet?style=flat-square)](https://tonejs.github.io)

<!-- Drop a screenshot at public/screenshot.png to enable the preview below. -->
<!-- ![BeatLab screenshot](public/screenshot.png) -->

Drum step sequencer + piano roll for a polyphonic synth + multi-lane playlist for arranging patterns into a song. Per-channel mixer with mute/solo/volume, five synth presets, live filter cutoff and reverb. No backend, no install — open it in a browser and start playing.

## Features

- **Channel rack** — 7 drum samples (kick, snare, hat-c, hat-o, clap, perc, crash) on a 16-step 4/4 grid
- **Piano roll** — write melodic lines on a polyphonic synth with 5 presets (Saw / Bass / Lead / Pad / Pluck)
- **Per-channel mixer** — volume, mute, solo on every row; solo across multiple rows isolates a group
- **Synth tone controls** — live cutoff + reverb wet sliders, per-channel overrides on top of preset defaults
- **Pattern library** — create, rename, duplicate, delete patterns; each pattern holds drum steps + synth notes
- **Playlist arranger** — 4 lanes × 32 bars; drag patterns onto lanes to build a song, layer them across lanes to play simultaneously, drag blocks to rearrange
- **Live record** — Shift-arm during playback to capture pad hits into the active pattern, auto-quantized to 1/16
- **WAV export** — render your full arrangement to a deterministic 16-bit WAV file using Tone.js Offline
- **Save / Load** — `.beatlab` project files (JSON, schema-versioned for forward compat)
- **Shareable URL** — encode the whole project into a URL you can paste into any browser
- **Autosave** — localStorage keeps your last session safe

## Stack

Vite 8 · React 19 · TypeScript · Zustand · Tone.js · Vitest · Playwright · Deployed on Vercel

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

The audio engine (Tone.js) and data layer (Zustand store) are decoupled from React. A JIT step scheduler reads the store on every 1/16 tick, so any edit — clicking a step, adding a piano roll note, dragging a playlist block, moving a volume slider — takes effect on the next pass with no re-scheduling. WAV export runs the same dispatch logic inside `Tone.Offline` for deterministic rendering. Per-channel `Gain` nodes between the voices and `Destination` form the mixer.

State lives in three slices: a project slice (channels, patterns, playlist, mixer), a transport slice (BPM, play state, record-arm, position), and a UI slice. localStorage autosave debounces project writes to 300 ms. Save/Load files and Shareable URLs serialize the same payload (with a `schemaVersion` field for forward compatibility).

## Scripts

```bash
npm run dev        # Vite dev server on :5173
npm run build      # production build (tsc + vite)
npm run test:run   # Vitest unit tests (72 passing)
npm run test:e2e   # Playwright smoke test
```

## Status

Personal portfolio project. v1 is feature-complete and deployed. v1.5 backlog: multi-bar patterns, drag-resize for playlist blocks and piano roll notes, per-note velocity, sample upload (drag-and-drop your own WAVs), pan control, tap-tempo BPM, undo/redo.
