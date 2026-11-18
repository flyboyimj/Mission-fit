import { describe, expect, it } from 'vitest';
import { getExercise } from '../src/data/exercises';
import { checkExercise, contextFrom, equipOptionFor } from '../src/engine/filter';
import { generateWorkout, KB_ALT_REST_SEC } from '../src/engine/generator';
import { defaultGym, defaultHome, defaultProfile } from '../src/store/storage';
import type { Focus, Inventory, Profile, Style, WorkoutParams } from '../src/types';

function profile(): Profile {
  const p = defaultProfile();
  p.onboarded = true;
  p.screening = { heartCondition: false, chestPain: false, dizziness: false, bpUncontrolled: false, otherChronic: false, medsAffectingExercise: false, boneJointWorse: false, physicianSaidSupervised: false };
  p.screeningAt = '2026-10-01T00:00:00Z';
  return p;
}

/** What Build sends when only the "Kettlebells" chip is on. */
const kbOnly = (base: Inventory): Inventory => ({ ...base, dumbbell: false, cable: false, machines: [] });

const params = (inv: Inventory, focus: Focus, style: Style): WorkoutParams => ({
  goal: 'muscle', focus, style, location: 'home', duration: 45, inventory: inv,
  readiness: { energy: 4, soreness: 2, discomfort: [] }, includeCarries: false, seed: 11,
});

describe('kettlebell-only workouts', () => {
  const p = profile();
  for (const [where, inv] of [['home', kbOnly(defaultHome())], ['gym', kbOnly(defaultGym())]] as const) {
    for (const style of ['strength', 'strength-cond', 'circuit'] as Style[]) {
      for (const focus of ['full', 'upper', 'lower', 'push', 'pull', 'core'] as Focus[]) {
        it(`${where} · ${style} · ${focus} builds with kettlebells and stays within restrictions`, () => {
          const r = generateWorkout(params(inv, focus, style), { profile: p, sessions: [] });
          expect(r.ok, r.ok ? '' : r.details.join(' ')).toBe(true);
          if (!r.ok) return;
          const ctx = contextFrom(p, inv);
          const lifts = r.workout.blocks.filter((b) => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap((b) => b.items)
            .map((i) => getExercise(i.exerciseId)).filter((e) => e.kind === 'strength');
          expect(lifts.length).toBeGreaterThan(0);
          for (const ex of lifts) {
            expect(checkExercise(ex, ctx).ok, ex.id).toBe(true);
            const opt = equipOptionFor(ex, inv) ?? [];
            expect(opt.includes('dumbbell') || opt.includes('cable') || opt.some((e) => e.startsWith('machine')), ex.id).toBe(false);
          }
        });
      }
    }
  }

  it('push day with kettlebells only still gives 3 chest · 3 shoulders · 3 triceps', () => {
    const r = generateWorkout(params(kbOnly(defaultHome()), 'push', 'strength'), { profile: p, sessions: [] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const items = r.workout.blocks.flatMap((b) => b.items).filter((i) => getExercise(i.exerciseId).kind === 'strength');
    expect(items).toHaveLength(9);
  });

  it('load guidance names the tool to use', () => {
    const r = generateWorkout(params(kbOnly(defaultHome()), 'upper', 'strength'), { profile: p, sessions: [] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const guides = r.workout.blocks.flatMap((b) => b.items).map((i) => i.loadGuidance ?? '').filter((g) => /lb available/.test(g));
    expect(guides.length).toBeGreaterThan(0);
    for (const g of guides) expect(g).toMatch(/Kettlebells: 18–44 lb available/);
  });

  it('with dumbbells and kettlebells both on, dumbbell choices are unchanged', () => {
    const r = generateWorkout(params(defaultGym(), 'push', 'strength'), { profile: p, sessions: [] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.workout.blocks.flatMap((b) => b.items).map((i) => i.exerciseId)).toContain('db-bench-neutral');
  });

  it('kettlebell lifts alternate in pairs with 30 s rest after every exercise', () => {
    for (const focus of ['upper', 'push', 'pull', 'lower', 'full'] as Focus[]) {
      const r = generateWorkout(params(kbOnly(defaultHome()), focus, 'strength'), { profile: p, sessions: [] });
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      const block = r.workout.blocks.find((b) => b.kind === 'strength')!;
      const paired = block.items.filter((i) => i.group);
      expect(paired.length, focus).toBeGreaterThanOrEqual(4);
      for (const it of paired) { expect(it.restSec).toBe(KB_ALT_REST_SEC); expect(it.switchSec).toBe(KB_ALT_REST_SEC); }
      expect(block.description).toMatch(/alternate in pairs/);

      // Steps: A1 set, 30 s rest, A2 set, 30 s rest, A1 set … — never two sets of the same lift in a row.
      const a1 = paired[0].exerciseId, a2 = paired[1].exerciseId;
      const strengthSteps = r.workout.steps.filter((s) => s.blockId === block.id && s.kind !== 'warmup');
      const start = strengthSteps.findIndex((s) => s.exerciseId === a1 && s.kind === 'set');
      const seq = strengthSteps.slice(start, start + 8);
      expect(seq.map((s) => s.kind)).toEqual(['set', 'rest', 'set', 'rest', 'set', 'rest', 'set', 'rest']);
      expect(seq.filter((s) => s.kind === 'set').map((s) => s.exerciseId)).toEqual([a1, a2, a1, a2]);
      for (const s of seq.filter((x) => x.kind === 'rest').slice(0, 3)) expect(s.durationSec).toBe(30);
    }
  });

  it('dumbbell workouts keep their usual rests (no 30 s alternation)', () => {
    const r = generateWorkout(params({ ...defaultGym(), kettlebell: false }, 'upper', 'strength'), { profile: p, sessions: [] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const it of r.workout.blocks.flatMap((b) => b.items)) expect(it.switchSec).toBeUndefined();
  });
});
