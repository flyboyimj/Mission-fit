import type { Readiness, SessionLog, SetLog } from '../types';

export interface Suggestion {
  weight: number | null;
  text: string;
  action: 'start' | 'increase' | 'hold' | 'reduce';
}

export function lastSetsFor(exerciseId: string, sessions: SessionLog[]): { sets: SetLog[]; session: SessionLog } | null {
  const sorted = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const s of sorted) {
    const sets = s.sets.filter((x) => x.exerciseId === exerciseId && x.reps !== null);
    if (sets.length) return { sets, session: s };
  }
  return null;
}

export function nextStep(weights: number[], current: number, dir: 1 | -1): number {
  const sorted = [...new Set(weights)].sort((a, b) => a - b);
  if (!sorted.length) return current;
  if (dir === 1) return sorted.find((w) => w > current) ?? current;
  const lower = sorted.filter((w) => w < current);
  return lower.length ? lower[lower.length - 1] : sorted[0];
}

/**
 * Double progression: stay at a weight until every working set reaches the top of the rep range
 * at effort ≤ 8 with good form and no pain, then take the smallest available step up.
 */
export function suggestLoad(
  exerciseId: string,
  sessions: SessionLog[],
  repTarget: [number, number],
  availableWeights: number[],
  readiness?: Readiness,
): Suggestion {
  const last = lastSetsFor(exerciseId, sessions);
  if (!last) {
    return {
      weight: null,
      action: 'start',
      text: `First time: choose a weight you could lift for about 3 more reps than ${repTarget[1]} (effort 6–7). If unsure, start lighter — you'll progress quickly.`,
    };
  }
  const { sets, session } = last;
  const weights = sets.map((s) => s.weight ?? 0);
  const w = Math.max(...weights);
  const anyPain = sets.some((s) => s.pain);
  const maxRpe = Math.max(...sets.map((s) => s.rpe ?? 0));
  const allTop = sets.every((s) => (s.reps ?? 0) >= repTarget[1]);
  const anyBelow = sets.some((s) => (s.reps ?? 0) < repTarget[0]);
  const form = sets.every((s) => s.goodForm);
  const tired = (readiness && (readiness.energy <= 2 || readiness.soreness >= 4)) || (session.sessionRpe ?? 0) >= 9;

  if (anyPain) {
    const down = nextStep(availableWeights, w, -1);
    return { weight: down, action: 'reduce', text: `Pain was flagged last time at ${w} lb. Drop to ${down} lb or substitute — stop if it hurts.` };
  }
  if (maxRpe >= 9 || (anyBelow && maxRpe >= 8)) {
    const down = nextStep(availableWeights, w, -1);
    return { weight: down, action: 'reduce', text: `Last time was near max effort at ${w} lb. Use ${down} lb and build back with clean reps.` };
  }
  if (tired) {
    return { weight: w, action: 'hold', text: `Recovery is low today — repeat ${w} lb, no push for progress.` };
  }
  if (allTop && form && maxRpe <= 8) {
    const up = nextStep(availableWeights, w, 1);
    if (up === w) return { weight: w, action: 'hold', text: `You've hit ${repTarget[1]} reps at ${w} lb (your heaviest available). Add a rep or slow the tempo.` };
    return { weight: up, action: 'increase', text: `All sets hit ${repTarget[1]} reps at ${w} lb. Small step up: ${up} lb, aim for ${repTarget[0]}+ reps.` };
  }
  const repsStr = sets.map((s) => s.reps).join(', ');
  return { weight: w, action: 'hold', text: `Last: ${w} lb × ${repsStr}. Stay at ${w} lb and add a rep where it's clean.` };
}

/** Epley estimate — clearly an estimate. */
export function estimated1RM(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  return Math.round(weight * (1 + reps / 30));
}
