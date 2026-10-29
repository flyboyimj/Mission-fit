import { EXERCISES, getExercise } from '../data/exercises';
import type {
  Block, BlockItem, BodyPart, CardioMachine, Duration, Exercise, Focus, GenerateResult, Goal, Inventory, Limitation, Pattern,
  Profile, SessionLog, Step, Style, Workout, WorkoutParams,
} from '../types';
import { checkExercise, contextFrom, equipOptionFor, type FilterContext, isLoadedFor, LIMITATION_LABEL } from './filter';
import { effortCap } from './health';
import { suggestLoad } from './progression';

// ─────────────────────────────────────────────────────────────
// Transparent, rules-based workout generator. No AI API.
// Every exercise passes checkExercise() before it can appear.
// ─────────────────────────────────────────────────────────────

export interface GenContext {
  profile: Profile;
  sessions: SessionLog[];
  now?: Date;
}

export const WARMUP_MIN: Record<Duration, number> = { 15: 3, 20: 4, 30: 5, 45: 6, 60: 7 };
export const COOLDOWN_MIN: Record<Duration, number> = { 15: 2, 20: 3, 30: 4, 45: 5, 60: 5 };
export const STRENGTH_TRANSITION_SEC = 45;

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Slot {
  pattern: Pattern;
  muscle?: string;
  main?: boolean;
  label: string;
  /** Preferred exercises for this slot, in order. The first one that passes your restrictions wins. */
  prefer?: string[];
}

const S = (pattern: Pattern, label: string, main = false, muscle?: string): Slot => ({ pattern, label, main, muscle });

export const STRENGTH_SLOTS: Record<Focus, Slot[]> = {
  full: [S('squat', 'squat', true), S('h-pull', 'row', true), S('hinge', 'hinge', true), S('h-push', 'press', true), S('v-pull', 'pulldown'), S('lunge', 'single-leg'), S('core', 'core'), S('shoulder-iso', 'shoulders')],
  upper: [S('h-push', 'press', true), S('v-pull', 'pulldown', true), S('v-push', 'overhead press', true), S('h-pull', 'row', true), S('shoulder-iso', 'shoulders'), S('arms', 'triceps', false, 'triceps'), S('arms', 'biceps', false, 'biceps'), S('core', 'core')],
  lower: [S('squat', 'squat', true), S('hinge', 'hinge', true), S('lunge', 'single-leg'), S('hinge', 'posterior chain'), S('squat', 'quads'), S('calves', 'calves'), S('core', 'core')],
  push: [S('h-push', 'press', true), S('v-push', 'overhead press', true), S('h-push', 'press variation'), S('shoulder-iso', 'shoulders'), S('arms', 'triceps', false, 'triceps'), S('core', 'core')],
  pull: [S('v-pull', 'pulldown', true), S('h-pull', 'row', true), S('h-pull', 'upper back', false, 'rear-delts'), S('arms', 'biceps', false, 'biceps'), S('h-pull', 'row variation'), S('core', 'core')],
  core: [S('core', 'anti-extension'), S('core', 'anti-rotation'), S('hinge', 'glutes'), S('core', 'core'), S('core', 'core finisher')],
};

const CIRCUIT_SLOTS: Record<Focus, Slot[]> = {
  full: [S('squat', 'squat'), S('h-pull', 'row'), S('hinge', 'hinge'), S('h-push', 'press'), S('cardio', 'low-impact cardio'), S('core', 'core')],
  upper: [S('h-push', 'press'), S('v-pull', 'pulldown'), S('h-pull', 'row'), S('shoulder-iso', 'shoulders'), S('arms', 'arms'), S('core', 'core')],
  lower: [S('squat', 'squat'), S('hinge', 'hinge'), S('lunge', 'single-leg'), S('cardio', 'low-impact cardio'), S('calves', 'calves'), S('core', 'core')],
  push: [S('h-push', 'press'), S('shoulder-iso', 'shoulders'), S('arms', 'triceps', false, 'triceps'), S('cardio', 'low-impact cardio'), S('core', 'core')],
  pull: [S('v-pull', 'pulldown'), S('h-pull', 'row'), S('arms', 'biceps', false, 'biceps'), S('h-pull', 'upper back'), S('core', 'core')],
  core: [S('core', 'core'), S('core', 'core'), S('hinge', 'glutes'), S('cardio', 'low-impact cardio'), S('core', 'core')],
};

const TIMED_CORE = new Set(['forearm-plank', 'side-plank-knees', 'suitcase-hold']);
const MISSION_NOUNS = ['Anchor', 'Keel', 'Bulkhead', 'Quarterdeck', 'Lighthouse', 'Harbor', 'Iron Tide', 'Steel Watch', 'Compass', 'Headway', 'Bowline', 'Breakwater', 'Crow’s Nest', 'Deep Water', 'Gangway', 'Mainmast', 'North Star', 'Sea Wall', 'Tidewater', 'Long Haul'];
const STYLE_PREFIX: Record<Style, string> = { strength: 'Operation', 'strength-cond': 'Joint Op', circuit: 'Task Force', hiit: 'Fast Attack', steady: 'Long Watch', recovery: 'Shore Leave', boxing: 'Fight Night' };

export const STYLE_LABEL: Record<Style, string> = {
  circuit: 'Military-inspired circuit',
  hiit: 'Aerobic intervals (HIIT)',
  strength: 'Traditional strength',
  'strength-cond': 'Strength + conditioning',
  steady: 'Moderate cardio',
  recovery: 'Recovery',
  boxing: 'Boxing rounds',
};
export const GOAL_LABEL: Record<Goal, string> = { cardio: 'Cardio conditioning', fatloss: 'Fat-loss support', muscle: 'Muscle building', strength: 'Strength', balanced: 'Balanced' };
export const FOCUS_LABEL: Record<Focus, string> = { full: 'Full body', upper: 'Upper body', lower: 'Lower body / Leg day', push: 'Push', pull: 'Pull', core: 'Core' };

export const TYPE_EXPLANATION: Record<Style, string> = {
  strength: 'Strength session: fixed sets and reps with full rest so every set is good quality. Progress is tracked by weight and reps. The rest periods are part of the training — this is not cardio.',
  circuit: 'Resistance circuit: timed strength stations with short transitions, done in rounds. It raises your heart rate and builds muscular endurance, but it is not HIIT — loads stay moderate and form comes before speed.',
  hiit: 'Aerobic intervals: harder work bouts alternating with genuinely easy recovery on low-impact cardio. Effort is set by feel (1–10 scale), not age-predicted heart rate. Real intervals need real recovery.',
  'strength-cond': 'Strength first while you are fresh, then conditioning. Lifts get full rest and progression tracking; cardio comes after so fatigue does not compromise lifting technique.',
  steady: 'Moderate steady cardio: one continuous effort you could hold a conversation through (4–5/10). This builds your aerobic base and should make up most of your weekly cardio minutes.',
  boxing: 'Boxing rounds: timed rounds of shadow boxing and bag work with a set rest between, like a real boxing session. It is interval conditioning for the whole body. Power stays moderate, punches are technical, and effort is capped by feel. A weighted core finisher follows when time allows.',
  recovery: 'Recovery: easy movement, mobility and breathing at effort 3–4. It helps you absorb harder sessions and keeps consistency high.',
};

const GOAL_FIT: Record<Goal, string> = {
  cardio: 'Builds aerobic fitness — your ability to sustain work. Most weekly cardio should be easy-to-moderate, with intervals once or twice a week at most.',
  fatloss: 'Supports fat loss by adding activity and preserving muscle. Fat loss itself depends mostly on nutrition and overall energy balance — training helps, but no workout guarantees a result.',
  muscle: 'Builds muscle with moderate reps taken close to (not to) failure, and small weight increases over weeks. Protein, sleep and total food intake matter as much as the session.',
  strength: 'Builds strength with lower reps, longer rest and small weight increases. Technique and steady breathing come first — there are no max attempts.',
  balanced: 'Balances strength, muscle and conditioning so you improve on all fronts without overloading recovery.',
};

// ───────── helpers ─────────

function hoursBetween(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) / 36e5;
}

export function recentHardSession(sessions: SessionLog[], now: Date): SessionLog | null {
  return sessions.filter((s) => s.hard && hoursBetween(new Date(s.endedAt), now) < 36).sort((a, b) => b.endedAt.localeCompare(a.endedAt))[0] ?? null;
}

export function recentMuscles(sessions: SessionLog[], now: Date): Set<string> {
  const set = new Set<string>();
  for (const s of sessions) if (s.isStrengthDay && hoursBetween(new Date(s.endedAt), now) < 30) s.muscles.forEach((m) => set.add(m));
  return set;
}

function recentIds(sessions: SessionLog[], n: number): Set<string> {
  const ids = new Set<string>();
  [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, n).forEach((s) => s.sets.forEach((x) => ids.add(x.exerciseId)));
  return ids;
}

/** The main lift most recently used for this pattern — keeps main lifts consistent for progression. */
function historicalMain(pattern: Pattern, sessions: SessionLog[]): string | null {
  const sorted = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const s of sorted) for (const set of s.sets) {
    const ex = EXERCISES.find((e) => e.id === set.exerciseId);
    if (ex?.main && ex.pattern === pattern) return ex.id;
  }
  return null;
}

export function availableWeightsFor(ex: Exercise, inv: Inventory): number[] {
  const opt = equipOptionFor(ex, inv) ?? [];
  if (opt.includes('dumbbell')) return inv.dumbbellWeights;
  if (opt.includes('kettlebell')) return inv.kettlebellWeights;
  if (opt.some((e) => e.startsWith('machine') || e === 'cable')) return Array.from({ length: 60 }, (_, i) => (i + 1) * 5);
  return [];
}

