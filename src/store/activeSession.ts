// In-progress workout, saved on this device so an accidental close can be resumed.
// Kept under its own key so frequent saves don't rewrite the whole training history.
import type { TimerState } from '../engine/timer';
import { pause } from '../engine/timer';
import type { Limitation, SessionLog, SetLog, Step, Workout } from '../types';

export const ACTIVE_KEY = 'missionfit.active.v1';

export interface DebriefDraft {
  rpe: number | null;
  soreness: number;
  discomfort: Limitation[];
  notes: string;
  favorite: boolean;
}

export interface ActiveSnapshot {
  version: 1;
  savedAt: string;
  workout: Workout;
  steps: Step[];
  /** Always stored paused, so time away from the app never counts as workout time. */
  timer: TimerState;
  startedAt: string;
  logs: Record<string, SetLog>;
  subs: SessionLog['substitutions'];
  phase: 'run' | 'debrief';
  debrief: DebriefDraft;
}

/** Freeze a running timer at `at` (remaining time and active time are kept exactly). */
export function freeze(timer: TimerState, at: number): TimerState {
  return timer.status === 'running' ? pause(timer, at) : timer;
}

export function saveActive(s: Omit<ActiveSnapshot, 'version' | 'savedAt' | 'timer'> & { timer: TimerState }, at = Date.now()): boolean {
  try {
    const snap: ActiveSnapshot = { ...s, version: 1, savedAt: new Date(at).toISOString(), timer: freeze(s.timer, at) };
    window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(snap));
    return true;
  } catch {
    return false;
  }
}

export function loadActive(): ActiveSnapshot | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ActiveSnapshot;
    if (s?.version !== 1 || !s.workout || !Array.isArray(s.steps) || !s.timer) return null;
    if (s.timer.status === 'finished' && s.phase !== 'debrief') return null;
    return s;
  } catch {
    return null;
  }
}

export function clearActive(): void {
  try { window.localStorage.removeItem(ACTIVE_KEY); } catch { /* ignore */ }
}
