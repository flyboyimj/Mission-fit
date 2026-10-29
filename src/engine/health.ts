import type { Profile, ScreeningAnswers } from '../types';

/** Plain-language 1–10 perceived-effort scale. */
export const RPE_SCALE: { value: number; label: string; desc: string }[] = [
  { value: 1, label: 'Very easy', desc: 'Resting or strolling.' },
  { value: 2, label: 'Easy', desc: 'Could do this all day.' },
  { value: 3, label: 'Light', desc: 'Breathing barely changes; full conversation.' },
  { value: 4, label: 'Comfortable', desc: 'Warm, breathing a little deeper; easy to talk.' },
  { value: 5, label: 'Moderate', desc: 'Breathing harder; you can still talk in full sentences.' },
  { value: 6, label: 'Steady-hard', desc: 'Talking in short sentences; about 4 reps left in the tank.' },
  { value: 7, label: 'Hard', desc: 'A few words at a time; about 3 reps left in reserve.' },
  { value: 8, label: 'Very hard', desc: 'Hard to speak; 2 reps left. Upper limit for intervals in this app.' },
  { value: 9, label: 'Near max', desc: '1 rep left. Not prescribed in Mission Fit.' },
  { value: 10, label: 'All-out', desc: 'Maximal. Never prescribed in Mission Fit.' },
];

export const SCREENING_QUESTIONS: { key: keyof ScreeningAnswers; text: string }[] = [
  { key: 'heartCondition', text: 'Has a clinician ever told you that you have a heart condition, or have you had a heart procedure?' },
  { key: 'chestPain', text: 'In the past 12 months, have you had chest pain, pressure or tightness — at rest or during activity?' },
  { key: 'dizziness', text: 'In the past 12 months, have you fainted, lost balance from dizziness, or had unusual shortness of breath?' },
  { key: 'bpUncontrolled', text: 'Is your blood pressure not well controlled right now, or has your blood-pressure medication changed recently?' },
  { key: 'otherChronic', text: 'Do you have another ongoing medical condition (for example diabetes, kidney or lung disease) that affects activity?' },
  { key: 'medsAffectingExercise', text: 'Do you take medication that a clinician said could affect your heart rate or exercise response (for example a beta-blocker)?' },
  { key: 'boneJointWorse', text: 'Has a bone, joint or soft-tissue problem gotten worse recently with activity?' },
  { key: 'physicianSaidSupervised', text: 'Has a clinician told you to exercise only under medical supervision?' },
];

export function screeningComplete(s: ScreeningAnswers): boolean {
  return Object.values(s).every((v) => v !== null);
}

export function screeningFlags(profile: Profile): string[] {
  const flags: string[] = [];
  const s = profile.screening;
  for (const q of SCREENING_QUESTIONS) if (s[q.key]) flags.push(q.text);
  if (profile.limitations.hypertension) flags.push('You reported high blood pressure (hypertension).');
  return flags;
}

/** Urgent flags mean: talk to a clinician before training at all. */
export function urgentFlags(profile: Profile): boolean {
  const s = profile.screening;
  return !!(s.chestPain || s.dizziness || s.physicianSaidSupervised);
}

export function needsGuidanceForVigorous(profile: Profile): boolean {
  return screeningFlags(profile).length > 0 || !screeningComplete(profile.screening);
}

/** Clinician guidance is valid only until its review date — never permanent clearance. */
export function clearanceValid(profile: Profile, now = new Date()): boolean {
  const c = profile.clearance;
  if (!c || !c.hasGuidance) return false;
  if (urgentFlagsChangedSince(profile)) return false;
  const review = new Date(c.reviewBy);
  return !isNaN(review.getTime()) && review.getTime() >= startOfDay(now).getTime();
}

function urgentFlagsChangedSince(profile: Profile): boolean {
  // If new urgent symptoms were reported after the guidance date, guidance no longer applies.
  if (!profile.clearance || !profile.screeningAt) return false;
  return urgentFlags(profile) && new Date(profile.screeningAt) > new Date(profile.clearance.date);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export interface EffortCap {
  maxRpe: number;
  vigorousAllowed: boolean;
  reason: string;
}

/** Overall effort ceiling. Never above 8. */
export function effortCap(profile: Profile, now = new Date()): EffortCap {
  if (needsGuidanceForVigorous(profile) && !clearanceValid(profile, now)) {
    return {
      maxRpe: 6,
      vigorousAllowed: false,
      reason: 'Effort is capped at moderate (6/10) until you record clinician guidance for vigorous exercise in Profile.',
    };
  }
  return { maxRpe: 8, vigorousAllowed: true, reason: 'Effort ceiling 8/10 — Mission Fit never prescribes all-out efforts.' };
}

export const STOP_SYMPTOMS = [
  'Chest pain, pressure, tightness or discomfort spreading to arm, jaw, neck or back',
  'Feeling faint, dizzy or light-headed',
  'Unusual or severe shortness of breath',
  'A racing, pounding or irregular heartbeat that is new for you',
  'Sudden severe headache, confusion, or vision changes',
  'Sharp or worsening joint pain',
];

export const STOP_TEXT =
  'Stop exercising right away if you notice any of these. If chest pain, fainting or severe breathlessness does not settle quickly with rest, call emergency services (911 in the US).';

export function defaultReviewDate(from = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 12);
  return d.toISOString().slice(0, 10);
}
