import { DEFAULT_AVOID } from '../data/exercises';
import type { AppData, Inventory, Profile } from '../types';

export const STORAGE_KEY = 'missionfit.v1';

const range = (a: number, b: number, step: number) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);

export function defaultHome(): Inventory {
  return { dumbbell: true, kettlebell: true, cable: false, bench: true, machines: [], cardio: [], dumbbellWeights: range(10, 50, 5), kettlebellWeights: [18, 26, 35, 44], heavyBag: false };
}

export function defaultGym(): Inventory {
  return {
    dumbbell: true, kettlebell: true, cable: true, bench: true,
    machines: ['machine-leg-press', 'machine-chest-press', 'machine-lat-pulldown', 'machine-seated-row', 'machine-leg-curl', 'machine-leg-extension', 'machine-shoulder-press', 'machine-rear-delt', 'machine-hip-abduction', 'machine-smith'],
    cardio: ['bike', 'elliptical', 'treadmill', 'rower'],
    dumbbellWeights: range(5, 100, 5),
    kettlebellWeights: [18, 26, 35, 44, 53, 62],
    heavyBag: true,
  };
}

export function defaultProfile(): Profile {
  return {
    version: 1,
    onboarded: false,
    name: '',
    age: 0,
    units: 'lb',
    currentWeight: 0,
    goalWeight: 0,
    // Conservative starting point: each limitation is confirmed or switched off during onboarding.
    limitations: { wrist: true, lowBack: true, knee: true, foot: true, shoulder: false, hypertension: true },
    limitationsConfirmedAt: null,
    screening: { heartCondition: null, chestPain: null, dizziness: null, bpUncontrolled: null, otherChronic: null, medsAffectingExercise: null, boneJointWorse: null, physicianSaidSupervised: null },
    screeningAt: null,
    clearance: null,
    allowHighImpact: false,
    allowBallistic: false,
    avoidList: [...DEFAULT_AVOID],
    preferNeutralGrip: true,
    loadedMain: true,
    showVerses: true,
    home: defaultHome(),
    gym: defaultGym(),
    audioCues: true,
    voiceCues: false,
    defaultLocation: 'gym',
  };
}

export function defaultData(): AppData {
  return { version: 1, profile: defaultProfile(), sessions: [], body: [], plan: null, favorites: [], lastParams: null };
}

export function storageAvailable(): boolean {
  try {
    const k = '__mf_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function loadData(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    return migrate(JSON.parse(raw));
  } catch {
    return defaultData();
  }
}

export function saveData(data: AppData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearData(): boolean {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Merge stored data onto defaults so new fields always exist. */
export function migrate(input: unknown): AppData {
  const d = defaultData();
  if (!input || typeof input !== 'object') throw new Error('Not a Mission Fit backup.');
  const o = input as Partial<AppData> & { app?: string };
  if (o.version !== 1) throw new Error('Unsupported backup version.');
  const profile = { ...d.profile, ...(o.profile ?? {}) } as Profile;
  profile.limitations = { ...d.profile.limitations, ...(o.profile?.limitations ?? {}) };
  profile.screening = { ...d.profile.screening, ...(o.profile?.screening ?? {}) };
  profile.home = { ...d.profile.home, ...(o.profile?.home ?? {}) };
  profile.gym = { ...d.profile.gym, ...(o.profile?.gym ?? {}) };
  // Smith machine was added later: give it to gyms that still have the full default machine list.
  if (o.profile?.gym?.machines && !profile.gym.machines.includes('machine-smith') && profile.gym.machines.length >= 9) {
    profile.gym = { ...profile.gym, machines: [...profile.gym.machines, 'machine-smith'] };
  }
  return {
    version: 1,
    profile,
    sessions: Array.isArray(o.sessions) ? o.sessions : [],
    body: Array.isArray(o.body) ? o.body : d.body,
    plan: o.plan ?? null,
    favorites: Array.isArray(o.favorites) ? o.favorites : [],
    lastParams: o.lastParams ?? null,
  };
}

export function exportJson(data: AppData): string {
  return JSON.stringify({ app: 'Mission Fit', exportedAt: new Date().toISOString(), ...data }, null, 2);
}

export function importJson(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const o = parsed as { app?: string };
  if (o && o.app && o.app !== 'Mission Fit') throw new Error('This backup is from a different app.');
  const data = migrate(parsed);
  if (!Array.isArray((parsed as AppData).sessions)) throw new Error('Backup is missing workout history.');
  return data;
}
