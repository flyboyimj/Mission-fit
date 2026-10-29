import { EXERCISES } from '../data/exercises';
import type { Duration, Focus, Goal, Inventory, Pattern, Plan, PlanDay, PlanSessionType, Profile, Style } from '../types';
import { checkExercise, contextFrom } from './filter';

export const SESSION_LABEL: Record<PlanSessionType, string> = {
  'strength-push': 'Push — Chest · Shoulders · Triceps',
  'strength-pull': 'Pull — Back · Biceps',
  'strength-upper': 'Strength — Upper',
  'strength-lower': 'Strength — Lower',
  'strength-full': 'Strength — Full Body',
  intervals: 'Aerobic Intervals',
  circuit: 'Station Circuit',
  boxing: 'Boxing Rounds',
  steady: 'Moderate Cardio',
  recovery: 'Recovery',
  rest: 'Rest Day',
};

export const HARD_TYPES: PlanSessionType[] = ['intervals', 'circuit', 'boxing'];

export function sessionToParams(t: PlanSessionType): { style: Style; focus: Focus } | null {
  switch (t) {
    case 'strength-push': return { style: 'strength', focus: 'push' };
    case 'strength-pull': return { style: 'strength', focus: 'pull' };
    case 'strength-upper': return { style: 'strength', focus: 'upper' };
    case 'strength-lower': return { style: 'strength', focus: 'lower' };
    case 'strength-full': return { style: 'strength-cond', focus: 'full' };
    case 'intervals': return { style: 'hiit', focus: 'full' };
    case 'circuit': return { style: 'circuit', focus: 'full' };
    case 'boxing': return { style: 'boxing', focus: 'full' };
    case 'steady': return { style: 'steady', focus: 'full' };
    case 'recovery': return { style: 'recovery', focus: 'core' };
    default: return null;
  }
}

function weeklyTemplate(n: number, goal: Goal): PlanSessionType[] {
  const t: Record<number, PlanSessionType[]> = {
    1: ['strength-full'],
    2: ['strength-full', 'strength-full'],
    3: ['strength-upper', 'intervals', 'strength-lower'],
    4: ['strength-push', 'strength-pull', 'strength-lower', 'boxing'],
    5: ['strength-push', 'strength-pull', 'strength-lower', 'boxing', 'steady'],
    6: ['strength-push', 'strength-pull', 'strength-lower', 'boxing', 'intervals', 'steady'],
    7: ['strength-push', 'strength-pull', 'strength-lower', 'boxing', 'intervals', 'steady', 'recovery'],
  };
  const out = [...(t[Math.max(1, Math.min(7, n))] ?? [])];
  if (goal === 'cardio' && n >= 3) { const i = out.indexOf('strength-lower'); if (n >= 4 && i >= 0) out[i] = 'strength-full'; const j = out.indexOf('strength-upper'); if (n >= 5 && j >= 0) out[j] = 'steady'; }
  if ((goal === 'muscle' || goal === 'strength') && out.includes('circuit')) out[out.indexOf('circuit')] = 'strength-full';
  if (goal === 'fatloss' && n === 3) out[1] = 'circuit';
  return out;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return todayIso(d);
}

export function mondayOf(date: Date): string {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  return todayIso(d);
}

/** Cost of an ordering: consecutive hard days and same-region strength back-to-back. */
function cost(order: PlanSessionType[], days: number[]): number {
  let c = 0;
  const sorted = days.map((d, i) => ({ d, t: order[i] })).sort((a, b) => ((a.d + 6) % 7) - ((b.d + 6) % 7));
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const b = sorted[(i + 1) % sorted.length];
    const gap = (((b.d + 6) % 7) - ((a.d + 6) % 7) + 7) % 7 || 7;
    if (gap === 1) {
      if (HARD_TYPES.includes(a.t) && HARD_TYPES.includes(b.t)) c += 10;
      if (a.t === b.t && a.t.startsWith('strength')) c += 4;
      if ((a.t === 'strength-lower' && b.t === 'intervals') || (a.t === 'intervals' && b.t === 'strength-lower')) c += 1;
    }
  }
  return c;
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  arr.forEach((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).forEach((p) => out.push([x, ...p])));
  return out;
}

export function arrangeWeek(types: PlanSessionType[], days: number[]): PlanSessionType[] {
  let best = types;
  let bestCost = Infinity;
  for (const p of permutations(types)) {
    const c = cost(p, days);
    if (c < bestCost) { bestCost = c; best = p; if (c === 0) break; }
  }
  return best;
}

export const ANCHOR_PATTERNS: Pattern[] = ['squat', 'hinge', 'h-push', 'v-pull', 'h-pull', 'v-push'];

export function chooseAnchors(profile: Profile, inv: Inventory): Partial<Record<Pattern, string>> {
  const ctx = contextFrom(profile, inv);
  const anchors: Partial<Record<Pattern, string>> = {};
  for (const p of ANCHOR_PATTERNS) {
    const ex = EXERCISES.find((e) => e.main && e.pattern === p && checkExercise(e, ctx).ok && !checkExercise(e, ctx).cautions.length)
      ?? EXERCISES.find((e) => e.main && e.pattern === p && checkExercise(e, ctx).ok);
    if (ex) anchors[p] = ex.id;
  }
  return anchors;
}

export function buildPlan(opts: { profile: Profile; trainingDays: number[]; duration: Duration; goal: Goal; start: Date }): Plan {
  const days = [...new Set(opts.trainingDays)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const startDate = mondayOf(opts.start);
  const types = arrangeWeek(weeklyTemplate(days.length, opts.goal), days);
  const inv = opts.profile.defaultLocation === 'gym' ? opts.profile.gym : opts.profile.home;
  const planDays: PlanDay[] = [];
  for (let w = 0; w < 4; w++) {
    for (let d = 0; d < 7; d++) {
      const date = addDays(startDate, w * 7 + d);
      const weekday = (d + 1) % 7; // Monday=1 ... Sunday=0
      const idx = days.indexOf(weekday);
      planDays.push({ date, type: idx >= 0 ? types[idx] : 'rest' });
    }
  }
  return {
    createdAt: new Date().toISOString(),
    startDate,
    trainingDays: days,
    duration: opts.duration,
    goal: opts.goal,
    anchors: chooseAnchors(opts.profile, inv),
    days: planDays,
  };
}

export function planWarnings(plan: Plan): string[] {
  const w: string[] = [];
  for (let i = 1; i < plan.days.length; i++) {
    const a = plan.days[i - 1];
    const b = plan.days[i];
    if (HARD_TYPES.includes(a.type) && HARD_TYPES.includes(b.type)) w.push(`${fmtDate(a.date)} and ${fmtDate(b.date)}: hard sessions on consecutive days.`);
  }
  for (let wk = 0; wk < 4; wk++) {
    const week = plan.days.slice(wk * 7, wk * 7 + 7);
    const hard = week.filter((d) => d.type === 'intervals').length;
    if (hard > 2) w.push(`Week ${wk + 1}: more than two interval sessions.`);
    if (!week.some((d) => d.type === 'rest' || d.type === 'recovery')) w.push(`Week ${wk + 1}: no rest or recovery day.`);
  }
  return w;
}

export function weekOfPlan(plan: Plan, dateIso: string): number | null {
  const start = new Date(plan.startDate + 'T12:00:00').getTime();
  const d = new Date(dateIso + 'T12:00:00').getTime();
  const diff = Math.floor((d - start) / 864e5);
  if (diff < 0 || diff >= 28) return null;
  return Math.floor(diff / 7) + 1;
}

export function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function todayIso(now = new Date()): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
