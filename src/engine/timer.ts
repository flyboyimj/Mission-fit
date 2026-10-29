// Timestamp-based workout timer. Remaining time is derived from Date.now(), so it stays
// accurate when the phone sleeps or the tab is throttled.

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface TimerState {
  index: number;
  status: TimerStatus;
  /** For timed steps while running: epoch ms when the step ends. */
  endAt: number | null;
  /** Remaining ms when paused or before start. */
  remainingMs: number;
  /** Elapsed active (non-paused) ms for the whole session. */
  activeMs: number;
  lastTick: number | null;
  completed: number[];
  skipped: number[];
}

export interface TimerStep {
  timed: boolean;
  durationSec: number;
}

export function initTimer(steps: TimerStep[]): TimerState {
  return { index: 0, status: 'idle', endAt: null, remainingMs: (steps[0]?.durationSec ?? 0) * 1000, activeMs: 0, lastTick: null, completed: [], skipped: [] };
}

export function remaining(s: TimerState, now: number): number {
  if (s.status === 'running' && s.endAt !== null) return Math.max(0, s.endAt - now);
  return s.remainingMs;
}

function accrue(s: TimerState, now: number): number {
  return s.status === 'running' && s.lastTick !== null ? s.activeMs + (now - s.lastTick) : s.activeMs;
}

export function start(s: TimerState, steps: TimerStep[], now: number): TimerState {
  if (s.status !== 'idle') return s;
  const step = steps[s.index];
  return { ...s, status: 'running', endAt: step?.timed ? now + s.remainingMs : null, lastTick: now };
}

export function pause(s: TimerState, now: number): TimerState {
  if (s.status !== 'running') return s;
  return { ...s, status: 'paused', remainingMs: remaining(s, now), endAt: null, activeMs: accrue(s, now), lastTick: null };
}

export function resume(s: TimerState, steps: TimerStep[], now: number): TimerState {
  if (s.status !== 'paused') return s;
  const step = steps[s.index];
  return { ...s, status: 'running', endAt: step?.timed ? now + s.remainingMs : null, lastTick: now };
}

function goTo(s: TimerState, steps: TimerStep[], index: number, now: number, mark: 'completed' | 'skipped'): TimerState {
  const list = mark === 'completed' ? { completed: [...s.completed, s.index], skipped: s.skipped } : { completed: s.completed, skipped: [...s.skipped, s.index] };
  const activeMs = accrue(s, now);
  if (index >= steps.length) {
    return { ...s, ...list, index: steps.length - 1, status: 'finished', endAt: null, remainingMs: 0, activeMs, lastTick: null };
  }
  const next = steps[index];
  const ms = next.durationSec * 1000;
  const running = s.status === 'running';
  return {
    ...s, ...list, index, activeMs,
    lastTick: running ? now : null,
    remainingMs: ms,
    endAt: running && next.timed ? now + ms : null,
  };
}

/** Mark current step complete and advance (e.g. "Set done", or a timed step reaching zero). */
export function complete(s: TimerState, steps: TimerStep[], now: number): TimerState {
  if (s.status === 'finished') return s;
  return goTo(s, steps, s.index + 1, now, 'completed');
}

export function skip(s: TimerState, steps: TimerStep[], now: number): TimerState {
  if (s.status === 'finished') return s;
  return goTo(s, steps, s.index + 1, now, 'skipped');
}

export function addTime(s: TimerState, sec: number, now: number): TimerState {
  if (s.status === 'running' && s.endAt !== null) return { ...s, endAt: Math.max(now, s.endAt) + sec * 1000 };
  return { ...s, remainingMs: s.remainingMs + sec * 1000 };
}

/** Advance automatically when a timed step hits zero. Returns the same object if nothing changed. */
export function tick(s: TimerState, steps: TimerStep[], now: number): TimerState {
  if (s.status !== 'running') return s;
  const step = steps[s.index];
  if (step?.timed && s.endAt !== null && now >= s.endAt) {
    // carry over lateness so chained steps don't drift
    const late = now - s.endAt;
    const next = complete(s, steps, s.endAt);
    if (next.status === 'running' && next.endAt !== null && late > 0) return tick(next, steps, now);
    return next;
  }
  return s;
}

export function finish(s: TimerState, now: number): TimerState {
  return { ...s, status: 'finished', activeMs: accrue(s, now), endAt: null, lastTick: null };
}

export function activeSeconds(s: TimerState, now: number): number {
  return Math.round(accrue(s, now) / 1000);
}
