import type { Equip, Exercise, Inventory, Limitation, Profile, Readiness } from '../types';

export const LIMITATION_LABEL: Record<Limitation, string> = {
  wrist: 'wrists',
  lowBack: 'lower back',
  knee: 'knees',
  foot: 'feet',
  shoulder: 'shoulders',
  hypertension: 'blood pressure',
};

export interface FilterContext {
  inventory: Inventory;
  /** Limitations confirmed active in profile. */
  active: Limitation[];
  /** Areas reported as uncomfortable today; stricter (cautions become exclusions). */
  discomfort: Limitation[];
  allowHighImpact: boolean;
  allowBallistic: boolean;
  avoidList: string[];
  preferNeutralGrip: boolean;
  /** Main work must use external load (weights, cables, machines). Warm-up, cool-down and cardio are exempt. */
  requireLoad: boolean;
}

export interface FilterResult {
  ok: boolean;
  reasons: string[];
  cautions: { area: Limitation; text: string }[];
}

export function contextFrom(profile: Profile, inventory: Inventory, readiness?: Readiness): FilterContext {
  return {
    inventory,
    active: (Object.keys(profile.limitations) as Limitation[]).filter((k) => profile.limitations[k]),
    discomfort: readiness?.discomfort ?? [],
    allowHighImpact: profile.allowHighImpact,
    allowBallistic: profile.allowBallistic,
    avoidList: profile.avoidList,
    preferNeutralGrip: profile.preferNeutralGrip,
    requireLoad: profile.loadedMain ?? true,
  };
}

const LOADED: Equip[] = ['dumbbell', 'kettlebell', 'cable'];
export function isLoadEquip(e: Equip): boolean {
  return LOADED.includes(e) || e.startsWith('machine-');
}
/** Kinds that may stay bodyweight even when weighted main work is required. */
export const LOAD_EXEMPT_KINDS = ['warmup', 'mobility', 'cardio'];

export function hasEquip(item: Equip, inv: Inventory): boolean {
  switch (item) {
    case 'none':
      return true;
    case 'dumbbell':
      return inv.dumbbell && inv.dumbbellWeights.length > 0;
    case 'kettlebell':
      return inv.kettlebell && inv.kettlebellWeights.length > 0;
    case 'cable':
      return inv.cable;
    case 'bench':
      return inv.bench;
    case 'heavy-bag':
      return !!inv.heavyBag;
    case 'bike':
    case 'elliptical':
    case 'treadmill':
    case 'rower':
      return inv.cardio.includes(item);
    default:
      return inv.machines.includes(item);
  }
}

/** Which equipment option (if any) is satisfied. */
export function equipOptionFor(ex: Exercise, inv: Inventory): Equip[] | null {
  // Prefer a loaded option (e.g. dumbbell split squat over bodyweight) whenever the equipment is there.
  const ordered = [...ex.equipOptions].sort((a, b) => Number(b.some(isLoadEquip)) - Number(a.some(isLoadEquip)));
  for (const opt of ordered) if (opt.every((e) => hasEquip(e, inv))) return opt;
  return null;
}

export function isLoadedFor(ex: Exercise, inv: Inventory): boolean {
  return !!equipOptionFor(ex, inv)?.some(isLoadEquip);
}

/**
 * The single gatekeeper used by the generator, substitutions, Surprise Me and the library.
 * Nothing bypasses this check.
 */
export function checkExercise(ex: Exercise, ctx: FilterContext): FilterResult {
  const reasons: string[] = [];
  const cautions: { area: Limitation; text: string }[] = [];

  const opt = equipOptionFor(ex, ctx.inventory);
  if (!opt) reasons.push('Equipment not available');
  else if (ctx.requireLoad && !LOAD_EXEMPT_KINDS.includes(ex.kind) && !opt.some(isLoadEquip)) {
    reasons.push('Bodyweight only — weighted main work is on (Profile)');
  }
  if (ctx.avoidList.includes(ex.id)) reasons.push('On your avoid list');
  if (ex.impact === 'high' && !ctx.allowHighImpact) reasons.push('High-impact movements are off (Profile → Permissions)');
  if (ex.ballistic && !ctx.allowBallistic) reasons.push('Ballistic kettlebell work is off (Profile → Permissions)');

  const all = new Set<Limitation>([...ctx.active, ...ctx.discomfort]);
  for (const area of all) {
    const rule = ex.limits[area];
    if (!rule) continue;
    const today = ctx.discomfort.includes(area);
    if (rule === 'avoid') {
      reasons.push(`Not suitable with ${LIMITATION_LABEL[area]} limitation`);
    } else if (today) {
      reasons.push(`Loads your ${LIMITATION_LABEL[area]}, which you flagged today`);
    } else {
      cautions.push({ area, text: ex.modifications?.[area] ?? 'Use a lighter load and a comfortable range.' });
    }
  }

  if (ctx.preferNeutralGrip && all.has('wrist') && (ex.grip === 'supinated' || ex.grip === 'pronated')) {
    reasons.push('Non-neutral grip (neutral grips preferred for wrists)');
  }

  return { ok: reasons.length === 0, reasons, cautions };
}

export function allowedExercises(list: Exercise[], ctx: FilterContext): Exercise[] {
  return list.filter((e) => checkExercise(e, ctx).ok);
}
