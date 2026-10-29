import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { buildPlan } from '../src/engine/plan';
import { defaultData, STORAGE_KEY } from '../src/store/storage';
import type { AppData } from '../src/types';

function withPlan(): AppData {
  const d = defaultData();
  d.profile.onboarded = true;
  d.profile.screening = { heartCondition: false, chestPain: false, dizziness: false, bpUncontrolled: false, otherChronic: false, medsAffectingExercise: false, boneJointWorse: false, physicianSaidSupervised: false };
  const plan = buildPlan({ profile: d.profile, trainingDays: [1, 2, 3, 4, 5], duration: 45, goal: 'balanced', start: new Date('2026-10-12T12:00:00') });
  const week: Record<string, AppData['plan'] extends infer P ? P extends { days: (infer D)[] } ? D extends { type: infer T } ? T : never : never : never> = {
    '2026-10-12': 'strength-upper', '2026-10-13': 'steady', '2026-10-14': 'boxing', '2026-10-15': 'strength-lower', '2026-10-16': 'strength-push', '2026-10-17': 'rest', '2026-10-18': 'rest',
  };
  plan.days = plan.days.map((x) => (week[x.date] ? { ...x, type: week[x.date] } : x));
  d.plan = plan;
  return d;
}

beforeEach(() => { localStorage.clear(); window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T14:50:00')); });
afterEach(() => vi.useRealTimers());

describe("switch today's workout", () => {
  it('upper body → leg day, trading with Thursday, and the brief is a leg day', () => {
    render(<App initial={withPlan()} />);
    expect(screen.getByRole('heading', { name: 'Strength — Upper' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
    const leg = screen.getByRole('button', { name: /Leg day \(Strength — Lower\)/ });
    expect(leg.textContent).toMatch(/Trades with .*Oct 15|Trades with .*15/);
    fireEvent.click(leg);
    expect(screen.getByText(/Today is now Strength — Lower\. Strength — Upper moved to .*15/)).toBeTruthy();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as AppData;
    expect(saved.plan!.days.find((x) => x.date === '2026-10-12')!.type).toBe('strength-lower');
    expect(saved.plan!.days.find((x) => x.date === '2026-10-15')!.type).toBe('strength-upper');
    fireEvent.click(screen.getByRole('button', { name: 'Brief me' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate briefing' }));
    expect(screen.getByText('Lower body / Leg day')).toBeTruthy();
  });

  it('"today only" leaves the rest of the week alone', () => {
    render(<App initial={withPlan()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
    fireEvent.click(screen.getByLabelText(/Trade days if it's planned later this week/));
    fireEvent.click(screen.getByRole('button', { name: /Boxing Rounds/ }));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as AppData;
    expect(saved.plan!.days.find((x) => x.date === '2026-10-12')!.type).toBe('boxing');
    expect(saved.plan!.days.find((x) => x.date === '2026-10-15')!.type).toBe('strength-lower');
  });
});