function weightRange(ex: Exercise, inv: Inventory): string {
  const w = availableWeightsFor(ex, inv);
  const opt = equipOptionFor(ex, inv) ?? [];
  if (opt.includes('dumbbell') || opt.includes('kettlebell')) {
    if (!w.length) return '';
    return ` Available: ${Math.min(...w)}–${Math.max(...w)} lb.`;
  }
  if (opt.some((e) => e.startsWith('machine') || e === 'cable')) return ' Machine and cable stacks vary — note the pin number in your log.';
  return '';
}

function capRpe(range: [number, number], max: number): string {
  const lo = Math.min(range[0], max);
  const hi = Math.min(range[1], max);
  return lo === hi ? `${lo}` : `${lo}–${hi}`;
}

interface Scheme { sets: number; reps: [number, number]; rest: number; rpe: [number, number] }

/** Every lift: 3–4 working sets of 8–12 reps. Goal changes rest and effort, not the set/rep scheme. */
export const SET_RANGE: [number, number] = [3, 4];
export const REP_RANGE: [number, number] = [8, 12];

export function strengthScheme(goal: Goal, main: boolean, week: number | undefined, low: boolean): Scheme {
  const rest: Record<Goal, [number, number]> = {
    strength: [150, 90], muscle: [120, 75], balanced: [105, 75], fatloss: [90, 60], cardio: [75, 60],
  };
  const s: Scheme = { sets: 3, reps: [...REP_RANGE] as [number, number], rest: rest[goal][main ? 0 : 1], rpe: [6, 7] };
  // Conservative start; build over the 4-week block; week 4 is lighter (effort drops, sets stay at 3+).
  if (week === 2) s.rpe = [7, 7];
  if (week === 3) s.rpe = [7, 8];
  if (week === 4) { s.sets = 3; s.rpe = [6, 6]; }
  if (low) { s.sets = 3; s.rpe = [Math.max(5, s.rpe[0] - 1), Math.max(5, s.rpe[1] - 1)]; }
  return s;
}

/** Working-set time: ~3 s per rep plus ~10 s to set up (doubled for one-side-at-a-time moves). */
export function setDurationSec(ex: Exercise, repsTop: number): number {
  return (repsTop * 3 + 10) * (ex.unilateral ? 2 : 1);
}

function lowReadiness(p: WorkoutParams) {
  return p.readiness.energy <= 2 || p.readiness.soreness >= 4;
}

