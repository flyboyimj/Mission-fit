import { describe, expect, it } from 'vitest';
import { EXERCISES, getExercise } from '../src/data/exercises';
import { checkExercise, contextFrom, isLoadedFor } from '../src/engine/filter';
import { differentVersion, estimateSec, generateWorkout, surpriseParams, swapExercise } from '../src/engine/generator';
import { clearanceValid, effortCap } from '../src/engine/health';
import { buildPlan, HARD_TYPES, planWarnings, weekOfPlan } from '../src/engine/plan';
import { suggestLoad } from '../src/engine/progression';
import { cardioMinutesFromSteps } from '../src/engine/stats';
import { browseExercises, findSubstitutes, searchExercises } from '../src/engine/substitute';
import * as T from '../src/engine/timer';
import { defaultData, defaultGym, defaultHome, defaultProfile, exportJson, importJson } from '../src/store/storage';
import type { Duration, Focus, Goal, Inventory, Profile, SessionLog, Style, WorkoutParams } from '../src/types';

const NOW = new Date('2026-10-03T10:00:00');

function profile(over: Partial<Profile> = {}): Profile {
  const p = defaultProfile();
  p.onboarded = true;
  p.screening = { heartCondition: false, chestPain: false, dizziness: false, bpUncontrolled: false, otherChronic: false, medsAffectingExercise: false, boneJointWorse: false, physicianSaidSupervised: false };
  p.screeningAt = '2026-10-01T00:00:00Z';
  return { ...p, ...over };
}

function params(over: Partial<WorkoutParams> = {}): WorkoutParams {
  return {
    goal: 'balanced', focus: 'full', style: 'strength', location: 'gym', duration: 45,
    inventory: defaultGym(), readiness: { energy: 4, soreness: 2, discomfort: [] },
    includeCarries: true, seed: 42, ...over,
  };
}

const emptyInv: Inventory = { dumbbell: false, kettlebell: false, cable: false, bench: false, machines: [], cardio: [], dumbbellWeights: [], kettlebellWeights: [] };

describe('exercise library', () => {
  it('has unique ids and complete metadata', () => {
    const ids = new Set(EXERCISES.map((e) => e.id));
    expect(ids.size).toBe(EXERCISES.length);
    for (const e of EXERCISES) {
      expect(e.equipOptions.length).toBeGreaterThan(0);
      expect(e.cues.length).toBeGreaterThan(0);
      expect(e.breathing.length).toBeGreaterThan(0);
      expect(['none', 'low', 'high']).toContain(e.impact);
    }
    expect(EXERCISES.length).toBeGreaterThanOrEqual(60);
  });
});

describe('restriction filter', () => {
  const p = profile();
  const ctx = contextFrom(p, defaultGym());
  it('excludes push-ups, dips and loaded wrist extension by default', () => {
    for (const id of ['push-up', 'bench-dip', 'hand-plank', 'burpee']) expect(checkExercise(getExercise(id), ctx).ok).toBe(false);
  });
  it('excludes high-impact and ballistic by default', () => {
    expect(checkExercise(getExercise('jump-squat'), ctx).ok).toBe(false);
    expect(checkExercise(getExercise('treadmill-run'), ctx).ok).toBe(false);
    expect(checkExercise(getExercise('kb-swing'), ctx).ok).toBe(false);
  });
  it('allows ballistic only after explicit choice AND no conflicting limitation', () => {
    const p2 = profile({ allowBallistic: true });
    expect(checkExercise(getExercise('kb-swing'), contextFrom(p2, defaultGym())).ok).toBe(false); // low back still active
    const p3 = profile({ allowBallistic: true, limitations: { ...p.limitations, lowBack: false } });
    expect(checkExercise(getExercise('kb-swing'), contextFrom(p3, defaultGym())).ok).toBe(true);
  });
  it('respects equipment', () => {
    const c = contextFrom(p, emptyInv);
    expect(checkExercise(getExercise('leg-press'), c).ok).toBe(false);
    // weighted main work is on by default: bodyweight core is excluded from main work…
    expect(checkExercise(getExercise('dead-bug'), c).reasons.join()).toMatch(/Bodyweight only/);
    // …but allowed when the user turns it off
    expect(checkExercise(getExercise('dead-bug'), contextFrom(profile({ loadedMain: false }), emptyInv)).ok).toBe(true);
  });
  it('picks the loaded version of mixed exercises', () => {
    expect(checkExercise(getExercise('reverse-lunge'), ctx).ok).toBe(true);
    expect(checkExercise(getExercise('march-in-place'), ctx).ok).toBe(true); // warm-up exempt
  });
  it('turns cautions into exclusions for areas flagged today', () => {
    const c = contextFrom(p, defaultGym(), { energy: 3, soreness: 2, discomfort: ['knee'] });
    expect(checkExercise(getExercise('goblet-squat'), ctx).ok).toBe(true);
    expect(checkExercise(getExercise('goblet-squat'), c).ok).toBe(false);
  });
  it('prefers neutral grips when wrists are limited', () => {
    expect(checkExercise(getExercise('db-curl'), ctx).ok).toBe(false);
    expect(checkExercise(getExercise('hammer-curl'), ctx).ok).toBe(true);
  });
});

