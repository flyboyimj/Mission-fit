import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import * as T from '../src/engine/timer';
import { ACTIVE_KEY, freeze, loadActive } from '../src/store/activeSession';
import { defaultData, STORAGE_KEY } from '../src/store/storage';
import type { AppData } from '../src/types';

function onboarded(): AppData {
  const d = defaultData();
  d.profile.onboarded = true;
  d.profile.screening = { heartCondition: false, chestPain: false, dizziness: false, bpUncontrolled: false, otherChronic: false, medsAffectingExercise: false, boneJointWorse: false, physicianSaidSupervised: false };
  return d;
}

beforeEach(() => { localStorage.clear(); window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; });
afterEach(() => vi.useRealTimers());

describe('freeze', () => {
  it('stores a running timer as paused with exact remaining and active time', () => {
    const steps = [{ timed: true, durationSec: 60 }];
    const s = T.start(T.initTimer(steps), steps, 0);
    const f = freeze(s, 20_000);
    expect(f.status).toBe('paused');
    expect(T.remaining(f, 999_999)).toBe(40_000);
    expect(T.activeSeconds(f, 999_999)).toBe(20);
  });
});

function startStrength() {
  fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Build/ }));
  fireEvent.click(screen.getByRole('radio', { name: 'Traditional strength' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Lower body / Leg day' }));
  fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start mission' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  let guard = 0;
  while (!screen.queryByRole('button', { name: 'Set done' }) && guard++ < 60) fireEvent.click(screen.getByRole('button', { name: screen.queryByRole('button', { name: 'Done' }) ? 'Done' : 'Skip' }));
}

describe('resume after an accidental close', () => {
  it('saves progress, offers Resume on reopen, and continues at the same step with sets kept', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T18:00:00'));
    const first = render(<App initial={onboarded()} />);
    startStrength();
    const exercise = document.querySelector('.active-name')!.textContent;
    fireEvent.change(screen.getByLabelText('Reps done', { selector: 'input' }), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set done' }));
    act(() => { vi.advanceTimersByTime(10_000); });
    const snap = loadActive()!;
    expect(snap).toBeTruthy();
    expect(Object.values(snap.logs)[0].reps).toBe(11);
    const idx = snap.timer.index;

    // Accidental close: the page goes away without finishing.
    first.unmount();
    vi.setSystemTime(new Date('2026-10-06T18:20:00')); // 20 minutes later
    render(<App initial={JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') ?? onboarded()} />);
    expect(screen.getByText('Mission in progress')).toBeTruthy();
    expect(screen.getByText(/1 set logged/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Resume mission' }));

    expect(screen.getByText(/Picked up where you left off/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy(); // paused — time away not counted
    expect(document.querySelector('.active-title small')!.textContent).toMatch(new RegExp(`^${idx + 1}/`));
    // Elapsed time stayed at what was actually done, not +20 minutes.
    expect(loadActive()!.timer.activeMs).toBeLessThan(5 * 60_000);

    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish & debrief' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save to log' }));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as AppData;
    expect(saved.sessions).toHaveLength(1);
    expect(saved.sessions[0].sets[0].reps).toBe(11);
    expect(saved.sessions[0].sets[0].exerciseId).toBeTruthy();
    expect(exercise).toBeTruthy();
    expect(localStorage.getItem(ACTIVE_KEY)).toBeNull();
  });

  it('discard clears the unfinished mission; starting a new one asks first', () => {
    const first = render(<App initial={onboarded()} />);
    startStrength();
    first.unmount();
    render(<App initial={onboarded()} />);
    expect(screen.getByText('Mission in progress')).toBeTruthy();
    // starting a different mission asks before discarding
    expect(screen.queryByRole('button', { name: 'Surprise me' })).toBeNull();
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Build/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start mission' }));
    expect(screen.getByRole('dialog', { name: 'Mission in progress' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Today/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm discard' }));
    expect(screen.queryByText('Mission in progress')).toBeNull();
    expect(localStorage.getItem(ACTIVE_KEY)).toBeNull();
  });

  it('nothing is saved before Start is pressed', () => {
    render(<App initial={onboarded()} />);
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Build/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start mission' }));
    expect(localStorage.getItem(ACTIVE_KEY)).toBeNull();
  });
});
