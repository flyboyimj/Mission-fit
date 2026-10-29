import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { pickVerse, themesForStyle, VERSES } from '../src/data/verses';
import { defaultData } from '../src/store/storage';

function onboarded() {
  const d = defaultData();
  d.profile.onboarded = true;
  d.profile.screening = { heartCondition: false, chestPain: false, dizziness: false, bpUncontrolled: false, otherChronic: false, medsAffectingExercise: false, boneJointWorse: false, physicianSaidSupervised: false };
  return d;
}

describe('verses', () => {
  it('every verse has a reference, text and at least one theme; references are unique', () => {
    const refs = new Set(VERSES.map((v) => v.ref));
    expect(refs.size).toBe(VERSES.length);
    for (const v of VERSES) { expect(v.ref).toMatch(/^[1-3]? ?[A-Z][a-z]+.* \d+:\d+/); expect(v.text.length).toBeGreaterThan(10); expect(v.themes.length).toBeGreaterThan(0); }
  });
  it('picks match the theme and are stable for the same key', () => {
    for (const style of ['boxing', 'hiit', 'circuit', 'recovery', 'strength', 'strength-cond', 'steady']) {
      const themes = themesForStyle(style);
      const v = pickVerse(themes, 'w-123');
      expect(v.themes.some((t) => themes.includes(t))).toBe(true);
      expect(pickVerse(themes, 'w-123')).toBe(v);
    }
    expect(pickVerse(['fight'], 'x').themes).toContain('fight');
  });
  it('shows on Today and in the brief, and the Profile toggle hides them', () => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    render(<App initial={onboarded()} />);
    expect(screen.getByText('Verse for today')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Build/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Boxing rounds' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
    const fightRefs = VERSES.filter((v) => v.themes.includes('fight')).map((v) => v.ref);
    expect(fightRefs.some((r) => screen.queryByText(new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Profile and restrictions' }));
    fireEvent.click(screen.getByLabelText(/Show Bible verses/));
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Today/ }));
    expect(screen.queryByText('Verse for today')).toBeNull();
  });
});