describe('generator', () => {
  const styles: Style[] = ['strength', 'circuit', 'hiit', 'strength-cond', 'steady', 'recovery', 'boxing'];
  const focuses: Focus[] = ['full', 'upper', 'lower', 'push', 'pull', 'core'];
  const durations: Duration[] = [15, 20, 30, 45, 60];
  const goals: Goal[] = ['cardio', 'fatloss', 'muscle', 'strength', 'balanced'];
  const invs: [string, Inventory][] = [['gym', defaultGym()], ['home', defaultHome()]];
  const p = profile();

  it('only uses allowed exercises and fits the time budget across every combination', () => {
    let count = 0;
    let failures = 0;
    for (const style of styles) for (const focus of focuses) for (const duration of durations) for (const [loc, inv] of invs) {
      const goal = goals[(count++) % goals.length];
      const prm = params({ style, focus, duration, goal, inventory: inv, location: loc as 'gym' | 'home', seed: count });
      const r = generateWorkout(prm, { profile: p, sessions: [], now: NOW });
      if (!r.ok) { failures++; expect(r.details.length).toBeGreaterThan(0); continue; }
      const w = r.workout;
      const ctx = contextFrom(p, inv, prm.readiness);
      for (const b of w.blocks) for (const it of b.items) {
        const easy = ['warmup', 'cooldown', 'recovery'].includes(b.kind);
        const res = checkExercise(getExercise(it.exerciseId), easy ? { ...ctx, requireLoad: false } : ctx);
        expect(res.ok, `${it.exerciseId} in ${style}/${focus}/${duration}/${loc}: ${res.reasons.join(',')}`).toBe(true);
        expect(it.rpe).toBeTruthy();
        for (const n of it.rpe.split('–').map(Number)) expect(n).toBeLessThanOrEqual(8);
      }
      expect(w.blocks[0].kind).toBe('warmup');
      expect(w.blocks[w.blocks.length - 1].kind).toBe('cooldown');
      expect(w.estimatedSec).toBe(estimateSec(w.steps));
      const target = w.params.duration * 60; // push/pull days may be extended to 45 min
      expect(w.estimatedSec, `${style}/${focus}/${duration}/${loc} est ${w.estimatedSec}`).toBeLessThanOrEqual(target * 1.1);
      expect(w.estimatedSec, `${style}/${focus}/${duration}/${loc} est ${w.estimatedSec}`).toBeGreaterThanOrEqual(target * 0.75);
    }
    expect(failures).toBeLessThan(10);
  });

  it('puts strength before conditioning in combined sessions', () => {
    const r = generateWorkout(params({ style: 'strength-cond' }), { profile: p, sessions: [], now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const kinds = r.workout.blocks.map((b) => b.kind);
    expect(kinds.indexOf('strength')).toBeLessThan(Math.max(kinds.indexOf('intervals'), kinds.indexOf('steady')));
  });

  it('every strength set has rest and breathing/technique cues available', () => {
    const r = generateWorkout(params({ style: 'strength', goal: 'strength' }), { profile: p, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    const sb = r.workout.blocks.find((b) => b.kind === 'strength')!;
    for (const it of sb.items) {
      expect(it.restSec).toBeGreaterThanOrEqual(45);
      expect(getExercise(it.exerciseId).breathing).toMatch(/breath|Exhale|Breathe/i);
    }
  });

  it('explains instead of silently loosening restrictions', () => {
    const r = generateWorkout(params({ style: 'strength', focus: 'upper', inventory: emptyInv }), { profile: p, sessions: [], now: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.details.join(' ')).toMatch(/equipment|avoid list|limitation/i);
    const r2 = generateWorkout(params({ style: 'hiit', inventory: emptyInv, readiness: { energy: 4, soreness: 2, discomfort: ['foot', 'shoulder'] } }), { profile: p, sessions: [], now: NOW });
    expect(r2.ok).toBe(false);
  });

  it('caps intervals at moderate without clinician guidance (hypertension)', () => {
    const r = generateWorkout(params({ style: 'hiit' }), { profile: p, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.hardSession).toBe(false);
    const it = r.workout.blocks.find((b) => b.kind === 'intervals')!.items[0];
    expect(Number(it.rpe)).toBeLessThanOrEqual(6);
  });

  it('allows effort 7 intervals with valid (non-expired) guidance', () => {
    const p2 = profile({ clearance: { hasGuidance: true, date: '2026-09-01', notes: '', reviewBy: '2027-09-01' } });
    expect(clearanceValid(p2, NOW)).toBe(true);
    const r = generateWorkout(params({ style: 'hiit' }), { profile: p2, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.hardSession).toBe(true);
    const expired = profile({ clearance: { hasGuidance: true, date: '2024-01-01', notes: 'old normal cardiac eval', reviewBy: '2025-01-01' } });
    expect(clearanceValid(expired, NOW)).toBe(false);
    expect(effortCap(expired, NOW).maxRpe).toBe(6);
  });

  it('does not schedule hard intervals right after a hard session unless overridden', () => {
    const p2 = profile({ clearance: { hasGuidance: true, date: '2026-09-01', notes: '', reviewBy: '2027-09-01' } });
    const hard: SessionLog = { id: 'x', workoutId: 'x', name: 'Fast Attack Keel', style: 'hiit', focus: 'full', goal: 'cardio', startedAt: '2026-10-02T17:00:00', endedAt: '2026-10-02T17:30:00', activeSec: 1800, plannedSec: 1800, completedSteps: 10, totalSteps: 10, sets: [], intervalsCompleted: 6, intervalsPlanned: 6, cardioMinutes: 20, isStrengthDay: false, sessionRpe: 7, soreness: 2, discomfort: [], notes: '', hard: true, muscles: [], substitutions: [] };
    const r = generateWorkout(params({ style: 'hiit' }), { profile: p2, sessions: [hard], now: NOW });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.hardSession).toBe(false);
    expect(r.workout.warnings.join(' ')).toMatch(/36 hours/);
    const r2 = generateWorkout(params({ style: 'hiit', overrideRecovery: true }), { profile: p2, sessions: [hard], now: NOW });
    if (!r2.ok) throw new Error(r2.error);
    expect(r2.workout.hardSession).toBe(true);
  });

  it('honours configurable intervals', () => {
    const p2 = profile({ clearance: { hasGuidance: true, date: '2026-09-01', notes: '', reviewBy: '2027-09-01' } });
    const r = generateWorkout(params({ style: 'hiit', duration: 30, intervals: { workSec: 40, restSec: 80, rounds: 5, workRpe: 10 } }), { profile: p2, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    const b = r.workout.blocks.find((x) => x.kind === 'intervals')!;
    expect(b.rounds).toBe(5);
    expect(b.items[0].workSec).toBe(40);
    expect(Number(b.items[0].rpe)).toBe(8); // all-out request capped
    expect(r.workout.steps.filter((s) => s.kind === 'interval-work')).toHaveLength(5);
  });

  it('different version keeps main lifts and restrictions', () => {
    const r = generateWorkout(params(), { profile: p, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    const v = differentVersion(r.workout, { profile: p, sessions: [], now: NOW });
    if (!v.ok) throw new Error(v.error);
    const mains = (w: typeof r.workout) => w.blocks.flatMap((b) => b.items).map((i) => i.exerciseId).filter((id) => getExercise(id).main).sort();
    for (const m of mains(r.workout)) expect(mains(v.workout)).toContain(m);
    expect(v.workout.params.goal).toBe(r.workout.params.goal);
  });

  it('Surprise Me respects restrictions', () => {
    for (let s = 1; s < 40; s++) {
      const prm = surpriseParams(params(), { profile: p, sessions: [], now: NOW }, s);
      const r = generateWorkout(prm, { profile: p, sessions: [], now: NOW });
      if (!r.ok) continue;
      const ctx = contextFrom(p, prm.inventory, prm.readiness);
      for (const b of r.workout.blocks) for (const it of b.items) expect(checkExercise(getExercise(it.exerciseId), ctx).ok).toBe(true);
    }
  });
});

describe('weighted main work', () => {
  const p = profile();
  it('every main-block exercise uses weights, cables or machines (gym and home)', () => {
    let n = 0;
    for (const style of ['strength', 'circuit', 'strength-cond'] as Style[])
      for (const focus of ['full', 'upper', 'lower', 'push', 'pull', 'core'] as Focus[])
        for (const duration of [20, 45, 60] as Duration[])
          for (const inv of [defaultGym(), defaultHome()]) {
            const r = generateWorkout(params({ style, focus, duration, inventory: inv, seed: ++n }), { profile: p, sessions: [], now: NOW });
            if (!r.ok) continue;
            for (const b of r.workout.blocks) {
              if (!['strength', 'circuit', 'core', 'carry'].includes(b.kind)) continue;
              for (const it of b.items) {
                const ex = getExercise(it.exerciseId);
                expect(isLoadedFor(ex, inv), `${ex.name} in ${style}/${focus}`).toBe(true);
              }
            }
          }
  });
  it('home pull day now has a weighted vertical pull', () => {
    const r = generateWorkout(params({ style: 'strength', focus: 'pull', inventory: defaultHome() }), { profile: p, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    const ids = r.workout.blocks.flatMap((b) => b.items.map((i) => i.exerciseId));
    expect(ids).toContain('db-pullover');
  });
  it('warm-up and cool-down still use bodyweight drills', () => {
    const r = generateWorkout(params({ style: 'strength', focus: 'lower' }), { profile: p, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.blocks[0].items.some((i) => i.exerciseId === 'glute-bridge' || i.exerciseId === 'hip-circles')).toBe(true);
  });
});

describe('sets and reps', () => {
  it('every rep-based lift is 3–4 sets of 8–12', () => {
    const p = profile();
    let n = 0;
    for (const style of ['strength', 'strength-cond', 'boxing'] as Style[])
      for (const goal of ['strength', 'muscle', 'fatloss', 'cardio', 'balanced'] as Goal[])
        for (const duration of [15, 30, 60] as Duration[]) {
          const r = generateWorkout(params({ style, goal, duration, seed: ++n, planWeek: (n % 4) + 1 }), { profile: p, sessions: [], now: NOW });
          if (!r.ok) continue;
          for (const b of r.workout.blocks) if (b.kind === 'strength') for (const it of b.items) {
            expect(it.sets, getExercise(it.exerciseId).name).toBeGreaterThanOrEqual(3);
            expect(it.sets).toBeLessThanOrEqual(4);
            if (it.reps) expect(it.reps).toMatch(/^8–12/);
          }
        }
  });
  it('low readiness keeps 3 sets and lowers effort instead', () => {
    const r = generateWorkout(params({ readiness: { energy: 1, soreness: 4, discomfort: [] } }), { profile: profile(), sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    for (const it of r.workout.blocks.find((b) => b.kind === 'strength')!.items) expect(it.sets).toBe(3);
  });
});

describe('push / pull days', () => {
  const p = profile();
  const run = (focus: Focus, duration: Duration, inv = defaultGym()) => {
    const r = generateWorkout(params({ style: 'strength', focus, duration, inventory: inv }), { profile: p, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    return r.workout;
  };
  const count = (w: ReturnType<typeof run>, fn: (id: string) => boolean) => w.blocks.find((b) => b.kind === 'strength')!.items.filter((i) => fn(i.exerciseId)).length;
  const isChest = (id: string) => getExercise(id).pattern === 'h-push';
  const isShoulder = (id: string) => ['v-push', 'shoulder-iso'].includes(getExercise(id).pattern);
  const isTri = (id: string) => getExercise(id).pattern === 'arms' && getExercise(id).muscles.includes('triceps');
  const isBack = (id: string) => ['h-pull', 'v-pull'].includes(getExercise(id).pattern);
  const isBi = (id: string) => getExercise(id).pattern === 'arms' && getExercise(id).muscles.includes('biceps');

  for (const [loc, inv] of [['gym', defaultGym()], ['home', defaultHome()]] as const) {
    for (const d of [45, 60] as Duration[]) {
      it(`push ${d} min (${loc}): 3 chest, 3 shoulders, 3 triceps at 3–4 × 8–12`, () => {
        const w = run('push', d, inv);
        expect(count(w, isChest)).toBe(3); expect(count(w, isShoulder)).toBe(3); expect(count(w, isTri)).toBe(3);
        for (const it of w.blocks.find((b) => b.kind === 'strength')!.items) { expect(it.sets).toBeGreaterThanOrEqual(3); expect(it.sets).toBeLessThanOrEqual(4); expect(it.reps).toMatch(/^8–12/); }
        expect(w.estimatedSec).toBeLessThanOrEqual(d * 60 * 1.1);
      });
      it(`pull ${d} min (${loc}): 3 back, 3 biceps at 3–4 × 8–12`, () => {
        const w = run('pull', d, inv);
        expect(count(w, isBack)).toBe(3); expect(count(w, isBi)).toBe(3);
        for (const it of w.blocks.find((b) => b.kind === 'strength')!.items) { expect(it.sets).toBeGreaterThanOrEqual(3); expect(it.reps).toMatch(/^8–12/); }
      });
    }
  }
  it('uses your push template: flat bench → incline → machine fly; overhead → Smith → raises; pushdown → lying ext → kickback', () => {
    const neutralOff = profile({ preferNeutralGrip: false });
    const r = generateWorkout(params({ style: 'strength', focus: 'push', duration: 60 }), { profile: neutralOff, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    const ids = r.workout.blocks.find((b) => b.kind === 'strength')!.items.map((i) => i.exerciseId);
    expect(ids).toEqual(['db-bench-neutral', 'db-incline-press', 'machine-fly', 'seated-db-press', 'smith-shoulder-press', 'lateral-raise', 'cable-pushdown', 'db-triceps-ext', 'db-kickback']);
    // 60 min = straight sets in muscle-group order
    expect(r.workout.blocks.find((b) => b.kind === 'strength')!.items.every((i) => !i.group)).toBe(true);
  });
  it('Smith press (bar grip) is replaced by a neutral-grip press while "prefer neutral grips" is on', () => {
    const r = generateWorkout(params({ style: 'strength', focus: 'push', duration: 60 }), { profile: p, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    const ids = r.workout.blocks.find((b) => b.kind === 'strength')!.items.map((i) => i.exerciseId);
    expect(ids).not.toContain('smith-shoulder-press');
    expect(ids).toContain('machine-shoulder-press');
  });
  it('supersets run back-to-back in the active workout steps', () => {
    const w = run('push', 45);
    const sets = w.steps.filter((s) => s.kind === 'set');
    expect(sets[0].group).toBe('A1');
    const i = w.steps.indexOf(sets[0]);
    expect(w.steps[i + 1].kind).toBe('transition');
    expect(w.steps[i + 2].group).toBe('A2');
  });
  it('never drops shoulders: every push style/duration keeps 3 chest, 3 shoulders, 3 triceps', () => {
    for (const style of ['strength', 'strength-cond'] as Style[])
      for (const duration of [15, 20, 30, 45, 60] as Duration[])
        for (const inv of [defaultGym(), defaultHome()]) {
          const r = generateWorkout(params({ style, focus: 'push', duration, inventory: inv }), { profile: p, sessions: [], now: NOW });
          if (!r.ok) throw new Error(r.error);
          const w = r.workout;
          expect(count(w, isChest), `${style} ${duration}`).toBe(3);
          expect(count(w, isShoulder), `${style} ${duration}`).toBe(3);
          expect(count(w, isTri), `${style} ${duration}`).toBe(3);
          const r2 = generateWorkout(params({ style, focus: 'pull', duration, inventory: inv }), { profile: p, sessions: [], now: NOW });
          if (!r2.ok) throw new Error(r2.error);
          expect(count(r2.workout, isBack)).toBe(3);
          expect(count(r2.workout, isBi)).toBe(3);
        }
  });
  it('a short push day is extended to 45 minutes and says so', () => {
    const w = run('push', 20);
    expect(w.params.duration).toBe(45);
    expect(w.warnings.join(' ')).toMatch(/set to 45 minutes instead of 20/);
  });
});

describe('boxing', () => {
  const p = profile();
  it('builds timed rounds with rest, a drill per round, and a weighted core finisher', () => {
    const r = generateWorkout(params({ style: 'boxing', duration: 45 }), { profile: p, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    const box = r.workout.blocks.find((b) => b.kind === 'rounds')!;
    expect(box.items.length).toBeGreaterThanOrEqual(6);
    for (const it of box.items) { expect(it.workSec).toBe(120); expect(it.restSec).toBe(60); expect(it.drill).toBeTruthy(); expect(Number(it.rpe)).toBeLessThanOrEqual(6); }
    // wrists are limited by default → no hooks/uppercuts on the bag, but straight punches on the bag are allowed
    expect(box.items.some((i) => i.exerciseId === 'bag-hooks')).toBe(false);
    expect(box.items.some((i) => i.exerciseId === 'bag-straight')).toBe(true);
    const fin = r.workout.blocks.find((b) => b.id === 'core-finisher')!;
    for (const it of fin.items) expect(isLoadedFor(getExercise(it.exerciseId), defaultGym())).toBe(true);
    const work = r.workout.steps.filter((s) => s.kind === 'interval-work');
    expect(work.length).toBe(box.items.length);
    expect(r.workout.steps[r.workout.steps.indexOf(work[0]) + 1].kind).toBe('rest');
  });
  it('shadow boxing only when there is no heavy bag', () => {
    const r = generateWorkout(params({ style: 'boxing', inventory: defaultHome(), location: 'home' }), { profile: p, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    const ids = r.workout.blocks.find((b) => b.kind === 'rounds')!.items.map((i) => i.exerciseId);
    expect(ids.every((id) => id.startsWith('shadow'))).toBe(true);
    expect(r.workout.warnings.join(' ')).toMatch(/No heavy bag/);
  });
  it('wrist discomfort today removes bag work and combo shadow boxing', () => {
    const r = generateWorkout(params({ style: 'boxing', readiness: { energy: 4, soreness: 2, discomfort: ['wrist'] } }), { profile: p, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    const ids = r.workout.blocks.find((b) => b.kind === 'rounds')!.items.map((i) => i.exerciseId);
    expect(ids.every((id) => id === 'shadow-defense')).toBe(true);
  });
  it('allows effort 7 with valid clinician guidance, and plans never put boxing next to another hard day', () => {
    const p2 = profile({ clearance: { hasGuidance: true, date: '2026-09-01', notes: '', reviewBy: '2027-09-01' } });
    const r = generateWorkout(params({ style: 'boxing' }), { profile: p2, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.hardSession).toBe(true);
    const plan = buildPlan({ profile: p, trainingDays: [1, 2, 3, 4, 5], duration: 45, goal: 'balanced', start: NOW });
    expect(plan.days.some((d) => d.type === 'boxing')).toBe(true);
  });
});

describe('choosing a substitute yourself', () => {
  const p = profile();
  const ctx = contextFrom(p, defaultGym());
  it('"I\'ll choose" lists suggestions plus every other option for the slot, all allowed', () => {
    const r = findSubstitutes('db-bench-neutral', 'choose', ctx);
    expect(r.options.length).toBe(3);
    expect(r.more.length).toBeGreaterThan(0);
    for (const o of [...r.options, ...r.more]) { expect(o.exercise.pattern).toBe('h-push'); expect(checkExercise(o.exercise, ctx).ok).toBe(true); }
    expect([...r.options, ...r.more].some((o) => o.exercise.id === 'push-up')).toBe(false);
  });
  it('browse/search covers any allowed exercise and still enforces restrictions', () => {
    const all = browseExercises(ctx);
    expect(all.length).toBeGreaterThan(40);
    for (const o of all) expect(checkExercise(o.exercise, ctx).ok).toBe(true);
    expect(all.some((o) => ['push-up', 'bench-dip', 'kb-swing', 'jump-squat', 'bag-hooks'].includes(o.exercise.id))).toBe(false);
    const rows = browseExercises(ctx, { query: 'row' });
    expect(rows.length).toBeGreaterThan(2);
    expect(rows.every((o) => /row/i.test(`${o.exercise.name} ${o.exercise.muscles.join(' ')} ${o.exercise.pattern}`))).toBe(true);
    const hurt = browseExercises(ctx, { hurtArea: 'knee' });
    expect(hurt.some((o) => o.exercise.limits.knee)).toBe(false);
  });
  it('swapping in the brief keeps sets, rest and superset group, and rebuilds steps', () => {
    const r = generateWorkout(params({ style: 'strength', focus: 'push', duration: 45 }), { profile: p, sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    const block = r.workout.blocks.find((b) => b.kind === 'strength')!;
    const target = block.items[0];
    const pick = findSubstitutes(target.exerciseId, 'choose', ctx, { excludeIds: block.items.map((i) => i.exerciseId) }).more.slice(-1)[0] ?? findSubstitutes(target.exerciseId, 'choose', ctx).options[0];
    const w2 = swapExercise(r.workout, target.exerciseId, pick.exercise.id, { profile: p, sessions: [] });
    const item = w2.blocks.find((b) => b.kind === 'strength')!.items[0];
    expect(item.exerciseId).toBe(pick.exercise.id);
    expect(item.sets).toBe(target.sets);
    expect(item.restSec).toBe(target.restSec);
    expect(item.group).toBe(target.group);
    expect(item.reps).toBe('8–12');
    expect(w2.steps.some((s) => s.exerciseId === pick.exercise.id)).toBe(true);
    expect(w2.steps.some((s) => s.exerciseId === target.exerciseId)).toBe(false);
    const w3 = swapExercise(r.workout, target.exerciseId, null, { profile: p, sessions: [] });
    expect(w3.blocks.flatMap((b) => b.items).some((i) => i.exerciseId === target.exerciseId)).toBe(false);
  });
});

describe('substitutions', () => {
  const p = profile();
  const ctx = contextFrom(p, defaultGym());
  it('equipment busy prefers different equipment, same purpose', () => {
    const r = findSubstitutes('machine-chest-press', 'busy', ctx);
    expect(r.options.length).toBeGreaterThan(0);
    expect(r.options[0].exercise.pattern).toBe('h-push');
    expect(r.options[0].exercise.equipOptions.flat()).not.toContain('machine-chest-press');
    for (const o of r.options) expect(checkExercise(o.exercise, ctx).ok).toBe(true);
  });
  it('this hurts excludes anything loading that area and shows safety text', () => {
    const r = findSubstitutes('db-bench-neutral', 'hurts', ctx, { hurtArea: 'wrist' });
    expect(r.safety).toMatch(/do not train through pain/i);
    for (const o of r.options) expect(o.exercise.limits.wrist).toBeUndefined();
  });
  it('removes the movement with an explanation when nothing fits', () => {
    const c = contextFrom(p, emptyInv);
    const r = findSubstitutes('lat-pulldown', 'busy', c);
    expect(r.options).toHaveLength(0);
    expect(r.removalReason).toMatch(/removed/);
  });
});

describe('timer', () => {
  const steps = [{ timed: true, durationSec: 30 }, { timed: false, durationSec: 40 }, { timed: true, durationSec: 60 }, { timed: true, durationSec: 10 }];
  it('start / pause / resume keep accurate remaining time', () => {
    let s = T.initTimer(steps);
    s = T.start(s, steps, 0);
    expect(T.remaining(s, 10_000)).toBe(20_000);
    s = T.pause(s, 10_000);
    expect(T.remaining(s, 50_000)).toBe(20_000); // paused time doesn't count
    s = T.resume(s, steps, 50_000);
    expect(T.remaining(s, 55_000)).toBe(15_000);
    expect(T.activeSeconds(s, 55_000)).toBe(15);
  });
  it('auto-advances timed steps and waits on rep-based sets', () => {
    let s = T.start(T.initTimer(steps), steps, 0);
    s = T.tick(s, steps, 30_500);
    expect(s.index).toBe(1);
    expect(s.endAt).toBeNull(); // set step waits for "Set done"
    s = T.tick(s, steps, 200_000);
    expect(s.index).toBe(1);
    s = T.complete(s, steps, 200_000);
    expect(s.index).toBe(2);
    expect(T.remaining(s, 200_000)).toBe(60_000);
  });
  it('add rest, skip and finish', () => {
    let s = T.start(T.initTimer(steps), steps, 0);
    s = T.addTime(s, 30, 1000);
    expect(T.remaining(s, 1000)).toBe(59_000);
    s = T.skip(s, steps, 2000);
    expect(s.skipped).toEqual([0]);
    s = T.complete(s, steps, 3000);
    // chained timed steps advance without drift even if ticks are late
    s = T.tick(s, steps, 3000 + 60_000 + 10_000 + 5);
    expect(s.status).toBe('finished');
    expect(s.completed).toEqual([1, 2, 3]);
  });
});

describe('plan', () => {
  const p = profile();
  it('builds 4 editable weeks without consecutive hard days', () => {
    for (const days of [[1, 3, 5], [1, 2, 4, 5], [1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5]]) {
      const plan = buildPlan({ profile: p, trainingDays: days, duration: 45, goal: 'balanced', start: NOW });
      expect(plan.days).toHaveLength(28);
      for (let i = 1; i < 28; i++) {
        const a = plan.days[i - 1].type, b = plan.days[i].type;
        expect(HARD_TYPES.includes(a) && HARD_TYPES.includes(b), `days ${days}`).toBe(false);
      }
      expect(planWarnings(plan).filter((w) => w.includes('consecutive'))).toHaveLength(0);
    }
  });
  it('keeps anchors and knows the plan week', () => {
    const plan = buildPlan({ profile: p, trainingDays: [1, 3, 5], duration: 45, goal: 'muscle', start: NOW });
    expect(plan.anchors.squat).toBeTruthy();
    expect(weekOfPlan(plan, plan.days[8].date)).toBe(2);
    expect(weekOfPlan(plan, plan.days[27].date)).toBe(4);
  });
});

describe('progression', () => {
  const mk = (reps: number[], rpe: number, pain = false): SessionLog => ({
    id: 'a', workoutId: 'a', name: 'x', style: 'strength', focus: 'full', goal: 'muscle', startedAt: '2026-10-01T10:00:00', endedAt: '2026-10-01T11:00:00', activeSec: 1, plannedSec: 1, completedSteps: 1, totalSteps: 1,
    sets: reps.map((r, i) => ({ exerciseId: 'goblet-squat', setNumber: i + 1, weight: 40, reps: r, rpe, pain, goodForm: true })),
    intervalsCompleted: 0, intervalsPlanned: 0, cardioMinutes: 0, isStrengthDay: true, sessionRpe: 6, soreness: 2, discomfort: [], notes: '', hard: false, muscles: [], substitutions: [],
  });
  const w = [30, 35, 40, 45, 50];
  it('increases by the smallest step when all sets hit the top', () => expect(suggestLoad('goblet-squat', [mk([10, 10, 10], 7)], [8, 10], w)).toMatchObject({ action: 'increase', weight: 45 }));
  it('holds when reps are short', () => expect(suggestLoad('goblet-squat', [mk([10, 9, 8], 7)], [8, 10], w)).toMatchObject({ action: 'hold', weight: 40 }));
  it('reduces after pain', () => expect(suggestLoad('goblet-squat', [mk([10, 10, 10], 7, true)], [8, 10], w)).toMatchObject({ action: 'reduce', weight: 35 }));
  it('reduces after near-max effort', () => expect(suggestLoad('goblet-squat', [mk([10, 10, 10], 9)], [8, 10], w)).toMatchObject({ action: 'reduce' }));
  it('holds when readiness is low', () => expect(suggestLoad('goblet-squat', [mk([10, 10, 10], 7)], [8, 10], w, { energy: 1, soreness: 4, discomfort: [] })).toMatchObject({ action: 'hold' }));
});

describe('storage', () => {
  it('round-trips export and import', () => {
    const d = defaultData();
    d.profile.goalWeight = 160;
    d.body.push({ date: '2026-10-10', weight: 172, waist: 34 });
    const back = importJson(exportJson(d));
    expect(back.body).toEqual(d.body);
    expect(back.profile.goalWeight).toBe(160);
  });
  it('rejects invalid files', () => {
    expect(() => importJson('not json')).toThrow();
    expect(() => importJson('{"app":"Other","version":1}')).toThrow();
    expect(() => importJson('{"version":2}')).toThrow();
  });
});

describe('stats', () => {
  it('counts cardio minutes only from completed cardio steps', () => {
    const r = generateWorkout(params({ style: 'steady', duration: 30 }), { profile: profile(), sessions: [], now: NOW });
    if (!r.ok) throw new Error(r.error);
    const all = r.workout.steps.map((_, i) => i);
    const min = cardioMinutesFromSteps(r.workout.steps, all);
    expect(min).toBeGreaterThan(15);
    expect(min).toBeLessThanOrEqual(30);
    expect(cardioMinutesFromSteps(r.workout.steps, [])).toBe(0);
  });
});

describe('complete substitution search', () => {
  const p = profile();
  const ctx = contextFrom(p, defaultGym());
  const main = EXERCISES.filter((e) => e.kind !== 'warmup' && e.kind !== 'mobility');
  it('empty search lists the whole library — allowed first, the rest with reasons', () => {
    const all = searchExercises(ctx, { excludeIds: ['goblet-squat'] });
    expect(all.length).toBe(main.length);
    const firstBlocked = all.findIndex((h) => !h.allowed);
    expect(all.slice(firstBlocked).every((h) => !h.allowed)).toBe(true);
    for (const h of all) if (!h.allowed) expect(h.reasons.length).toBeGreaterThan(0);
    expect(all.find((h) => h.exercise.id === 'goblet-squat')!.reasons).toContain('Already in this mission');
    expect(all.find((h) => h.exercise.id === 'push-up')!.allowed).toBe(false);
  });
  it('everyday words find the right exercises', () => {
    const ids = (q: string) => searchExercises(ctx, { query: q }).map((h) => h.exercise.id);
    expect(ids('chest')).toEqual(expect.arrayContaining(['db-bench-neutral', 'db-incline-press', 'machine-fly', 'cable-fly', 'push-up']));
    // chest exercises rank above "Chest-Supported" back/shoulder moves
    const chest = searchExercises(ctx, { query: 'chest' }).filter((h) => h.allowed).map((h) => h.exercise.pattern);
    const firstOther = chest.findIndex((pt) => pt !== 'h-push');
    expect(chest.slice(firstOther).includes('h-push')).toBe(false);
    expect(ids('abs')).toEqual(expect.arrayContaining(['pallof-press', 'weighted-dead-bug', 'cable-chop']));
    expect(ids('cable row')).toEqual(expect.arrayContaining(['seated-cable-row', 'cable-one-arm-row']));
    expect(ids('cable row')).not.toContain('chest-supported-row');
    expect(ids('legs')).toEqual(expect.arrayContaining(['goblet-squat', 'db-rdl', 'leg-press', 'calf-raise']));
    expect(ids('delts')).toEqual(expect.arrayContaining(['lateral-raise', 'seated-db-press']));
    expect(ids('smith')).toContain('smith-shoulder-press');
    expect(ids('tricep')).toEqual(expect.arrayContaining(['cable-pushdown', 'db-kickback', 'db-triceps-ext']));
  });
  it('unavailable picks explain themselves (wrists, equipment, avoid list)', () => {
    const home = contextFrom(p, defaultHome());
    const h = searchExercises(home, { query: 'leg press' }).find((x) => x.exercise.id === 'leg-press')!;
    expect(h.allowed).toBe(false);
    expect(h.reasons.join()).toMatch(/Equipment/);
    const pu = searchExercises(ctx, { query: 'push up' }).find((x) => x.exercise.id === 'push-up')!;
    expect(pu.reasons.join()).toMatch(/avoid list|wrists/);
  });
});
