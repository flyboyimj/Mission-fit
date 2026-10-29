import { EXERCISES, getExercise } from '../data/exercises';
import type { Exercise, Limitation } from '../types';
import { checkExercise, type FilterContext, LIMITATION_LABEL } from './filter';

/** 'choose' = the user just wants to pick a different exercise themselves. */
export type SubReason = 'choose' | 'busy' | 'dislike' | 'hurts';

export interface SubOption { exercise: Exercise; why: string }
export interface SubResult {
  /** Best matches (top 3). */
  options: SubOption[];
  /** Every other exercise that fits the same slot and passes your restrictions. */
  more: SubOption[];
  /** When empty, the movement is removed and this explains why. */
  removalReason?: string;
  safety?: string;
}

export const PAIN_SAFETY =
  'Stop this movement now — do not train through pain. If the pain is sharp, keeps building, or comes with chest pain, dizziness or unusual breathlessness, end the session and get checked.';

/**
 * Substitutes preserve the training purpose (same movement pattern, overlapping muscles)
 * and pass the same restriction filter as the generator.
 */
export function findSubstitutes(
  exerciseId: string,
  reason: SubReason,
  ctx: FilterContext,
  opts: { excludeIds?: string[]; hurtArea?: Limitation | 'other' } = {},
): SubResult {
  const orig = getExercise(exerciseId);
  const exclude = new Set([exerciseId, ...(opts.excludeIds ?? [])]);
  let effective = ctx;
  if (reason === 'hurts' && opts.hurtArea && opts.hurtArea !== 'other') {
    // Treat the painful area as flagged today: cautions on that area become exclusions.
    effective = { ...ctx, discomfort: [...new Set([...ctx.discomfort, opts.hurtArea])] };
  }

  const origOpt = new Set(orig.equipOptions.flat());
  const cands = EXERCISES.filter((e) => {
    if (exclude.has(e.id)) return false;
    if (e.kind === 'warmup' || e.kind === 'mobility') return false;
    if (e.pattern !== orig.pattern) return false;
    if (orig.pattern !== 'cardio' && orig.pattern !== 'core' && orig.muscles.length && !e.muscles.some((m) => orig.muscles.includes(m))) return false;
    if (reason === 'hurts' && opts.hurtArea === 'other') {
      // Unknown area: only offer options that avoid every muscle the painful movement used most.
      if (e.muscles[0] === orig.muscles[0]) return false;
    }
    return checkExercise(e, effective).ok;
  });

  const scored = cands
    .map((e) => {
      let s = 0;
      const shared = e.muscles.filter((m) => orig.muscles.includes(m)).length;
      s += shared * 2;
      if (e.main === orig.main) s += 1;
      if (reason === 'busy') {
        const differentEquip = !e.equipOptions.flat().some((x) => origOpt.has(x) && x !== 'none' && x !== 'bench');
        s += differentEquip ? 4 : -4;
      }
      if (reason === 'hurts') s += e.tags?.includes('supported') || e.tags?.includes('reduced-range') ? 2 : 0;
      s -= checkExercise(e, effective).cautions.length;
      return { e, s, shared };
    })
    .sort((a, b) => b.s - a.s);

  const all = scored.map(({ e, shared }) => ({
    exercise: e,
    why: whyText(orig, e, reason, shared, effective),
  }));
  const options = all.slice(0, 3);

  const result: SubResult = { options, more: all.slice(3) };
  if (reason === 'hurts') result.safety = PAIN_SAFETY;
  if (!options.length && reason !== 'choose') {
    result.removalReason =
      reason === 'hurts'
        ? `No alternative for "${orig.name}" avoids loading your ${opts.hurtArea && opts.hurtArea !== 'other' ? LIMITATION_LABEL[opts.hurtArea] : 'painful area'} while keeping the same purpose. It has been removed — skipping it is the right call.`
        : `No other ${orig.pattern.replace('-', ' ')} exercise fits your equipment and restrictions, so this movement is removed rather than forcing an unsuitable replacement.`;
  }
  return result;
}

