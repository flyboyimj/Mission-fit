import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { defaultData } from '../src/store/storage';

function data(guidance: boolean) {
  const d = defaultData();
  d.profile.onboarded = true;
  d.profile.screening = { heartCondition: false, chestPain: false, dizziness: false, bpUncontrolled: false, otherChronic: false, medsAffectingExercise: false, boneJointWorse: false, physicianSaidSupervised: false };
  if (guidance) d.profile.clearance = { hasGuidance: true, date: '2026-10-01', notes: '', reviewBy: '2027-10-01' };
  return d;
}

describe('interval effort 7/10 and 8/10', () => {
  beforeEach(() => { window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; vi.useRealTimers(); });
  it('locked without clinician guidance: tapping 7 explains why and links to Profile', () => {
    render(<App initial={data(false)} />);
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Build/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'HIIT intervals' }));
    fireEvent.click(screen.getByRole('radio', { name: /7\/10/ }));
    expect(screen.getByText('7/10 is locked.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Record guidance in Profile' }));
    expect(screen.getByText('Service record')).toBeTruthy();
  });
  it('selectable once guidance is recorded, and the brief uses it', () => {
    render(<App initial={data(true)} />);
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Build/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'HIIT intervals' }));
    fireEvent.click(screen.getByRole('radio', { name: '8/10' }));
    expect(screen.getByRole('radio', { name: '8/10' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
    expect(screen.getByText(/effort 8\/10/)).toBeTruthy();
  });
});
