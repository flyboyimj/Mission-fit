import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { getExercise } from '../src/data/exercises';
import { checkExercise, contextFrom } from '../src/engine/filter';
import { BODY_PART_ORDER, customGroups, generateWorkout } from '../src/engine/generator';
import { defaultData, defaultGym, defaultHome, defaultProfile, STORAGE_KEY } from '../src/store/storage';
import type { AppData, BodyPart, Duration, Style, WorkoutParams } from '../src/types';

const profile = () => {
  const p = defaultProfile();
  p.onboarded = true;
  p.screening = { heartCondition: false, chestPain: false, dizziness: false, bpUncontrolled: false, otherChronic: false, medsAffectingExercise: false, boneJointWorse: false, physicianSaidSupervised: false };
  return p;
};
const params = (o: Partial<WorkoutParams>): WorkoutParams => ({ goal: 'balanced', focus: 'full', style: 'strength', location: 'gym', duration: 45, inventory: defaultGym(), readiness: { energy: 4, soreness: 2, discomfort: [] }, includeCarries: true, seed: 3, ...o });

/** Does this exercise train the given body part? */
function trains(id: string, part: BodyPart): boolean {
  const e = getExercise(id);
  switch (part) {
    case 'chest': return e.pattern === 'h-push';
    case 'shoulders': return e.pattern === 'v-push' || e.pattern === 'shoulder-iso';
    case 'back': return e.pattern === 'h-pull' || e.pattern === 'v-pull';
    case 'triceps': return e.pattern === 'arms' && e.muscles.includes('triceps');
    case 'biceps': return e.pattern === 'arms' && e.muscles.includes('biceps');
    case 'calves': return e.pattern === 'calves';
    case 'core': return e.pattern === 'core';
    default: return ['squat', 'hinge', 'lunge'].includes(e.pattern) && e.muscles.includes(part);
  }
}

describe('body-part selection', () => {
  const p = profile();
  it('every single part, at gym and home, gives 3 allowed exercises for that part at 3–4 × 8–12', () => {
    for (const part of BODY_PART_ORDER) for (const inv of [defaultGym(), defaultHome()]) {
      const r = generateWorkout(params({ bodyParts: [part], inventory: inv }), { profile: p, sessions: [], now: new Date('2026-10-17T10:00:00') });
      if (!r.ok) throw new Error(`${part}: ${r.error}`);
      const items = r.workout.blocks.find((b) => b.kind === 'strength')!.items;
      const want = part === 'calves' ? 2 : 3;
      expect(items.length, part).toBe(want);
      const ctx = contextFrom(p, inv);
      for (const it of items) {
        expect(trains(it.exerciseId, part), `${part}: ${it.exerciseId}`).toBe(true);
        expect(checkExercise(getExercise(it.exerciseId), ctx).ok).toBe(true);
        expect(it.sets).toBeGreaterThanOrEqual(3);
        expect(it.sets).toBeLessThanOrEqual(4);
        if (it.reps) expect(it.reps).toMatch(/^8–12/);
      }
    }
  });

  it('mixes: only the selected parts appear, counts scale with how many parts you pick, supersets never exceed 3', () => {
    const combos: BodyPart[][] = [['chest', 'biceps'], ['back', 'hamstrings', 'core'], ['quads', 'glutes', 'calves', 'core'], ['chest', 'back', 'shoulders', 'biceps', 'triceps'], BODY_PART_ORDER.slice()];
    for (const parts of combos) for (const style of ['strength', 'strength-cond'] as Style[]) for (const duration of [20, 45, 60] as Duration[]) {
      const r = generateWorkout(params({ bodyParts: parts, style, duration }), { profile: p, sessions: [], now: new Date('2026-10-17T10:00:00') });
      if (!r.ok) throw new Error(r.error);
      const items = r.workout.blocks.find((b) => b.kind === 'strength')!.items;
      const expected = customGroups(parts).reduce((t, g) => t + g.slots.length, 0);
      expect(items.length, `${parts} ${style} ${duration}`).toBe(expected);
      for (const it of items) expect(parts.some((pt) => trains(it.exerciseId, pt)), it.exerciseId).toBe(true);
      const sizes = new Map<string, number>();
      for (const it of items) if (it.group) sizes.set(it.group[0], (sizes.get(it.group[0]) ?? 0) + 1);
      for (const n of sizes.values()) expect(n).toBeLessThanOrEqual(3);
      expect(r.workout.estimatedSec).toBeLessThanOrEqual(r.workout.params.duration * 60 * 1.1);
      expect(r.workout.blocks.some((b) => b.kind === 'intervals')).toBe(false);
    }
  });

  it('is ignored (with a note) for non-strength styles', () => {
    const r = generateWorkout(params({ bodyParts: ['chest'], style: 'hiit' }), { profile: p, sessions: [], now: new Date('2026-10-17T10:00:00') });
    if (!r.ok) throw new Error(r.error);
    expect(r.workout.warnings.join(' ')).toMatch(/ignored/);
  });
});

describe('Build screen body-part picker', () => {
  beforeEach(() => { localStorage.clear(); window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; });
  it('pick Chest + Biceps → custom brief with only those, remembered next time in Build', () => {
    const d: AppData = defaultData();
    d.profile = profile();
    render(<App initial={d} />);
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Build/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Traditional strength' }));
    const picker = document.getElementById('body-parts')!;
    fireEvent.click(within(picker).getByRole('button', { name: 'Chest' }));
    fireEvent.click(within(picker).getByRole('button', { name: /Biceps/ }));
    expect(screen.getByText(/3 chest · 3 biceps — 6 exercises/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
    expect(screen.getByText('Custom — Chest · Biceps')).toBeTruthy();
    expect(screen.getAllByText('Chest · Biceps').length).toBeGreaterThan(0);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as AppData;
    expect(saved.lastParams?.bodyParts).toEqual(['chest', 'biceps']);
  });
});
