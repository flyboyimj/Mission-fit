import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { defaultData, STORAGE_KEY } from '../src/store/storage';
import type { AppData } from '../src/types';

function onboarded(): AppData {
  const d = defaultData();
  d.profile.onboarded = true;
  d.profile.screening = { heartCondition: false, chestPain: false, dizziness: false, bpUncontrolled: false, otherChronic: false, medsAffectingExercise: false, boneJointWorse: false, physicianSaidSupervised: false };
  d.profile.screeningAt = new Date().toISOString();
  return d;
}

const stored = (): AppData => JSON.parse(localStorage.getItem(STORAGE_KEY)!);

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(() => vi.useRealTimers());

describe('onboarding', () => {
  it('confirms limitations, requires full screening, then saves', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }));
    fireEvent.change(screen.getByLabelText('Goal weight (lb)'), { target: { value: '160' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    // limitations: switch feet to "not now"
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Feet status' })).getByRole('radio', { name: 'Not now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const next = screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    for (const g of screen.getAllByRole('radiogroup')) fireEvent.click(within(g).getByRole('radio', { name: 'No' }));
    expect(screen.getByText(/Clinician guidance recommended/)).toBeTruthy(); // hypertension still active
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const finish = screen.getByRole('button', { name: 'Report for duty' }) as HTMLButtonElement;
    expect(finish.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/stop and get help/));
    fireEvent.click(finish);
    const d = stored();
    expect(d.profile.onboarded).toBe(true);
    expect(d.profile.goalWeight).toBe(160);
    expect(d.profile.limitations.foot).toBe(false);
    expect(d.profile.limitations.wrist).toBe(true);
    expect(screen.getByText(/Effort is capped at moderate/)).toBeTruthy();
  });
});

