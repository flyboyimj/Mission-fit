import { getExercise } from '../data/exercises';
import type { SessionLog, Step, Workout } from '../types';
import { estimated1RM } from './progression';
import { mondayOf, todayIso } from './plan';

export function weekKey(iso: string): string {
  return mondayOf(new Date(iso));
}

export interface WeekStat {
  week: string;
  cardioMin: number;
  strengthDays: number;
  sessions: number;
}

export function weeklyStats(sessions: SessionLog[], weeks = 8, now = new Date()): WeekStat[] {
  const out: WeekStat[] = [];
  const thisMonday = new Date(mondayOf(now) + 'T12:00:00');
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday);
    d.setDate(d.getDate() - i * 7);
    const key = todayIso(d);
    const inWeek = sessions.filter((s) => weekKey(s.startedAt) === key);
    const strengthDates = new Set(inWeek.filter((s) => s.isStrengthDay).map((s) => todayIso(new Date(s.startedAt))));
    out.push({ week: key, cardioMin: Math.round(inWeek.reduce((t, s) => t + s.cardioMinutes, 0)), strengthDays: strengthDates.size, sessions: inWeek.length });
  }
  return out;
}

/** Cardio minutes counted from completed cardio-type steps only (intervals, steady, cardio stations). */
export function cardioMinutesFromSteps(steps: Step[], completed: number[]): number {
  let sec = 0;
  for (const i of completed) {
    const s = steps[i];
    if (!s) continue;
    if (s.kind === 'interval-work' || s.kind === 'interval-rest' || s.kind === 'cardio') sec += s.durationSec;
    else if (s.kind === 'station' && s.exerciseId && getExercise(s.exerciseId).kind === 'cardio') sec += s.durationSec;
  }
  return sec / 60;
}

export function isStrengthWorkout(w: Workout): boolean {
  return w.blocks.some((b) => b.kind === 'strength' || b.kind === 'circuit');
}

export interface LiftPoint { date: string; topWeight: number; topReps: number; e1rm: number; volume: number }

export function liftTrend(exerciseId: string, sessions: SessionLog[]): LiftPoint[] {
  return [...sessions]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((s) => {
      const sets = s.sets.filter((x) => x.exerciseId === exerciseId && x.weight && x.reps);
      if (!sets.length) return null;
      const top = sets.reduce((a, b) => (estimated1RM(b.weight!, b.reps!) > estimated1RM(a.weight!, a.reps!) ? b : a));
      return {
        date: s.startedAt.slice(0, 10),
        topWeight: top.weight!,
        topReps: top.reps!,
        e1rm: estimated1RM(top.weight!, top.reps!),
        volume: sets.reduce((t, x) => t + (x.weight ?? 0) * (x.reps ?? 0), 0),
      };
    })
    .filter((x): x is LiftPoint => !!x);
}

export function trackedLifts(sessions: SessionLog[]): string[] {
  const counts = new Map<string, number>();
  for (const s of sessions) for (const x of s.sets) if (x.weight && x.reps) counts.set(x.exerciseId, (counts.get(x.exerciseId) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m}:00`;
}

export function fmtMinutes(sec: number): string {
  return `${Math.round(sec / 60)} min`;
}