function whyText(orig: Exercise, e: Exercise, reason: SubReason, shared: number, ctx: FilterContext): string {
  const parts: string[] = [];
  parts.push(shared ? `Same pattern, trains ${e.muscles.filter((m) => orig.muscles.includes(m)).join(', ')}` : 'Same movement pattern');
  if (reason === 'busy') parts.push(`uses ${e.equipOptions.map((o) => o.filter((x) => x !== 'none').join(' + ') || 'bodyweight').join(' or ')}`);
  const c = checkExercise(e, ctx).cautions;
  if (c.length) parts.push(`modify: ${c[0].text}`);
  return parts.join(' · ');
}

/**
 * Every exercise you could pick by hand for main work: passes the same restriction filter
 * (equipment, limitations, today's discomfort, avoid list, impact/ballistic, weighted-work rule).
 */
export function browseExercises(ctx: FilterContext, opts: { excludeIds?: string[]; hurtArea?: Limitation | 'other'; query?: string } = {}): SubOption[] {
  const exclude = new Set(opts.excludeIds ?? []);
  const effective = opts.hurtArea && opts.hurtArea !== 'other' ? { ...ctx, discomfort: [...new Set([...ctx.discomfort, opts.hurtArea])] } : ctx;
  const q = (opts.query ?? '').trim().toLowerCase();
  return EXERCISES.filter((e) => {
    if (exclude.has(e.id) || e.kind === 'warmup' || e.kind === 'mobility') return false;
    if (q && !`${e.name} ${e.muscles.join(' ')} ${e.pattern}`.toLowerCase().includes(q)) return false;
    return checkExercise(e, effective).ok;
  })
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => {
      const c = checkExercise(e, effective).cautions;
      return { exercise: e, why: [e.muscles.slice(0, 3).join(', '), c.length ? `modify: ${c[0].text}` : ''].filter(Boolean).join(' · ') };
    });
}

// ───────── complete search (allowed + unavailable with reasons) ─────────

/** Words people use, mapped onto patterns/muscles/equipment. */
const PATTERN_WORDS: Record<string, string> = {
  squat: 'squat legs quads lower', hinge: 'hinge deadlift legs hamstrings glutes lower posterior', lunge: 'lunge single-leg split legs quads glutes lower',
  'h-push': 'press push chest pecs pec bench', 'v-push': 'press push overhead shoulders delts military', 'h-pull': 'row pull back upper-back rear delts',
  'v-pull': 'pulldown pull back lats lat', arms: 'arms arm', calves: 'calves calf legs lower', 'shoulder-iso': 'raise shoulders delts delt',
  core: 'core abs ab abdominals obliques trunk', carry: 'carry march grip core', cardio: 'cardio conditioning', mobility: 'mobility stretch',
};
const MUSCLE_WORDS: Record<string, string> = {
  chest: 'chest pecs pec', triceps: 'triceps tricep tris arms', biceps: 'biceps bicep bis arms curl', forearms: 'forearms grip arms',
  lats: 'lats lat back', 'upper-back': 'upper back traps back', 'rear-delts': 'rear delts delts shoulders back', shoulders: 'shoulders delts delt',
  quads: 'quads quadriceps thighs legs', hamstrings: 'hamstrings hams legs', glutes: 'glutes glute butt hips legs', calves: 'calves calf legs',
  core: 'core abs ab abdominals', obliques: 'obliques abs core', adductors: 'adductors inner thigh legs', hips: 'hips',
};
const EQUIP_WORDS: Record<string, string> = {
  dumbbell: 'dumbbell dumbbells db', kettlebell: 'kettlebell kettlebells kb', cable: 'cable cables pulley rope', bench: 'bench',
  'heavy-bag': 'bag heavy bag boxing', none: 'bodyweight body weight', bike: 'bike', elliptical: 'elliptical', treadmill: 'treadmill', rower: 'rower rowing',
  'machine-smith': 'smith machine', 'machine-rear-delt': 'pec deck machine fly', 'machine-leg-press': 'leg press machine', 'machine-chest-press': 'chest press machine',
  'machine-lat-pulldown': 'lat pulldown machine', 'machine-seated-row': 'seated row machine', 'machine-leg-curl': 'leg curl machine',
  'machine-leg-extension': 'leg extension machine', 'machine-shoulder-press': 'shoulder press machine', 'machine-hip-abduction': 'hip abduction machine',
};