describe('build → brief → active workout → log', () => {
  it('generates, runs timers, logs a set, and saves history', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T17:00:00'));
    render(<App initial={onboarded()} />);
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Build/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Traditional strength' }));
    fireEvent.click(screen.getByRole('radio', { name: '20 min' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
    expect(screen.getByText('Mission brief · Traditional strength')).toBeTruthy();
    expect(screen.getByText('Warm-Up')).toBeTruthy();
    expect(screen.getByText('Cool-Down')).toBeTruthy();
    expect(screen.queryByText('Push-Up')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Start mission' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    // pause/resume
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    // run through warm-up timers
    let guard = 0;
    while (!screen.queryByRole('button', { name: 'Set done' }) && guard++ < 200) {
      if (screen.queryByRole('button', { name: 'Done' })) fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      else act(() => { vi.advanceTimersByTime(5000); });
    }
    expect(screen.getByRole('button', { name: 'Set done' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Reps done', { selector: 'input' }), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set done' }));
    expect(screen.getByText('Rest', { selector: '.phase' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+30s rest' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    // finish
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish & debrief' }));
    expect(screen.getByText('Debrief')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '6' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save to log' }));
    const d = stored();
    expect(d.sessions).toHaveLength(1);
    expect(d.sessions[0].sets[0].reps).toBe(9);
    expect(d.sessions[0].sessionRpe).toBe(6);
    expect(d.sessions[0].isStrengthDay).toBe(true);
    expect(screen.getByText('After-action report')).toBeTruthy();
  });

  it('substitution sheet offers alternatives and honours "This hurts"', () => {
    render(<App initial={onboarded()} />);
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Build/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Traditional strength' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start mission' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    // skip to first set
    let guard = 0;
    while (!screen.queryByRole('button', { name: 'Set done' }) && guard++ < 40) fireEvent.click(screen.getByRole('button', { name: screen.queryByRole('button', { name: 'Done' }) ? 'Done' : 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Substitute' }));
    expect(screen.getByText('Suggested')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'This hurts' }));
    expect(screen.getByText(/don't train through pain/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Knees' }));
    expect(screen.getByRole('button', { name: "Remove this movement from today's mission" })).toBeTruthy();
  });
});

describe('plan, library, progress, profile', () => {
  it('builds an editable plan', () => {
    render(<App initial={onboarded()} />);
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Plan/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Build 4-week plan' }));
    expect(screen.getByText(/Week 4 · lighter/)).toBeTruthy();
    const d = stored();
    expect(d.plan!.days).toHaveLength(28);
    const first = d.plan!.days[0].date;
    fireEvent.change(document.getElementById(`pd-${first}`)!, { target: { value: 'recovery' } });
    expect(stored().plan!.days[0].type).toBe('recovery');
  });

  it('library shows push-ups as excluded with reasons', () => {
    render(<App initial={onboarded()} />);
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Library/ }));
    fireEvent.click(screen.getByText('Push-Up'));
    expect(screen.getByText('Excluded for you:')).toBeTruthy();
    expect(screen.getByText(/Not suitable with wrists limitation/)).toBeTruthy();
  });

  it('logs body weight and updates current weight', () => {
    render(<App initial={onboarded()} />);
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Progress/ }));
    fireEvent.change(screen.getByLabelText('Weight (lb)'), { target: { value: '171.5' } });
    fireEvent.change(screen.getByLabelText('Waist (in, optional)'), { target: { value: '37' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log measurement' }));
    const d = stored();
    expect(d.profile.currentWeight).toBe(171.5);
    expect(d.body.some((b) => b.waist === 37)).toBe(true);
  });

  it('delete requires typed confirmation and wipes data', () => {
    render(<App initial={onboarded()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Profile and restrictions' }));
    const del = screen.getByRole('button', { name: 'Delete everything' }) as HTMLButtonElement;
    expect(del.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/type DELETE/), { target: { value: 'DELETE' } });
    fireEvent.click(del);
    expect(screen.getByText('Mission Fit')).toBeTruthy(); // back to onboarding
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('ballistic permission is locked while low back is active', () => {
    render(<App initial={onboarded()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Profile and restrictions' }));
    expect((screen.getByLabelText(/Allow ballistic kettlebell work/) as HTMLInputElement).disabled).toBe(true);
  });
});

describe('leg day from Build', () => {
  it('Today no longer has a Leg day button; Build → Lower body respects knee limits', () => {
    render(<App initial={onboarded()} />);
    expect(screen.queryByRole('button', { name: 'Leg day' })).toBeNull();
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Build/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Traditional strength' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Lower body / Leg day' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
    expect(screen.getByText('Mission brief · Traditional strength')).toBeTruthy();
    expect(screen.getByText('Lower body / Leg day')).toBeTruthy();
    expect(screen.queryByText('Walking Lunge')).toBeNull();
    expect(screen.queryByText('Jump Squat')).toBeNull();
  });
});

describe('boxing from Build', () => {
  it('Today has no Boxing button; Build → Boxing rounds shows rounds and a core finisher', () => {
    render(<App initial={onboarded()} />);
    expect(screen.queryByRole('button', { name: 'Boxing' })).toBeNull();
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Build/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Boxing rounds' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
    expect(screen.getByText('Mission brief · Boxing rounds')).toBeTruthy();
    expect(screen.getAllByText(/Heavy Bag — Jab & Cross/).length).toBeGreaterThan(0);
    expect(screen.getByText('Core Finisher (weighted)')).toBeTruthy();
  });
});

describe('swap from the brief', () => {
  it('lets me pick any allowed exercise by search', () => {
    render(<App initial={onboarded()} />);
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Build/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Traditional strength' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Pull' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
    const swaps = screen.getAllByRole('button', { name: /^Swap / });
    const first = swaps[0].getAttribute('aria-label')!.replace('Swap ', '');
    fireEvent.click(swaps[0]);
    expect(screen.getByRole('dialog', { name: `Swap: ${first}` })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search the whole library'), { target: { value: 'face pull' } });
    fireEvent.click(screen.getByRole('button', { name: /Cable Face Pull/ }));
    expect(screen.getAllByText('Cable Face Pull').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: `Swap ${first}` })).toBeNull();
  });
});