function cautionNote(ex: Exercise, ctx: FilterContext): string | undefined {
  const c = checkExercise(ex, ctx).cautions;
  return c.length ? c.map((x) => `${capitalize(LIMITATION_LABEL[x.area])}: ${x.text}`).join(' ') : undefined;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function explainUnfilled(slot: Slot, ctx: FilterContext): string {
  const cands = EXERCISES.filter((e) => e.pattern === slot.pattern && (!slot.muscle || e.muscles.includes(slot.muscle)) && e.kind !== 'warmup' && e.kind !== 'mobility');
  const counts = new Map<string, number>();
  for (const e of cands) for (const r of checkExercise(e, ctx).reasons) counts.set(r, (counts.get(r) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([r]) => r.toLowerCase());
  return `No suitable ${slot.label} exercise${top.length ? ` (${top.join('; ')})` : ''}.`;
}

// ───────── picking ─────────

interface PickState {
  used: Set<string>;
  rand: () => number;
  ctx: FilterContext;
  params: WorkoutParams;
  gen: GenContext;
  recentIds: Set<string>;
  recentMuscles: Set<string>;
}

function pickForSlot(slot: Slot, st: PickState, requireCircuit = false): Exercise | null {
  const { ctx, params, gen } = st;
  const avoid = new Set(params.avoidIds ?? []);
  if (slot.prefer?.length) {
    // Named slots (e.g. push day "flat bench → incline → machine fly"). "Different version" skips
    // the usual pick so the next preference rotates in.
    const ok = slot.prefer.map((id) => getExercise(id)).filter((e) => !st.used.has(e.id) && checkExercise(e, ctx).ok);
    const pick = ok.find((e) => !avoid.has(e.id)) ?? ok[0];
    if (pick) { st.used.add(pick.id); return pick; }
  }
  const cands = EXERCISES.filter((e) => {
    if (st.used.has(e.id)) return false;
    if (e.pattern !== slot.pattern) return false;
    if (slot.muscle && !e.muscles.includes(slot.muscle)) return false;
    if (e.kind === 'warmup' || e.kind === 'mobility') return false;
    if (slot.pattern === 'cardio' && requireCircuit && !e.circuitOk) return false;
    if (requireCircuit && !e.circuitOk) return false;
    return checkExercise(e, ctx).ok;
  });
  if (!cands.length) return null;

  const anchor = slot.main ? params.anchors?.[slot.pattern] : undefined;
  const hist = slot.main ? historicalMain(slot.pattern, gen.sessions) : null;
  const wristActive = ctx.active.includes('wrist') || ctx.discomfort.includes('wrist');
  const backActive = ctx.active.includes('lowBack') || ctx.discomfort.includes('lowBack');
  const kneeActive = ctx.active.includes('knee') || ctx.discomfort.includes('knee');

  let best: Exercise | null = null;
  let bestScore = -Infinity;
  for (const e of cands) {
    let score = st.rand() * 2;
    if (slot.main) {
      if (e.main) score += 5;
      if (anchor === e.id) score += 12;
      if (hist === e.id) score += 6;
    } else {
      if (avoid.has(e.id)) score -= 10;
      if (st.recentIds.has(e.id)) score -= 3;
    }
    if (e.muscles.some((m) => st.recentMuscles.has(m))) score -= 2;
    if (wristActive && e.grip === 'neutral') score += 1;
    if (backActive && e.tags?.includes('supported')) score += 2;
    if (kneeActive && e.tags?.includes('reduced-range')) score += 1;
    if (e.impact === 'low' && slot.pattern === 'cardio') score += 0.5;
    const cautions = checkExercise(e, ctx).cautions.length;
    score -= cautions * 0.5;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  if (best) st.used.add(best.id);
  return best;
}

// ───────── cardio selection ─────────

const CARDIO_PREF: CardioMachine[] = ['bike', 'elliptical', 'rower', 'treadmill'];
const CARDIO_ID: Record<CardioMachine, string> = { bike: 'bike', elliptical: 'elliptical', treadmill: 'treadmill-walk', rower: 'rower' };

export function pickCardio(params: WorkoutParams, ctx: FilterContext): Exercise | null {
  const order: CardioMachine[] = params.cardioMachine && params.cardioMachine !== 'none'
    ? [params.cardioMachine, ...CARDIO_PREF.filter((m) => m !== params.cardioMachine)]
    : CARDIO_PREF;
  if (params.cardioMachine !== 'none') {
    for (const m of order) {
      const ex = getExercise(CARDIO_ID[m]);
      if (checkExercise(ex, ctx).ok) return ex;
    }
  }
  for (const id of ['step-touch', 'march-in-place', 'shadow-boxing']) {
    const ex = getExercise(id);
    if (checkExercise(ex, ctx).ok) return ex;
  }
  return null;
}

// ───────── warm-up & cool-down ─────────

const LOWER: Pattern[] = ['squat', 'hinge', 'lunge', 'calves'];

function buildWarmup(totalSec: number, patterns: Set<Pattern>, cardio: Exercise | null, ctx: FilterContext, style: Style): BlockItem[] {
  const items: BlockItem[] = [];
  const general = cardio ?? (checkExercise(getExercise('march-in-place'), ctx).ok ? getExercise('march-in-place') : null);
  let remaining = totalSec;
  if (general) {
    const sec = Math.round(Math.max(60, totalSec * (style === 'hiit' ? 0.7 : 0.4)) / 15) * 15;
    items.push({ exerciseId: general.id, workSec: sec, restSec: 0, rpe: '2–4', note: 'Start easy and build gradually.' });
    remaining -= sec;
  }
  const lower = [...patterns].some((p) => LOWER.includes(p));
  const upper = [...patterns].some((p) => ['h-push', 'v-push', 'h-pull', 'v-pull', 'shoulder-iso', 'arms'].includes(p));
  const drills: string[] = [];
  if (lower || (!lower && !upper)) drills.push('hip-circles', 'glute-bridge', patterns.has('hinge') ? 'hip-hinge-drill' : 'bodyweight-box-squat', 'leg-swings');
  if (upper || (!lower && !upper)) drills.push('arm-circles', 'wall-slides', 'thoracic-open-book');
  drills.push('standing-cat-camel');
  const allowed = drills.filter((id) => checkExercise(getExercise(id), ctx).ok);
  // interleave lower/upper so short warm-ups still touch both when needed
  for (const id of allowed) {
    if (remaining < 30) break;
    const sec = remaining >= 90 ? 45 : 30;
    items.push({ exerciseId: id, workSec: sec, restSec: 0, rpe: '2–3' });
    remaining -= sec;
  }
  if (remaining >= 15 && items.length) items[0].workSec = (items[0].workSec ?? 0) + remaining;
  return items;
}

function buildCooldown(totalSec: number, patterns: Set<Pattern>, cardioUsed: boolean, ctx: FilterContext): BlockItem[] {
  const items: BlockItem[] = [];
  let remaining = totalSec;
  if (cardioUsed && totalSec >= 180 && checkExercise(getExercise('easy-walk'), ctx).ok) {
    items.push({ exerciseId: 'easy-walk', workSec: 60, restSec: 0, rpe: '2' });
    remaining -= 60;
  }
  const lower = [...patterns].some((p) => LOWER.includes(p) || p === 'cardio');
  const upper = [...patterns].some((p) => ['h-push', 'v-push', 'h-pull', 'v-pull', 'shoulder-iso', 'arms'].includes(p));
  const ids: string[] = [];
  if (lower) ids.push('supported-hamstring-stretch', 'hip-flexor-stretch', 'calf-stretch');
  if (upper) ids.push('doorway-chest-stretch', 'thoracic-open-book');
  if (!lower && !upper) ids.push('supported-hamstring-stretch', 'standing-cat-camel');
  const allowed = ids.filter((id) => checkExercise(getExercise(id), ctx).ok);
  remaining -= 60; // breathing reset reserved
  for (const id of allowed) {
    if (remaining < 30) break;
    const sec = remaining >= 90 ? 45 : 30;
    items.push({ exerciseId: id, workSec: sec, restSec: 0, rpe: '1–2', note: 'Gentle — no bouncing, no pain.' });
    remaining -= sec;
  }
  items.push({ exerciseId: 'breathing-reset', workSec: 60 + Math.max(0, remaining), restSec: 0, rpe: '1' });
  return items;
}

// ───────── main blocks ─────────

interface BuildOut {
  blocks: Block[];
  removed: { exerciseId?: string; reason: string }[];
  warnings: string[];
  patterns: Set<Pattern>;
  cardio: Exercise | null;
  hard: boolean;
  intervalSummary?: string;
}

function strengthItem(ex: Exercise, sch: Scheme, st: PickState, maxRpe: number, firstMain: boolean): BlockItem {
  const isCarry = ex.kind === 'carry';
  const timedCore = TIMED_CORE.has(ex.id);
  const inv = st.params.inventory;
  const item: BlockItem = {
    exerciseId: ex.id,
    sets: sch.sets,
    restSec: sch.rest,
    rpe: capRpe(sch.rpe, maxRpe),
    note: cautionNote(ex, st.ctx),
  };
  if (isCarry) {
    item.workSec = 40; item.sets = 3; item.restSec = 60;
    item.loadGuidance = `Moderate weight you can carry with tall posture and steady breathing.${weightRange(ex, inv)}`;
  } else if (timedCore) {
    item.workSec = st.ctx.active.includes('hypertension') ? 20 : 30; item.restSec = 45;
    item.loadGuidance = (isLoadedFor(ex, inv) ? `Moderate weight in one hand.${weightRange(ex, inv)} ` : 'Bodyweight. ') + 'Hold only while you can breathe smoothly and keep good form.';
  } else if (ex.kind === 'core') {
    item.reps = `${REP_RANGE[0]}–${REP_RANGE[1]}${ex.unilateral || ex.id === 'weighted-dead-bug' ? ' each side' : ''}`; item.repTarget = [...REP_RANGE] as [number, number]; item.restSec = 60;
    item.loadGuidance = isLoadedFor(ex, inv) ? `Light load — slow and controlled.${weightRange(ex, inv)}` : 'Bodyweight — slow and controlled.';
  } else {
    item.reps = `${sch.reps[0]}–${sch.reps[1]}`;
    item.repTarget = sch.reps;
    const sug = suggestLoad(ex.id, st.gen.sessions, sch.reps, availableWeightsFor(ex, inv), st.params.readiness);
    item.suggestion = sug.text;
    item.loadGuidance = `Choose a load that leaves about ${10 - Math.min(sch.rpe[1], maxRpe)} reps in reserve.${weightRange(ex, inv)}`;
    if (firstMain) item.rampUp = true;
  }
  return item;
}

export function strengthItemCost(ex: Exercise, item: BlockItem): number {
  const sets = item.sets ?? 1;
  const per = item.workSec ?? setDurationSec(ex, item.repTarget?.[1] ?? 10);
  return sets * per + (sets - 1) * item.restSec + Math.max(item.restSec, STRENGTH_TRANSITION_SEC);
}

function buildStrength(budget: number, st: PickState, maxRpe: number, out: BuildOut, includeCarry: boolean, slotsOverride?: Slot[], restScale = 1) {
  const p = st.params;
  if (!slotsOverride && p.bodyParts?.length) return buildSplit('custom', budget, st, maxRpe, out);
  if (!slotsOverride && (p.focus === 'push' || p.focus === 'pull')) return buildSplit(p.focus, budget, st, maxRpe, out);
  const low = lowReadiness(p);
  const slots = slotsOverride ?? STRENGTH_SLOTS[p.focus];
  const items: BlockItem[] = [];
  let used = 0;
  let carryItem: BlockItem | null = null;
  let firstMainDone = false;
  // Sessions of 30 min or less: no carry, no ramp-up sets, slightly shorter rests so more lifts fit at 3+ sets.
  const short = budget < 1500;
  if (short) { includeCarry = false; restScale = Math.min(restScale, budget < 900 ? 0.5 : 0.75); }

  if (includeCarry) {
    const carryEx = pickForSlot(S('carry', 'carry'), st);
    if (carryEx) {
      carryItem = strengthItem(carryEx, strengthScheme(p.goal, false, p.planWeek, low), st, maxRpe, false);
      used += strengthItemCost(carryEx, carryItem);
    } else out.removed.push({ reason: explainUnfilled(S('carry', 'carry'), st.ctx) + ' Carries skipped.' });
  }

  for (const slot of slots) {
    const ex = pickForSlot(slot, st);
    if (!ex) {
      if (used < budget * 0.8) out.removed.push({ reason: explainUnfilled(slot, st.ctx) });
      continue;
    }
    const isMain = !!(slot.main && ex.main);
    const sch = strengthScheme(p.goal, isMain, p.planWeek, low);
    sch.rest = Math.max(60, Math.round((sch.rest * restScale) / 15) * 15);
    const item = strengthItem(ex, sch, st, maxRpe, isMain && !firstMainDone);
    if (short) item.rampUp = false;
    const ramp = item.rampUp ? 90 : 0;
    let cost = strengthItemCost(ex, item) + ramp;
    while (used + cost > budget && (item.sets ?? 1) > SET_RANGE[0]) {
      item.sets = (item.sets ?? 1) - 1;
      cost = strengthItemCost(ex, item) + ramp;
    }
    if (used + cost > budget) {
      st.used.delete(ex.id);
      continue; // a cheaper slot later in the list may still fit
    }
    if (isMain && !firstMainDone) firstMainDone = true;
    items.push(item);
    used += cost;
    out.patterns.add(ex.pattern);
  }

  // Spare time: add a 4th set to main lifts first, then accessories (not on low-readiness or deload days).
  for (const pass of (low || p.planWeek === 4 ? [] : [true, false])) {
    let added = true;
    while (added) {
      added = false;
      for (const it of items) {
        const ex = getExercise(it.exerciseId);
        if (!!ex.main !== pass || (it.sets ?? 0) >= SET_RANGE[1]) continue;
        const extra = (it.workSec ?? setDurationSec(ex, it.repTarget?.[1] ?? 10)) + it.restSec;
        if (used + extra <= budget) { it.sets = (it.sets ?? 0) + 1; used += extra; added = true; }
      }
    }
  }

  if (carryItem) { items.push(carryItem); out.patterns.add('carry'); }
  // A non-core focus that ends up with only core work would be misleading — report it instead.
  const substantive = items.filter((i) => !['core'].includes(getExercise(i.exerciseId).pattern));
  if (!items.length || (!slotsOverride && p.focus !== 'core' && substantive.length === 0)) {
    items.forEach((i) => st.used.delete(i.exerciseId));
    return 0;
  }
  out.blocks.push({
    id: 'strength',
    title: p.style === 'strength-cond' ? 'Strength Block (first, while fresh)' : 'Strength Block',
    kind: 'strength',
    description: 'Controlled reps, full rest. Log weight and reps each set so progress can be tracked.',
    items,
  });
  return used;
}

function buildCircuit(budget: number, st: PickState, maxRpe: number, out: BuildOut) {
  const p = st.params;
  const low = lowReadiness(p);
  let slots = [...CIRCUIT_SLOTS[p.focus]];
  if (st.ctx.requireLoad) {
    // Weighted main work: the low-impact cardio station becomes a loaded carry or hinge.
    slots = slots.map((s) => (s.pattern === 'cardio' ? (p.includeCarries ? S('carry', 'carry') : S('hinge', 'loaded hinge')) : s));
  }
  if (p.includeCarries && slots.filter((s) => s.pattern === 'carry').length === 0) slots.splice(slots.length - 1, 0, S('carry', 'carry'));
  const stations: Exercise[] = [];
  for (const slot of slots) {
    const ex = pickForSlot(slot, st, true);
    if (ex) { stations.push(ex); out.patterns.add(ex.pattern); }
    else out.removed.push({ reason: explainUnfilled(slot, st.ctx) + ' Station dropped.' });
  }
  if (stations.length < 3) return 0;
  const work = p.goal === 'fatloss' || p.goal === 'cardio' ? 45 : 40;
  const trans = p.location === 'gym' ? 20 : 15;
  const roundRest = low ? 90 : 75;
  const roundCost = stations.length * (work + trans) - trans;
  let rounds = Math.floor((budget + roundRest) / (roundCost + roundRest));
  if (low) rounds = Math.max(1, rounds - 1);
  rounds = Math.min(8, rounds);
  while (rounds < 2 && stations.length > 3) {
    stations.pop();
    const rc = stations.length * (work + trans) - trans;
    rounds = Math.floor((budget + roundRest) / (rc + roundRest));
  }
  if (rounds < 1) return 0;
  const rpe = capRpe(low ? [5, 6] : [6, 7], maxRpe);
  out.blocks.push({
    id: 'circuit',
    title: `Station Circuit — ${rounds} round${rounds > 1 ? 's' : ''}`,
    kind: 'circuit',
    description: `${work} s per station, ${trans} s to move, ${roundRest} s between rounds. Steady pace: aim for 8–12 clean reps per station. Do not race.`,
    rounds,
    restBetweenRoundsSec: roundRest,
    items: stations.map((ex) => ({
      exerciseId: ex.id,
      workSec: work,
      restSec: trans,
      rpe,
      note: cautionNote(ex, st.ctx),
      loadGuidance: !isLoadedFor(ex, p.inventory)
        ? 'Bodyweight — smooth and controlled.'
        : `Moderate load you could lift 15+ times.${weightRange(ex, p.inventory)}`,
    })),
  });
  return rounds * roundCost + (rounds - 1) * roundRest;
}

export interface IntervalPlan { workSec: number; restSec: number; rounds: number; workRpe: number; restRpe: number; tempo: boolean }

export function defaultIntervals(goal: Goal, week?: number): Omit<IntervalPlan, 'rounds' | 'tempo'> & { rounds: number } {
  if (week === 3) return { workSec: 45, restSec: 75, rounds: 6, workRpe: 7, restRpe: 3 };
  if (week === 4) return { workSec: 30, restSec: 90, rounds: 5, workRpe: 6, restRpe: 3 };
  if (goal === 'cardio') return { workSec: 60, restSec: 90, rounds: week === 2 ? 7 : 6, workRpe: 7, restRpe: 3 };
  return { workSec: 30, restSec: 90, rounds: week === 2 ? 8 : 6, workRpe: 7, restRpe: 3 };
}

function buildIntervals(budget: number, st: PickState, cap: { maxRpe: number; vigorousAllowed: boolean }, out: BuildOut, cardio: Exercise, forceModerate: boolean) {
  const p = st.params;
  const d = defaultIntervals(p.goal, p.planWeek);
  const cfg = p.intervals ?? {};
  const workSec = clamp(cfg.workSec ?? d.workSec, 15, 240);
  const restSec = clamp(cfg.restSec ?? d.restSec, 15, 300);
  let workRpe = Math.min(cfg.workRpe ?? d.workRpe, cap.maxRpe, 8);
  const restRpe = Math.min(cfg.restRpe ?? d.restRpe, 4);
  const tempo = forceModerate || !cap.vigorousAllowed;
  if (tempo) workRpe = Math.min(workRpe, 6);
  const maxRounds = Math.floor(budget / (workSec + restSec));
  let rounds = cfg.rounds ? Math.min(cfg.rounds, maxRounds) : Math.min(maxRounds, d.rounds + Math.floor((maxRounds - d.rounds) / 3));
  rounds = Math.max(0, Math.min(rounds, 12));
  if (rounds < 2) return 0;
  const intervalTime = rounds * (workSec + restSec);
  const items: BlockItem[] = [{ exerciseId: cardio.id, workSec, restSec, rpe: `${workRpe}`, note: cautionNote(cardio, st.ctx) }];
  out.blocks.push({
    id: 'intervals',
    title: tempo ? `Tempo Intervals — ${rounds} × ${workSec}s` : `Aerobic Intervals — ${rounds} × ${workSec}s`,
    kind: 'intervals',
    description: `${workSec} s at effort ${workRpe}/10, then ${restSec} s genuinely easy (effort ${restRpe}). ${tempo ? 'Moderate intervals — vigorous work is capped for now.' : 'Hard but repeatable — never all-out.'}`,
    rounds,
    items,
  });
  out.intervalSummary = `${rounds} × ${workSec}s @ ${workRpe}/10, ${restSec}s easy`;
  out.hard = out.hard || (!tempo && workRpe >= 7);
  let used = intervalTime;
  const leftover = budget - intervalTime;
  if (leftover >= 120) {
    out.blocks.push({
      id: 'steady-finish', title: 'Easy Finish', kind: 'steady',
      description: 'Easy steady effort to round out the session.',
      items: [{ exerciseId: cardio.id, workSec: Math.floor(leftover / 30) * 30, restSec: 0, rpe: '3–4' }],
    });
    used += Math.floor(leftover / 30) * 30;
  }
  return used;
}

// ───────── push / pull body-part days ─────────
// Push: 3 chest + 3 shoulders + 3 triceps. Pull: 3 back + 3 biceps/arms.
// Every exercise 3–4 sets × 8–12. Straight sets when time allows; otherwise
// supersets/trisets (back-to-back with short transitions) keep the full count.

const SUPERSET_MOVE_SEC = 15;

interface SplitGroup { label: string; slots: Slot[]; fallback?: Pattern }
export const SPLIT_GROUPS: Record<'push' | 'pull', SplitGroup[]> = {
  push: [
    { label: 'chest', slots: [
      { ...S('h-push', 'flat bench', true, 'chest'), prefer: ['db-bench-neutral', 'machine-chest-press', 'db-floor-press'] },
      { ...S('h-push', 'incline press', false, 'chest'), prefer: ['db-incline-press', 'machine-chest-press', 'cable-chest-press', 'db-floor-press'] },
      { ...S('h-push', 'chest fly', false, 'chest'), prefer: ['machine-fly', 'cable-fly', 'db-fly'] },
    ] },
    { label: 'shoulders', slots: [
      { ...S('v-push', 'overhead press', true, 'shoulders'), prefer: ['seated-db-press', 'machine-shoulder-press'] },
      { ...S('v-push', 'Smith press', true, 'shoulders'), prefer: ['smith-shoulder-press', 'machine-shoulder-press', 'seated-db-press'] },
      { ...S('shoulder-iso', 'raises', false, 'shoulders'), prefer: ['lateral-raise', 'front-raise', 'incline-y-raise'] },
    ], fallback: 'shoulder-iso' },
    { label: 'triceps', slots: [
      { ...S('arms', 'pushdown', false, 'triceps'), prefer: ['cable-pushdown', 'close-grip-press'] },
      { ...S('arms', 'lying extension', false, 'triceps'), prefer: ['db-triceps-ext', 'seated-overhead-ext', 'cable-overhead-ext'] },
      { ...S('arms', 'kickback', false, 'triceps'), prefer: ['db-kickback', 'cable-overhead-ext', 'seated-overhead-ext'] },
    ] },
  ],
  pull: [
    { label: 'back', slots: [S('v-pull', 'vertical pull', true), S('h-pull', 'row', true), S('h-pull', 'upper back')], fallback: 'h-pull' },
    { label: 'biceps', slots: [S('arms', 'biceps', false, 'biceps'), S('arms', 'biceps', false, 'biceps'), S('arms', 'biceps', false, 'biceps')] },
  ],
};

/** Body-part picker: each part has up to 3 slots in order; preferences fall back to any allowed match. */
export const BODY_PART_ORDER: BodyPart[] = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'calves', 'core'];
export const BODY_PART_LABEL: Record<BodyPart, string> = {
  chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps', back: 'Back', biceps: 'Biceps',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', core: 'Core',
};
export function bodyPartGroups(): Record<BodyPart, SplitGroup> {
  const [chest, shoulders, triceps] = SPLIT_GROUPS.push;
  const [back, biceps] = SPLIT_GROUPS.pull;
  return {
    chest, shoulders, triceps, back, biceps,
    quads: { label: 'quads', slots: [
      { ...S('squat', 'squat', true, 'quads'), prefer: ['leg-press', 'goblet-squat', 'box-squat-db'] },
      { ...S('lunge', 'single-leg', false, 'quads'), prefer: ['supported-split-squat', 'reverse-lunge', 'step-up'] },
      { ...S('squat', 'quad isolation', false, 'quads'), prefer: ['leg-extension', 'box-squat-db', 'goblet-squat'] },
    ] },
    hamstrings: { label: 'hamstrings', slots: [
      { ...S('hinge', 'Romanian deadlift', true, 'hamstrings'), prefer: ['db-rdl', 'kb-deadlift'] },
      { ...S('hinge', 'leg curl', false, 'hamstrings'), prefer: ['leg-curl', 'db-leg-curl', 'cable-pull-through'] },
      { ...S('hinge', 'single-leg hinge', false, 'hamstrings'), prefer: ['supported-sl-rdl', 'db-hip-thrust', 'kb-deadlift'] },
    ] },
    glutes: { label: 'glutes', slots: [
      { ...S('hinge', 'hip thrust', true, 'glutes'), prefer: ['db-hip-thrust', 'db-glute-bridge'] },
      { ...S('hinge', 'glute isolation', false, 'glutes'), prefer: ['cable-kickback', 'hip-abduction', 'sumo-deadlift'] },
      { ...S('lunge', 'step-up', false, 'glutes'), prefer: ['step-up', 'reverse-lunge', 'supported-split-squat'] },
    ] },
    calves: { label: 'calves', slots: [
      { ...S('calves', 'standing calf raise', false, 'calves'), prefer: ['calf-raise', 'leg-press-calf'] },
      { ...S('calves', 'seated calf raise', false, 'calves'), prefer: ['leg-press-calf', 'seated-calf-raise', 'calf-raise'] },
    ] },
    core: { label: 'core', slots: [
      { ...S('core', 'anti-rotation', false, 'core'), prefer: ['pallof-press', 'weighted-dead-bug', 'goblet-press-out'] },
      { ...S('core', 'rotation', false, 'core'), prefer: ['cable-chop', 'suitcase-hold', 'db-side-bend'] },
      { ...S('core', 'bracing', false, 'core'), prefer: ['weighted-dead-bug', 'kb-halo', 'suitcase-hold'] },
    ] },
  };
}
/** How many exercises each selected part gets: 3 for 1–3 parts, 2 for 4–5, 1 for 6+. */
export function perPartCount(n: number): number {
  return n <= 3 ? 3 : n <= 5 ? 2 : 1;
}
export function customGroups(parts: BodyPart[]): SplitGroup[] {
  const all = bodyPartGroups();
  const ordered = BODY_PART_ORDER.filter((b) => parts.includes(b));
  const n = perPartCount(ordered.length);
  return ordered.map((b) => ({ ...all[b], label: all[b].label, slots: all[b].slots.slice(0, n) }));
}

function groupCost(items: BlockItem[], idxs: number[], rest: number): number {
  const sets = Math.min(...idxs.map((i) => items[i].sets ?? 3));
  const work = idxs.reduce((t, i) => t + setDurationSec(getExercise(items[i].exerciseId), items[i].repTarget?.[1] ?? 12), 0);
  return sets * work + sets * (idxs.length - 1) * SUPERSET_MOVE_SEC + (sets - 1) * rest + Math.max(rest, STRENGTH_TRANSITION_SEC);
}

/** Round-robin across muscle groups; a round with more than 3 exercises is split so no superset exceeds 3. */
function zipGroups(lists: number[][]): number[][] {
  const out: number[][] = [];
  const n = Math.max(0, ...lists.map((l) => l.length));
  for (let k = 0; k < n; k++) {
    const g = lists.map((l) => l[k]).filter((x) => x !== undefined);
    if (!g.length) continue;
    const pieces = Math.ceil(g.length / 3);
    const size = Math.ceil(g.length / pieces);
    for (let i = 0; i < g.length; i += size) out.push(g.slice(i, i + size));
  }
  return out;
}

function buildSplit(focus: 'push' | 'pull' | 'custom', budget: number, st: PickState, maxRpe: number, out: BuildOut): number {
  const p = st.params;
  const low = lowReadiness(p);
  const groups = focus === 'custom' ? customGroups(p.bodyParts ?? []) : SPLIT_GROUPS[focus];
  const items: BlockItem[] = [];
  const byGroup: number[][] = groups.map(() => []);

  groups.forEach((g, gi) => {
    for (const slot of g.slots) {
      let ex = pickForSlot(slot, st);
      if (!ex && g.fallback && slot.pattern !== g.fallback) ex = pickForSlot({ ...slot, pattern: g.fallback }, st);
      if (!ex) { out.removed.push({ reason: explainUnfilled(slot, st.ctx) }); continue; }
      const isMain = !!(slot.main && ex.main);
      const sch = strengthScheme(p.goal, isMain, p.planWeek, low);
      const item = strengthItem(ex, sch, st, maxRpe, false);
      item.rampUp = false;
      byGroup[gi].push(items.length);
      items.push(item);
      out.patterns.add(ex.pattern);
    }
  });
  if (!items.length) return 0;

  const restOf = (i: number) => items[i].restSec;
  const isMainIdx = (i: number) => !!getExercise(items[i].exerciseId).main;
  /** Rest for a unit: straight sets keep full rest (or 75/60 s compressed); supersets 60 s (45 s compressed). */
  const unitRest = (g: number[], compress: boolean) =>
    g.length === 1 ? (compress ? Math.min(restOf(g[0]), isMainIdx(g[0]) ? 75 : 60) : restOf(g[0])) : compress ? 45 : 60;
  const costOf = (layout: number[][], compress: boolean) => layout.reduce((t, g) => t + groupCost(items, g, unitRest(g, compress)), 0);

  // Candidate layouts, most relaxed first.
  const straight = items.map((_, i) => [i]);
  const full = byGroup.every((g) => g.length === 3);
  const pairs: number[][] | null = !full || focus === 'custom' ? null : focus === 'push'
    ? [[byGroup[0][0]], [byGroup[1][0]], [byGroup[0][1], byGroup[2][0]], [byGroup[0][2], byGroup[1][1]], [byGroup[1][2], byGroup[2][1]], [byGroup[2][2]]]
    : [[byGroup[0][0]], [byGroup[0][1]], [byGroup[0][2], byGroup[1][0]], [byGroup[1][1], byGroup[1][2]]];
  const zipped = zipGroups(byGroup);

  const options: { layout: number[][]; compress: boolean }[] = [
    { layout: straight, compress: false },
    { layout: straight, compress: true },
    ...(pairs ? [{ layout: pairs, compress: false }] : []),
    { layout: zipped, compress: false },
    { layout: zipped, compress: true },
  ];
  // Straight sets in muscle-group order are preferred (chest → shoulders → triceps) — even
  // a minute or two long — before switching to supersets/trisets.
  const fits = (o: { layout: number[][]; compress: boolean }, tol = 1) => costOf(o.layout, o.compress) <= budget * tol;
  let chosen = fits(options[0]) ? options[0] : fits(options[1], 1.09) ? options[1] : options.slice(2).find((o) => fits(o));
  // Keeping every exercise is worth running ~1–2 minutes long (total stays within the session's tolerance).
  if (!chosen) chosen = options.slice(2).find((o) => fits(o, 1.06));

  // Still too long: drop the last exercise of each muscle group and retry (never below 1 per group).
  let keep = byGroup.map((g) => g.slice());
  while (!chosen && keep.some((g) => g.length > 1)) {
    keep = keep.map((g) => (g.length > 1 ? g.slice(0, -1) : g));
    const z = zipGroups(keep);
    chosen = [{ layout: z, compress: false }, { layout: z, compress: true }].find((o) => costOf(o.layout, o.compress) <= budget * 1.06);
  }
  // Very short sessions: drop whole muscle groups from the end (e.g. triceps) until it fits.
  while (!chosen && keep.filter((g) => g.length).length > 1) {
    const lastIdx = keep.map((g) => g.length > 0).lastIndexOf(true);
    keep = keep.map((g, i) => (i === lastIdx ? [] : g));
    const z = zipGroups(keep);
    if (costOf(z, true) <= budget * 1.06) chosen = { layout: z, compress: true };
  }
  if (!chosen) { const z = zipGroups(keep); chosen = { layout: z, compress: true }; }

  const per = groups.map((g, gi) => `${keep[gi]?.length ?? 0} ${g.label}`).join(' · ');
  const dropped = byGroup.reduce((t, g) => t + g.length, 0) - chosen.layout.flat().length;
  if (dropped > 0) {
    out.warnings.push(`All selected exercises (${groups.map((g) => `${g.slots.length} ${g.label}`).join(', ')}) don't fit in this time. This mission fits ${per}. Choose a longer duration for the full set.`);
    const used = new Set(chosen.layout.flat());
    items.forEach((it, i) => { if (!used.has(i)) st.used.delete(it.exerciseId); });
  }

  // Apply layout: order, group labels and rests.
  const ordered: BlockItem[] = [];
  let letter = 0;
  for (const g of chosen.layout) {
    const rest = unitRest(g, chosen.compress);
    const label = g.length > 1 ? String.fromCharCode(65 + letter++) : undefined;
    g.forEach((i, k) => { items[i].restSec = rest; items[i].group = label ? `${label}${k + 1}` : undefined; ordered.push(items[i]); });
  }

  // Spare time: add a 4th round to groups (main lifts first), except on low-readiness or deload days.
  let used = Math.min(budget, costOf(chosen.layout, chosen.compress));
  if (!low && p.planWeek !== 4) {
    const sorted = [...chosen.layout].sort((a, b) => Number(b.some((i) => getExercise(items[i].exerciseId).main)) - Number(a.some((i) => getExercise(items[i].exerciseId).main)));
    for (const g of sorted) {
      if (g.some((i) => (items[i].sets ?? 3) >= SET_RANGE[1])) continue;
      const rest = items[g[0]].restSec;
      const extra = g.reduce((t, i) => t + setDurationSec(getExercise(items[i].exerciseId), 12), 0) + (g.length - 1) * SUPERSET_MOVE_SEC + rest;
      if (used + extra <= budget) { g.forEach((i) => { items[i].sets = (items[i].sets ?? 3) + 1; }); used += extra; }
    }
  }

  const structure = chosen.layout.every((g) => g.length === 1) ? 'Straight sets'
    : chosen.layout.every((g) => g.length === 3) ? 'Trisets'
    : chosen.layout.every((g) => g.length > 1) ? 'Supersets'
    : 'Straight sets for the main lifts, then supersets';
  out.blocks.push({
    id: 'strength',
    title: focus === 'custom' ? `Custom — ${groups.map((g) => g.label.charAt(0).toUpperCase() + g.label.slice(1)).join(' · ')}` : focus === 'push' ? 'Push Day — Chest · Shoulders · Triceps' : 'Pull Day — Back · Biceps',
    kind: 'strength',
    description: `${per} — 3–4 sets of 8–12 each. ${structure}${structure === 'Straight sets' ? '' : `: do the lettered exercises back-to-back (${SUPERSET_MOVE_SEC}s to switch), then rest`}. Log weight and reps every set.`,
    items: ordered,
  });
  return used;
}

const COMBOS = {
  shadow: ['1-2 (jab–cross), reset to stance', '1-1-2 (double jab–cross)', '1-2-3 (jab–cross–lead hook)', '1-2, slip right, 2', 'Jab to the body, jab to the head', '1-2-3-2', 'Jab, roll under, 3-2', 'Free round — mix everything, stay smooth'],
  defense: ['Slip–slip–roll, back to guard', 'Pivot off the lead foot, re-set, 1-2', 'Step back, catch the jab, counter 2', 'Circle left 3 steps, jab; circle right 3 steps, cross'],
  bag: ['1-2, move off the bag', 'Double jab–cross, circle', '1-2-1-2 at 50% power, focus on snap', 'Jab, jab, cross — step out at an angle', 'Cross–jab–cross, reset'],
  hooks: ['1-2-3, return to guard', '2-3-2 to the body', '3 to the body, 3 to the head', 'Uppercut–hook (5-3), step out'],
};

function buildBoxing(budget: number, st: PickState, cap: { maxRpe: number; vigorousAllowed: boolean }, out: BuildOut, forceModerate: boolean): number {
  const p = st.params;
  const ok = (id: string) => checkExercise(getExercise(id), st.ctx).ok;
  const shadow = ok('shadow-boxing') ? 'shadow-boxing' : null;
  const defense = ok('shadow-defense') ? 'shadow-defense' : null;
  const bag = ok('bag-straight') ? 'bag-straight' : null;
  const hooks = ok('bag-hooks') ? 'bag-hooks' : null;
  const rotation = [shadow ?? defense, bag ?? shadow, defense ?? shadow, hooks ?? bag ?? shadow, bag ?? defense].filter((x): x is string => !!x);
  if (!rotation.length) {
    out.removed.push({ reason: 'Boxing rounds removed: every boxing drill is excluded by today’s restrictions or discomfort flags (wrists, shoulders or feet).' });
    return 0;
  }
  if (!bag && !hooks) out.warnings.push(p.inventory.heavyBag ? 'Bag work is excluded by your restrictions today — all rounds are shadow boxing.' : 'No heavy bag selected — all rounds are shadow boxing. Turn on "Heavy bag" in equipment for bag rounds.');
  const cfg = p.intervals ?? {};
  const round = clamp(cfg.workSec ?? (p.planWeek && p.planWeek >= 2 && p.planWeek <= 3 ? 150 : 120), 60, 180);
  const rest = clamp(cfg.restSec ?? 60, 30, 120);
  let rpe = Math.min(cfg.workRpe ?? 7, cap.maxRpe, 8);
  const tempo = forceModerate || !cap.vigorousAllowed || lowReadiness(p);
  if (tempo) rpe = Math.min(rpe, 6);
  let rounds = Math.floor((budget + rest) / (round + rest));
  if (cfg.rounds) rounds = Math.min(cfg.rounds, rounds);
  rounds = Math.min(12, rounds);
  if (rounds < 2) return 0;
  const pick = (arr: string[], i: number) => arr[(i + Math.floor(st.rand() * arr.length)) % arr.length];
  const items: BlockItem[] = [];
  for (let i = 0; i < rounds; i++) {
    const exId = rotation[i % rotation.length];
    const list = exId === 'shadow-boxing' ? COMBOS.shadow : exId === 'shadow-defense' ? COMBOS.defense : exId === 'bag-hooks' ? COMBOS.hooks : COMBOS.bag;
    const ex = getExercise(exId);
    items.push({
      exerciseId: exId, workSec: round, restSec: rest, rpe: `${i === 0 ? Math.min(rpe, 5) : rpe}`,
      drill: i === 0 ? 'Easy round — find your stance and rhythm' : pick(list, i),
      note: cautionNote(ex, st.ctx),
      loadGuidance: ex.equipOptions.flat().includes('heavy-bag')
        ? 'Hand wraps and 14–16 oz gloves. About 50–60% power — speed and form, not knockouts.'
        : 'Empty hands, relaxed fists. Punch to a target just inside full reach and snap back to guard.',
    });
  }
  out.blocks.push({
    id: 'boxing', title: `Boxing — ${rounds} × ${round % 60 ? `${round}s` : `${round / 60}-min`} rounds`, kind: 'rounds',
    description: `${round % 60 ? `${round}s` : `${round / 60} min`} rounds at effort ${rpe}/10 with ${rest}s rest. Hands up, chin down, breathe out on every punch. ${tempo ? 'Moderate effort today.' : 'Hard but technical — never all-out.'}`,
    items,
  });
  out.patterns.add('cardio');
  out.patterns.add('shoulder-iso');
  out.hard = out.hard || (!tempo && rpe >= 7);
  return rounds * round + (rounds - 1) * rest;
}

function buildSteady(budget: number, st: PickState, out: BuildOut, cardio: Exercise, rpe: string, title: string) {
  const sec = Math.floor(budget / 30) * 30;
  if (sec < 60) return 0;
  out.blocks.push({
    id: 'steady-' + out.blocks.length, title, kind: 'steady',
    description: `Continuous effort ${rpe}/10 — you can talk in sentences.`,
    items: [{ exerciseId: cardio.id, workSec: sec, restSec: 0, rpe, note: cautionNote(cardio, st.ctx) }],
  });
  return sec;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// ───────── steps ─────────

export function blocksToSteps(blocks: Block[]): Step[] {
  const steps: Step[] = [];
  let n = 0;
  const id = () => `s${n++}`;
  for (const b of blocks) {
    if (b.kind === 'warmup' || b.kind === 'cooldown' || b.kind === 'recovery') {
      for (const it of b.items) {
        const ex = getExercise(it.exerciseId);
        steps.push({ id: id(), kind: b.kind === 'cooldown' ? 'cooldown' : 'warmup', exerciseId: ex.id, label: ex.name, durationSec: it.workSec ?? 30, timed: true, rpe: it.rpe, note: it.note, blockId: b.id });
      }
    } else if (b.kind === 'strength' || b.kind === 'core' || b.kind === 'carry') {
      // Units: a single exercise, or a superset/triset (items sharing a group letter).
      const units: BlockItem[][] = [];
      for (const it of b.items) {
        const prev = units[units.length - 1];
        if (it.group && prev && prev[0].group && prev[0].group[0] === it.group[0]) prev.push(it);
        else units.push([it]);
      }
      units.forEach((unit, ui) => {
        const sets = Math.min(...unit.map((it) => it.sets ?? 1));
        for (const it of unit) if (it.rampUp) {
          const ex = getExercise(it.exerciseId);
          steps.push({ id: id(), kind: 'warmup', exerciseId: ex.id, label: `Ramp-up: ${ex.name}`, durationSec: 90, timed: false, reps: '1–2 light sets', rpe: '3–4', note: 'Do 1–2 easy sets (about 50%, then 75% of your working weight) to rehearse the movement. Tap Done when ready.', blockId: b.id });
        }
        for (let s = 1; s <= sets; s++) {
          unit.forEach((it, k) => {
            const ex = getExercise(it.exerciseId);
            const timed = !!it.workSec;
            steps.push({
              id: id(), kind: timed ? 'station' : 'set', exerciseId: ex.id, label: ex.name,
              durationSec: timed ? it.workSec! : setDurationSec(ex, it.repTarget?.[1] ?? 10), timed,
              reps: it.reps, repTarget: it.repTarget, setNumber: s, totalSets: sets, rpe: it.rpe, note: it.note, group: it.group, blockId: b.id,
            });
            if (k < unit.length - 1) {
              steps.push({ id: id(), kind: 'transition', label: `Straight to ${getExercise(unit[k + 1].exerciseId).name}`, durationSec: SUPERSET_MOVE_SEC, timed: true, blockId: b.id });
            }
          });
          const last = s === sets && ui === units.length - 1;
          if (!last) {
            const rest = unit[unit.length - 1].restSec;
            steps.push({ id: id(), kind: 'rest', label: s === sets ? 'Rest & set up next' : unit.length > 1 ? `Rest — then round ${s + 1}` : 'Rest', durationSec: s === sets ? Math.max(rest, STRENGTH_TRANSITION_SEC) : rest, timed: true, blockId: b.id });
          }
        }
      });
    } else if (b.kind === 'circuit') {
      const rounds = b.rounds ?? 1;
      for (let r = 1; r <= rounds; r++) {
        b.items.forEach((it, idx) => {
          const ex = getExercise(it.exerciseId);
          steps.push({ id: id(), kind: 'station', exerciseId: ex.id, label: `Station ${idx + 1}: ${ex.name}`, durationSec: it.workSec ?? 40, timed: true, round: r, totalRounds: rounds, rpe: it.rpe, note: it.note, reps: '8–12 controlled', blockId: b.id });
          if (idx < b.items.length - 1) steps.push({ id: id(), kind: 'transition', label: 'Move to next station', durationSec: it.restSec, timed: true, round: r, totalRounds: rounds, blockId: b.id });
        });
        if (r < rounds) steps.push({ id: id(), kind: 'rest', label: `Round ${r} complete — recover`, durationSec: b.restBetweenRoundsSec ?? 60, timed: true, blockId: b.id });
      }
    } else if (b.kind === 'intervals') {
      const it = b.items[0];
      const ex = getExercise(it.exerciseId);
      const rounds = b.rounds ?? 1;
      for (let r = 1; r <= rounds; r++) {
        steps.push({ id: id(), kind: 'interval-work', exerciseId: ex.id, label: `${ex.name} — WORK`, durationSec: it.workSec ?? 30, timed: true, round: r, totalRounds: rounds, rpe: it.rpe, note: it.note, blockId: b.id });
        steps.push({ id: id(), kind: 'interval-rest', exerciseId: ex.id, label: `${ex.name} — EASY`, durationSec: it.restSec, timed: true, round: r, totalRounds: rounds, rpe: '2–3', blockId: b.id });
      }
    } else if (b.kind === 'rounds') {
      b.items.forEach((it, idx) => {
        const ex = getExercise(it.exerciseId);
        steps.push({ id: id(), kind: 'interval-work', exerciseId: ex.id, label: `Round ${idx + 1}: ${ex.name}`, durationSec: it.workSec ?? 120, timed: true, round: idx + 1, totalRounds: b.items.length, rpe: it.rpe, note: it.note, drill: it.drill, blockId: b.id });
        if (idx < b.items.length - 1) steps.push({ id: id(), kind: 'rest', label: 'Rest between rounds', durationSec: it.restSec, timed: true, blockId: b.id });
      });
    } else if (b.kind === 'steady') {
      const it = b.items[0];
      const ex = getExercise(it.exerciseId);
      steps.push({ id: id(), kind: 'cardio', exerciseId: ex.id, label: `${ex.name} — steady`, durationSec: it.workSec ?? 300, timed: true, rpe: it.rpe, note: it.note, blockId: b.id });
    }
  }
  return steps;
}

export function estimateSec(steps: Step[]): number {
  return steps.reduce((t, s) => t + s.durationSec, 0);
}

// ───────── main entry ─────────

/** Shortest session that fits a full push (3/3/3) or pull (3/3) day. */
export const SPLIT_MIN_DURATION: Duration = 45;

export function generateWorkout(requested: WorkoutParams, gen: GenContext): GenerateResult {
  const now = gen.now ?? new Date();
  // Push/pull days always get the full exercise count: lifting only, at least 45 minutes.
  const splitNotes: string[] = [];
  let params = requested;
  if (requested.bodyParts?.length && requested.style !== 'strength' && requested.style !== 'strength-cond') {
    params = { ...params, bodyParts: undefined };
    splitNotes.push('Body-part selection applies to strength workouts, so it was ignored for this style.');
  } else if (requested.bodyParts?.length) {
    const total = customGroups(requested.bodyParts).reduce((t, g) => t + g.slots.length, 0);
    const need: Duration = total >= 10 ? 60 : total >= 6 ? 45 : total >= 4 ? 30 : 20;
    const names = BODY_PART_ORDER.filter((b) => requested.bodyParts!.includes(b)).map((b) => BODY_PART_LABEL[b]).join(', ');
    if (requested.style === 'strength-cond') splitNotes.push(`Body-part workouts are lifting only so every ${names} exercise fits. Conditioning was left out; an easy optional finisher is added when time allows.`);
    if (requested.duration < need) splitNotes.push(`${total} exercises (${names}) take about ${need} minutes, so this mission is set to ${need} minutes instead of ${requested.duration}.`);
    params = { ...requested, style: 'strength', duration: Math.max(requested.duration, need) as Duration };
  } else if ((requested.focus === 'push' || requested.focus === 'pull') && (requested.style === 'strength' || requested.style === 'strength-cond')) {
    const full = requested.focus === 'push' ? '3 chest, 3 shoulder and 3 triceps' : '3 back and 3 biceps';
    if (requested.style === 'strength-cond') splitNotes.push(`${requested.focus === 'push' ? 'Push' : 'Pull'} day is lifting only so all ${full} exercises fit. Conditioning was left out; an easy optional finisher is added when time allows.`);
    if (requested.duration < SPLIT_MIN_DURATION) splitNotes.push(`A full ${requested.focus} day (${full} exercises) takes about ${SPLIT_MIN_DURATION} minutes, so this mission is set to ${SPLIT_MIN_DURATION} minutes instead of ${requested.duration}.`);
    params = { ...requested, style: 'strength', duration: Math.max(requested.duration, SPLIT_MIN_DURATION) as Duration };
  }
  const ctx = contextFrom(gen.profile, params.inventory, params.readiness);
  const cap = effortCap(gen.profile, now);
  const rand = mulberry32(params.seed);
  const out: BuildOut = { blocks: [], removed: [], warnings: [], patterns: new Set(), cardio: null, hard: false };
  const st: PickState = { used: new Set(), rand, ctx, params, gen, recentIds: recentIds(gen.sessions, 2), recentMuscles: recentMuscles(gen.sessions, now) };
  const low = lowReadiness(params);

  out.warnings.push(...splitNotes);
  if (!cap.vigorousAllowed) out.warnings.push(cap.reason);
  if (low) out.warnings.push('Low energy or high soreness reported — volume and effort are reduced today. A recovery session is also a good choice.');
  if (params.readiness.discomfort.length) out.warnings.push(`Today you flagged discomfort in your ${params.readiness.discomfort.map((d) => LIMITATION_LABEL[d]).join(', ')}. Movements that load those areas are excluded.`);

  const total = params.duration * 60;
  const warm = WARMUP_MIN[params.duration] * 60;
  const cool = COOLDOWN_MIN[params.duration] * 60;
  const mainBudget = total - warm - cool;

  const lastHard = recentHardSession(gen.sessions, now);
  const recentOverlap = [...st.recentMuscles].length > 0;

  let style = params.style;
  let cardio: Exercise | null = null;
  const needsCardio = style === 'hiit' || style === 'strength-cond' || style === 'recovery' || style === 'steady';
  if (needsCardio) {
    cardio = pickCardio(params, ctx);
    if (!cardio && (style === 'hiit' || style === 'steady')) {
      return { ok: false, error: 'No suitable cardio option for intervals.', details: ['Select a cardio machine (bike, elliptical, rower or treadmill), or allow a low-impact bodyweight option by clearing foot discomfort for today.', 'Mission Fit will not substitute a high-impact movement to fill the gap.'] };
    }
  }
  out.cardio = cardio;

  // Recovery-aware: no hard intervals on consecutive days unless explicitly overridden.
  const hardWanted = style === 'hiit' || style === 'strength-cond' || style === 'boxing';
  const forceModerate = hardWanted && ((!!lastHard && !params.overrideRecovery) || low);
  if (hardWanted && lastHard && !params.overrideRecovery) {
    out.warnings.push(`You did a hard session (${lastHard.name}) within the last 36 hours. Intervals are switched to moderate effort today. You can override this if you feel fully recovered.`);
  }

  let mainUsed = 0;
  if (style === 'strength') {
    mainUsed = buildStrength(mainBudget, st, cap.maxRpe, out, params.includeCarries && params.focus !== 'core');
  } else if (style === 'circuit') {
    mainUsed = buildCircuit(mainBudget, st, cap.maxRpe, out);
  } else if (style === 'hiit') {
    mainUsed = buildIntervals(mainBudget, st, cap, out, cardio!, forceModerate);
    if (!mainUsed) mainUsed = buildSteady(mainBudget, st, out, cardio!, '5–6', 'Steady Cardio');
  } else if (style === 'strength-cond') {
    const share = params.goal === 'cardio' ? 0.45 : params.goal === 'strength' || params.goal === 'muscle' ? 0.65 : 0.55;
    const noMachineCardio = !!cardio && !(equipOptionFor(cardio, params.inventory) ?? []).some((e) => ['bike', 'elliptical', 'treadmill', 'rower'].includes(e));
    // Too short for a loaded conditioning circuit and no cardio machine: give all the time to lifting.
    const sBudget = ctx.requireLoad && noMachineCardio && mainBudget * (1 - share) < 300 ? mainBudget : Math.floor(mainBudget * share);
    const sUsed = buildStrength(sBudget, st, cap.maxRpe, out, params.includeCarries && params.focus !== 'core' && sBudget >= 1200, undefined, 0.75);
    const condBudget = mainBudget - sUsed;
    let cUsed = 0;
    if (ctx.requireLoad && noMachineCardio && condBudget < 300) {
      // nothing loaded fits; the time already went to lifting
    } else if (ctx.requireLoad && noMachineCardio) {
      cUsed = buildCircuit(condBudget, st, cap.maxRpe, out);
      const c = out.blocks.find((b) => b.id === 'circuit');
      if (c) { c.title = `Conditioning — Loaded ${c.title.replace('Station ', '')}`; c.kind = 'circuit'; }
    }
    if (cUsed || (ctx.requireLoad && noMachineCardio)) {
      // loaded conditioning circuit built above (or skipped — no bodyweight filler)
    } else if (cardio) {
      if (cap.vigorousAllowed && !forceModerate && params.goal !== 'strength' && condBudget >= 360) {
        cUsed = buildIntervals(condBudget, st, cap, out, cardio, false);
      }
      if (!cUsed) cUsed = buildSteady(condBudget, st, out, cardio, capRpe([5, 6], cap.maxRpe), 'Conditioning — steady');
    } else {
      out.removed.push({ reason: 'Conditioning block removed: no compatible cardio option (machine or low-impact bodyweight) with today’s selections.' });
    }
    mainUsed = sUsed + cUsed;
  } else if (style === 'boxing') {
    const finBudget = mainBudget >= 1500 ? Math.min(800, Math.floor(mainBudget * 0.3)) : 0;
    const bUsed = buildBoxing(mainBudget - finBudget, st, cap, out, forceModerate);
    let fUsed = 0;
    if (bUsed && finBudget) {
      fUsed = buildStrength(mainBudget - bUsed, st, cap.maxRpe, out, false, [S('core', 'anti-rotation'), S('core', 'core'), S('core', 'core')]);
      const fb = out.blocks.find((b) => b.id === 'strength');
      if (fb) { fb.id = 'core-finisher'; fb.title = 'Core Finisher (weighted)'; fb.description = 'Rotation and bracing strength that carries straight into your punches. 3–4 sets of 8–12, controlled.'; }
    }
    mainUsed = bUsed + fUsed;
  } else if (style === 'steady') {
    mainUsed = buildSteady(mainBudget, st, out, cardio!, capRpe([4, 5], cap.maxRpe), 'Steady Cardio');
  } else {
    // recovery
    const flow = ['standing-cat-camel', 'hip-circles', 'thoracic-open-book', 'glute-bridge', 'dead-bug', 'bird-dog', 'wall-slides', 'leg-swings'].filter((id) => checkExercise(getExercise(id), { ...ctx, requireLoad: false }).ok);
    const mobSec = Math.min(mainBudget * 0.5, flow.length * 45 * 2);
    const mobItems: BlockItem[] = [];
    let t = 0;
    for (let r = 0; r < 2 && t < mobSec; r++) for (const id of flow) { if (t + 45 > mobSec) break; mobItems.push({ exerciseId: id, workSec: 45, restSec: 0, rpe: '2–3' }); t += 45; }
    if (mobItems.length) out.blocks.push({ id: 'mobility', title: 'Mobility Flow', kind: 'recovery', description: 'Slow, comfortable range. Breathe through every movement.', items: mobItems });
    flow.forEach((id) => out.patterns.add(getExercise(id).pattern));
    let c = 0;
    if (cardio) c = buildSteady(mainBudget - t, st, out, cardio, '3–4', 'Easy Aerobic Flush');
    mainUsed = t + c;
  }

  // Fill meaningful leftover time with an easy, optional aerobic finisher instead of padding lifts.
  const leftover = mainBudget - mainUsed;
  if (mainUsed > 0 && leftover >= 150 && (style === 'strength' || style === 'circuit')) {
    const fin = pickCardio(params, ctx);
    const bodyweightFin = !!fin && !(equipOptionFor(fin, params.inventory) ?? []).some((e) => ['bike', 'elliptical', 'treadmill', 'rower'].includes(e));
    if (fin && !(ctx.requireLoad && bodyweightFin)) mainUsed += buildSteady(leftover - 30, st, out, fin, '3–4', 'Easy Aerobic Finisher (optional)');
  }

  const mainBlocks = out.blocks.length;
  if (!mainBlocks || mainUsed === 0) {
    const details = out.removed.map((r) => r.reason);
    if (!details.length) details.push('The selected time is too short for this style with your equipment.');
    details.push('Try adding equipment, choosing a different focus or style, or clearing today’s discomfort flags. Restrictions are never loosened automatically.');
    return { ok: false, error: `Mission Fit could not build a safe ${STYLE_LABEL[style].toLowerCase()} for this combination.`, details };
  }

  if (recentOverlap) {
    const focusMuscles = new Set(out.blocks.flatMap((b) => b.items.flatMap((i) => getExercise(i.exerciseId).muscles)));
    const overlap = [...st.recentMuscles].filter((m) => focusMuscles.has(m) && !['core'].includes(m));
    if (overlap.length >= 3 && style !== 'recovery') out.warnings.push(`You trained ${overlap.slice(0, 3).join(', ')} within the last day. Exercises were chosen to spread the load; consider a different focus if you are still sore.`);
  }

  if (cardio) out.patterns.add('cardio');
  const easyCtx = { ...ctx, requireLoad: false };
  const warmGeneral = style === 'boxing' && checkExercise(getExercise('shadow-boxing'), easyCtx).ok ? getExercise('shadow-boxing') : cardio;
  const warmItems = buildWarmup(warm, out.patterns, warmGeneral, easyCtx, style);
  const coolItems = buildCooldown(cool + Math.min(240, Math.max(0, Math.floor((mainBudget - mainUsed) / 30) * 30 - 60)), out.patterns, !!cardio || style === 'circuit' || style === 'boxing', easyCtx);
  const blocks: Block[] = [
    { id: 'warmup', title: 'Warm-Up', kind: 'warmup', description: 'Raise temperature gradually and rehearse today’s movements.', items: warmItems },
    ...out.blocks,
    { id: 'cooldown', title: 'Cool-Down', kind: 'cooldown', description: 'Bring breathing and heart rate down gradually. Do not stop abruptly.', items: coolItems },
  ];
  const steps = blocksToSteps(blocks);
  const estimatedSec = estimateSec(steps);

  const name = `${STYLE_PREFIX[style]} ${MISSION_NOUNS[Math.floor(rand() * MISSION_NOUNS.length)]}`;
  const objective = buildObjective(style, out, blocks);
  const fit = `${GOAL_FIT[params.goal]} ${styleFit(style, params.goal)}`;

  const workout: Workout = {
    id: `w-${now.getTime()}-${params.seed}`,
    createdAt: now.toISOString(),
    name,
    objective,
    params: { ...params, style },
    blocks,
    steps,
    estimatedSec,
    fitExplanation: fit,
    typeExplanation: TYPE_EXPLANATION[style],
    warnings: out.warnings,
    removed: out.removed,
    hardSession: out.hard,
  };
  return { ok: true, workout };
}

function buildObjective(style: Style, out: BuildOut, blocks: Block[]): string {
  const strength = blocks.find((b) => b.kind === 'strength');
  const circuit = blocks.find((b) => b.kind === 'circuit');
  const intervals = blocks.find((b) => b.kind === 'intervals');
  const totalSets = strength?.items.reduce((t, i) => t + (i.sets ?? 0), 0) ?? 0;
  switch (style) {
    case 'strength':
      return `Complete ${strength?.items.length ?? 0} lifts, ${totalSets} quality sets. Success = clean reps, 2–3 in reserve, steady breathing on every rep.`;
    case 'circuit':
      return `Complete ${circuit?.rounds ?? 0} rounds of ${circuit?.items.length ?? 0} timed stations. Success = the last round looks as clean as the first.`;
    case 'hiit':
      return intervals
        ? `Complete ${out.intervalSummary}. Success = finishing every bout able to repeat it — controlled, not all-out.`
        : 'Complete the steady cardio at a conversational effort.';
    case 'boxing': {
      const r = blocks.find((b) => b.kind === 'rounds');
      return `Complete ${r?.items.length ?? 0} rounds. Success = hands back to guard after every combo, sharp technique in the last round, and steady breathing throughout.`;
    }
    case 'steady':
      return 'Hold one steady, conversational effort the whole way. Success = even pace, relaxed breathing.';
    case 'strength-cond':
      return `Lifts first (${totalSets} quality sets), then conditioning${intervals ? ` (${out.intervalSummary})` : ' at a steady effort'}. Success = technique holds throughout.`;
    default:
      return 'Move well, breathe easy, and leave fresher than you arrived.';
  }
}

function styleFit(style: Style, goal: Goal): string {
  if (style === 'hiit') return goal === 'muscle' || goal === 'strength' ? 'Intervals support heart health and work capacity; keep them to 1–2 per week alongside your lifting.' : 'Intervals are one or two of your weekly cardio sessions — the rest should be easier.';
  if (style === 'circuit') return 'Circuits add muscular endurance and activity in a short time window.';
  if (style === 'strength') return 'Main lifts repeat across weeks so you can see progress.';
  if (style === 'boxing') return 'Boxing rounds count as interval conditioning (cardio minutes) — treat them as one of your 1–2 harder sessions per week.';
  if (style === 'steady') return 'Steady cardio builds your aerobic base and counts fully toward weekly cardio minutes.';
  if (style === 'strength-cond') return 'Lifting first protects technique and lets you progress the main lifts.';
  return 'Recovery days help you train consistently — the biggest driver of long-term results.';
}

// ───────── Surprise Me & variants ─────────

export function surpriseParams(base: WorkoutParams, gen: GenContext, seed: number): WorkoutParams {
  const r = mulberry32(seed);
  const now = gen.now ?? new Date();
  const hard = recentHardSession(gen.sessions, now);
  const low = lowReadiness(base);
  const cap = effortCap(gen.profile, now);
  let styles: Style[] = ['circuit', 'strength', 'strength-cond', 'hiit', 'steady', 'boxing'];
  if (hard || low || !cap.vigorousAllowed) styles = styles.filter((s) => s !== 'hiit' && s !== 'boxing');
  if (low) styles = ['recovery', 'steady'];
  const muscles = recentMuscles(gen.sessions, now);
  const lowerTired = ['quads', 'glutes', 'hamstrings'].some((m) => muscles.has(m));
  const upperTired = ['chest', 'lats', 'upper-back', 'shoulders'].some((m) => muscles.has(m));
  let focuses: Focus[] = ['full', 'upper', 'lower', 'push', 'pull', 'core'];
  if (lowerTired) focuses = focuses.filter((f) => f !== 'lower' && f !== 'full');
  if (upperTired) focuses = focuses.filter((f) => !['upper', 'push', 'pull', 'full'].includes(f));
  if (!focuses.length) focuses = ['core'];
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  return { ...base, style: pick(styles), focus: pick(focuses), seed, overrideRecovery: false, intervals: undefined, bodyParts: undefined };
}

/** "Different version": same goal, equipment, restrictions and recovery logic; main lifts kept, accessories rotated. */
export function differentVersion(w: Workout, gen: GenContext): GenerateResult {
  const accessories = w.blocks.flatMap((b) => b.items.map((i) => i.exerciseId)).filter((id) => !getExercise(id).main);
  return generateWorkout({ ...w.params, seed: w.params.seed + 7919, avoidIds: accessories }, gen);
}

export function workoutMuscles(w: Workout): string[] {
  const set = new Set<string>();
  for (const b of w.blocks) if (b.kind !== 'warmup' && b.kind !== 'cooldown') for (const i of b.items) getExercise(i.exerciseId).muscles.forEach((m) => set.add(m));
  return [...set];
}

export type { Limitation };


/**
 * Swap (or remove) an exercise in a generated workout before it starts. The replacement keeps
 * the slot's sets, rest, effort and superset group; guidance and load suggestions are rebuilt.
 * Callers must only pass exercises that passed checkExercise for this profile.
 */
export function swapExercise(w: Workout, fromId: string, toId: string | null, gen: GenContext): Workout {
  const ctx = contextFrom(gen.profile, w.params.inventory, w.params.readiness);
  const st: PickState = { used: new Set(), rand: mulberry32(w.params.seed), ctx, params: w.params, gen, recentIds: new Set(), recentMuscles: new Set() };
  const cap = effortCap(gen.profile, gen.now ?? new Date());
  const blocks: Block[] = w.blocks.map((b) => {
    if (!b.items.some((i) => i.exerciseId === fromId)) return b;
    if (!toId) {
      const items = b.items.filter((i) => i.exerciseId !== fromId);
      return { ...b, items };
    }
    const to = getExercise(toId);
    const items = b.items.map((it) => {
      if (it.exerciseId !== fromId) return it;
      if (b.kind === 'strength' || b.kind === 'core' || b.kind === 'carry') {
        const fresh = strengthItem(to, { sets: it.sets ?? 3, reps: [...REP_RANGE] as [number, number], rest: it.restSec, rpe: [6, 7] }, st, cap.maxRpe, false);
        return { ...fresh, sets: it.sets, restSec: it.restSec, rpe: it.rpe, group: it.group, rampUp: false };
      }
      return { ...it, exerciseId: to.id, note: cautionNote(to, ctx) };
    });
    return { ...b, items };
  }).filter((b) => b.items.length > 0);
  // Re-letter superset groups whose partner was removed.
  for (const b of blocks) {
    const counts = new Map<string, number>();
    for (const it of b.items) if (it.group) counts.set(it.group[0], (counts.get(it.group[0]) ?? 0) + 1);
    for (const it of b.items) if (it.group && (counts.get(it.group[0]) ?? 0) < 2) it.group = undefined;
  }
  const steps = blocksToSteps(blocks);
  return { ...w, blocks, steps, estimatedSec: estimateSec(steps) };
}
