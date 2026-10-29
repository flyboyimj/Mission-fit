import type { CardioMachine, Equip, Limitation, Pattern } from '../types';

export const MACHINES: { id: Equip; label: string }[] = [
  { id: 'machine-leg-press', label: 'Leg press' },
  { id: 'machine-chest-press', label: 'Chest press' },
  { id: 'machine-lat-pulldown', label: 'Lat pulldown' },
  { id: 'machine-seated-row', label: 'Seated row' },
  { id: 'machine-leg-curl', label: 'Leg curl' },
  { id: 'machine-leg-extension', label: 'Leg extension' },
  { id: 'machine-shoulder-press', label: 'Shoulder press' },
  { id: 'machine-rear-delt', label: 'Pec deck / rear delt' },
  { id: 'machine-smith', label: 'Smith machine' },
  { id: 'machine-hip-abduction', label: 'Hip abduction' },
];

export const CARDIO: { id: CardioMachine; label: string }[] = [
  { id: 'bike', label: 'Stationary bike' },
  { id: 'elliptical', label: 'Elliptical' },
  { id: 'treadmill', label: 'Treadmill' },
  { id: 'rower', label: 'Rower' },
];

export const EQUIP_LABEL: Record<string, string> = {
  none: 'Bodyweight', 'heavy-bag': 'Heavy bag', dumbbell: 'Dumbbells', kettlebell: 'Kettlebell', cable: 'Cable', bench: 'Bench',
  ...Object.fromEntries(MACHINES.map((m) => [m.id, m.label])),
  ...Object.fromEntries(CARDIO.map((m) => [m.id, m.label])),
};

export const PATTERN_LABEL: Record<Pattern, string> = {
  squat: 'Squat', hinge: 'Hinge', lunge: 'Single-leg', 'h-push': 'Horizontal push', 'v-push': 'Vertical push',
  'h-pull': 'Horizontal pull', 'v-pull': 'Vertical pull', carry: 'Carry', core: 'Core', arms: 'Arms', calves: 'Calves',
  'shoulder-iso': 'Shoulders', cardio: 'Cardio', mobility: 'Mobility',
};

export const LIMIT_OPTIONS: { value: Limitation; label: string }[] = [
  { value: 'wrist', label: 'Wrists' },
  { value: 'lowBack', label: 'Lower back' },
  { value: 'knee', label: 'Knees' },
  { value: 'foot', label: 'Feet' },
  { value: 'shoulder', label: 'Shoulders' },
];

export function equipText(options: Equip[][]): string {
  return options.map((o) => o.map((e) => EQUIP_LABEL[e] ?? e).join(' + ')).join(' or ');
}

/** Parse "10-50 by 5" or "10, 15, 20" into a sorted list. */
export function parseWeights(text: string): number[] {
  const t = text.trim().toLowerCase();
  const m = t.match(/^(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)(?:\s*(?:by|step|x)\s*(\d+(?:\.\d+)?))?$/);
  if (m) {
    const a = +m[1], b = +m[2], s = +(m[3] ?? 5);
    if (s <= 0 || b < a) return [];
    const out: number[] = [];
    for (let w = a; w <= b + 1e-9; w += s) out.push(+w.toFixed(1));
    return out;
  }
  return [...new Set(t.split(/[\s,;]+/).map(Number).filter((n) => n > 0))].sort((x, y) => x - y);
}

export function weightsText(w: number[]): string {
  if (!w.length) return '';
  const sorted = [...w].sort((a, b) => a - b);
  const step = sorted[1] - sorted[0];
  if (sorted.length > 3 && sorted.every((x, i) => i === 0 || Math.abs(x - sorted[i - 1] - step) < 1e-6)) return `${sorted[0]}-${sorted[sorted.length - 1]} by ${step}`;
  return sorted.join(', ');
}
