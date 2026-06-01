import { audio } from './engine';
import { StepScheduler } from './stepScheduler';
import { useStore } from '../store/singleton';

export const scheduler = new StepScheduler(audio, useStore);
export { audio } from './engine';
