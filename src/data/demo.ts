import type { Exercise } from '../types';

/** Better search phrases where the app's exercise name is too specific for a useful video search. */
const QUERY: Record<string, string> = {
  'loaded-march': 'standing dumbbell march in place',
  'kb-goblet-march': 'goblet hold march in place',
  'machine-fly': 'pec deck machine chest fly',
  'shadow-boxing': 'shadow boxing combinations for beginners',
  'shadow-defense': 'shadow boxing slips rolls footwork drill',
  'bag-straight': 'heavy bag jab cross technique beginners',
  'bag-hooks': 'heavy bag hooks uppercuts body shots technique',
  'breathing-reset': 'box breathing 4 6 exhale relaxation',
  'standing-cat-camel': 'standing cat camel spine mobility',
  'supported-sl-rdl': 'kickstand single leg romanian deadlift dumbbell',
  'db-floor-press': 'neutral grip dumbbell floor press',
  'db-bench-neutral': 'neutral grip dumbbell bench press',
  'db-incline-press': 'neutral grip incline dumbbell press',
  'chest-supported-row': 'chest supported dumbbell row incline bench',
  'smith-shoulder-press': 'seated smith machine shoulder press',
  'db-leg-curl': 'prone dumbbell leg curl bench',
  'step-touch': 'low impact step touch cardio',
  'treadmill-walk': 'incline treadmill walking',
};

/** Clean the display name into a search phrase: drop parentheses and app-specific words. */
export function demoQuery(ex: Exercise): string {
  if (QUERY[ex.id]) return QUERY[ex.id];
  return ex.name
    .replace(/\(([^)]*)\)/g, ' $1 ')
    .replace(/\b(light|small range|reduced range|short holds|low impact|one side|fists or forearms|low box|unsupported)\b/gi, ' ')
    .replace(/[—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Opens in a new tab: a YouTube search for proper-form demos of this exercise. */
export function demoUrl(ex: Exercise): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${demoQuery(ex)} proper form`)}`;
}
