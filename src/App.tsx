import { useEffect, useState } from 'react';
import { useStore } from './store/singleton';
import { scheduler } from './audio';
import { attachKeyboard } from './input/keyboard';
import { StartGate } from './ui/StartGate';
import { Transport } from './ui/Transport';
import { PatternList } from './ui/PatternList';
import { ChannelRack } from './ui/ChannelRack';
import { PianoRoll } from './ui/PianoRoll';
import { Playlist } from './ui/Playlist';
import './App.css';

export default function App() {
  const [audioReady, setAudioReady] = useState(false);
  const isPlaying = useStore(s => s.isPlaying);
  const playbackMode = useStore(s => s.playbackMode);

  useEffect(() => {
    if (!audioReady) return;
    if (isPlaying) scheduler.start();
    else scheduler.stop();
  }, [audioReady, isPlaying, playbackMode]);

  useEffect(() => {
    if (!audioReady) return;
    return attachKeyboard(useStore);
  }, [audioReady]);

  if (!audioReady) {
    return <StartGate onReady={() => setAudioReady(true)} />;
  }

  return (
    <div className="app-shell">
      <Transport />
      <PatternList />
      <ChannelRack />
      <Playlist />
      <PianoRoll />
    </div>
  );
}