export function searchText(ex: Exercise): string {
  return [
    ex.name, ex.pattern, PATTERN_WORDS[ex.pattern] ?? '', ...ex.muscles.map((m) => `${m} ${MUSCLE_WORDS[m] ?? ''}`),
    ...ex.equipOptions.flat().map((e) => EQUIP_WORDS[e] ?? e), ...(ex.tags ?? []), ex.grip ?? '',
  ].join(' ').toLowerCase().replace(/[-–—()]/g, ' ');
}

/** Every word of the query must appear (so "cable chest" finds cable chest exercises). */
export function matchesQuery(ex: Exercise, query: string): boolean {
  const words = query.toLowerCase().replace(/[-–—()]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = searchText(ex);
  return words.every((w) => hay.includes(w) || (w.endsWith('s') && hay.includes(w.slice(0, -1))));
}

export interface SearchHit extends SubOption { allowed: boolean; reasons: string[] }

/**
 * Searches the WHOLE library. Exercises you can pick right now come first; the rest are still
 * listed with the reason they're unavailable (restriction, equipment, today's discomfort, already
 * in this mission) so nothing silently disappears.
 */
export function searchExercises(ctx: FilterContext, opts: { query?: string; excludeIds?: string[]; hurtArea?: Limitation | 'other' } = {}): SearchHit[] {
  const inMission = new Set(opts.excludeIds ?? []);
  const effective = opts.hurtArea && opts.hurtArea !== 'other' ? { ...ctx, discomfort: [...new Set([...ctx.discomfort, opts.hurtArea])] } : ctx;
  return EXERCISES.filter((e) => e.kind !== 'warmup' && e.kind !== 'mobility' && matchesQuery(e, opts.query ?? ''))
    .map((e) => {
      const r = checkExercise(e, effective);
      const reasons = [...(inMission.has(e.id) ? ['Already in this mission'] : []), ...r.reasons];
      const why = [e.muscles.slice(0, 3).join(', '), r.ok && r.cautions.length ? `modify: ${r.cautions[0].text}` : ''].filter(Boolean).join(' · ');
      return { exercise: e, why, allowed: reasons.length === 0, reasons };
    })
    .map((h) => ({ ...h, score: relevance(h.exercise, opts.query ?? '') }))
    .sort((a, b) => Number(b.allowed) - Number(a.allowed) || b.score - a.score || a.exercise.name.localeCompare(b.exercise.name))
    .map(({ score: _score, ...h }) => h);
}

/** Exercises that actually train the searched muscle/pattern rank above ones that only share a word in their name. */
function relevance(ex: Exercise, query: string): number {
  const words = query.toLowerCase().replace(/[-–—()]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const body = [PATTERN_WORDS[ex.pattern] ?? '', ...ex.muscles.map((m) => `${m} ${MUSCLE_WORDS[m] ?? ''}`)].join(' ').toLowerCase();
  const primary = `${ex.muscles[0] ?? ''} ${MUSCLE_WORDS[ex.muscles[0]] ?? ''} ${PATTERN_WORDS[ex.pattern] ?? ''}`.toLowerCase();
  let score = 0;
  for (const w of words) {
    const stem = w.endsWith('s') ? w.slice(0, -1) : w;
    if (primary.includes(w) || primary.includes(stem)) score += 3;
    else if (body.includes(w) || body.includes(stem)) score += 2;
    if (ex.name.toLowerCase().includes(stem)) score += 1;
  }
  return score;
}
