import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { demoQuery, demoUrl } from '../src/data/demo';
import { EXERCISES, getExercise } from '../src/data/exercises';
import { defaultData } from '../src/store/storage';

describe('exercise examples', () => {
  it('every exercise has a clean YouTube search link', () => {
    for (const ex of EXERCISES) {
      const q = demoQuery(ex);
      expect(q.length, ex.id).toBeGreaterThan(3);
      expect(q).not.toMatch(/[()—]/);
      const u = new URL(demoUrl(ex));
      expect(u.origin).toBe('https://www.youtube.com');
      expect(u.searchParams.get('search_query')).toBe(`${q} proper form`);
    }
    expect(demoQuery(getExercise('db-bench-neutral'))).toBe('neutral grip dumbbell bench press');
    expect(demoQuery(getExercise('db-pullover'))).toBe('Dumbbell Pullover');
  });

  it('shows "Watch an example" in the mission brief and the library', () => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    const d = defaultData();
    d.profile.onboarded = true;
    d.profile.screening = { heartCondition: false, chestPain: false, dizziness: false, bpUncontrolled: false, otherChronic: false, medsAffectingExercise: false, boneJointWorse: false, physicianSaidSupervised: false };
    render(<App initial={d} />);
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Build/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate mission' }));
    const links = screen.getAllByRole('link', { name: /Watch an example of/ });
    expect(links.length).toBeGreaterThan(3);
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[0].getAttribute('href')).toMatch(/^https:\/\/www\.youtube\.com\/results\?search_query=/);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /Library/ }));
    fireEvent.click(screen.getByText('Goblet Squat'));
    expect(screen.getByRole('link', { name: 'Watch an example of Goblet Squat (opens YouTube)' })).toBeTruthy();
  });
});
