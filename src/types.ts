// Core domain types for Mission Fit.

export type Equip =
  | 'dumbbell'
  | 'kettlebell'
  | 'cable'
  | 'bench'
  | 'machine-leg-press'
  | 'machine-chest-press'
  | 'machine-lat-pulldown'
  | 'machine-seated-row'
  | 'machine-leg-curl'
  | 'machine-leg-extension'
  | 'machine-shoulder-press'
  | 'machine-rear-delt'
  | 'machine-smith'
  | 'machine-hip-abduction'
  | 'bike'
  | 'elliptical'
  | 'treadmill'
  | 'rower'
  | 'heavy-bag'
  | 'none';

export type StrengthEquipGroup = 'dumbbell' | 'kettlebell' | 'machine' | 'cable';
export type CardioMachine = 'bike' | 'elliptical' | 'treadmill' | 'rower';

export type Pattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'h-push'
  | 'v-push'
  | 'h-pull'
  | 'v-pull'
  | 'carry'
  | 'core'
  | 'arms'
  | 'calves'
  | 'shoulder-iso'
  | 'cardio'
  | 'mobility';

export type Limitation = 'wrist' | 'lowBack' | 'knee' | 'foot' | 'shoulder' | 'hypertension';
export type LimitRule = 'avoid' | 'caution';

export type Impact = 'none' | 'low' | 'high';
export type ExerciseKind = 'strength' | 'cardio' | 'carry' | 'core' | 'mobility' | 'warmup';

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  /** Any one option satisfies; every item inside an option is required. [['none']] = bodyweight. */
  equipOptions: Equip[][];
  /** Where this exercise can appear. */
  phase?: ('warmup' | 'cooldown' | 'main')[];
  pattern: Pattern;
  muscles: string[];
  impact: Impact;
  ballistic?: boolean;
  /** How this movement interacts with each limitation when that limitation is active. */
  limits: Partial<Record<Limitation, LimitRule>>;
  /** What to do differently under a 'caution' limitation. */
  modifications?: Partial<Record<Limitation, string>>;
  cues: string[];
  breathing: string;
  /** Unilateral movements take longer per set. */
  unilateral?: boolean;
  /** Can be used as a timed station in circuits. */
  circuitOk?: boolean;
  /** Main compound lift suitable for progression tracking. */
  main?: boolean;
  grip?: 'neutral' | 'pronated' | 'supinated' | 'none' | 'any';
  tags?: string[];
}

export type Goal = 'cardio' | 'fatloss' | 'muscle' | 'strength' | 'balanced';
export type Focus = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'core';
export type BodyPart = 'chest' | 'shoulders' | 'triceps' | 'back' | 'biceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core';
export type Style = 'circuit' | 'hiit' | 'strength' | 'strength-cond' | 'steady' | 'recovery' | 'boxing';
export type Location = 'home' | 'gym';
export type Duration = 15 | 20 | 30 | 45 | 60;

export interface Inventory {
  dumbbell: boolean;
  kettlebell: boolean;
  cable: boolean;
  bench: boolean;
  machines: Equip[]; // machine-* ids
  cardio: CardioMachine[];
  dumbbellWeights: number[]; // lb
  kettlebellWeights: number[]; // lb
  heavyBag?: boolean;
}

export interface ScreeningAnswers {
  heartCondition: boolean | null;
  chestPain: boolean | null;
  dizziness: boolean | null;
  bpUncontrolled: boolean | null; // BP not well-controlled or meds recently changed
  otherChronic: boolean | null;
  medsAffectingExercise: boolean | null;
  boneJointWorse: boolean | null;
  physicianSaidSupervised: boolean | null;
}

export interface Clearance {
  hasGuidance: boolean;
  date: string; // ISO date
  notes: string;
  /** Clearance is reviewed periodically, not permanent. */
  reviewBy: string;
}

export interface Profile {
  version: 1;
  onboarded: boolean;
  name: string;
  age: number;
  units: 'lb';
  currentWeight: number;
  goalWeight: number;
  /** Limitation -> active? Confirmed in onboarding. */
  limitations: Record<Limitation, boolean>;
  limitationsConfirmedAt: string | null;
  screening: ScreeningAnswers;
  screeningAt: string | null;
  clearance: Clearance | null;
  allowHighImpact: boolean;
  allowBallistic: boolean;
  /** Exercise ids the user does not want to see. */
  avoidList: string[];
  preferNeutralGrip: boolean;
  /** Main work uses weights/cables/machines; bodyweight only in warm-up, cool-down and recovery. */
  loadedMain: boolean;
  /** Show KJV scripture on Today, briefs, rest screens and debriefs. */
  showVerses: boolean;
  home: Inventory;
  gym: Inventory;
  audioCues: boolean;
  voiceCues: boolean;
  defaultLocation: Location;
}

export interface Readiness {
  energy: 1 | 2 | 3 | 4 | 5;
  soreness: 1 | 2 | 3 | 4 | 5;
  discomfort: Limitation[];
}

export interface IntervalConfig {
  workSec: number;
  restSec: number;
  rounds: number;
  workRpe: number;
  restRpe: number;
}

export interface WorkoutParams {
  goal: Goal;
  focus: Focus;
  style: Style;
  location: Location;
  duration: Duration;
  /** Today's equipment, narrowed from the inventory. */
  inventory: Inventory;
  readiness: Readiness;
  includeCarries: boolean;
  /** When set, the strength work is built only from these body parts (overrides focus). */
  bodyParts?: BodyPart[];
  intervals?: Partial<IntervalConfig>;
  /** Preferred cardio machine for intervals/conditioning. */
  cardioMachine?: CardioMachine | 'none';
  /** Allow hard intervals even if a hard session happened recently. */
  overrideRecovery?: boolean;
  /** Week number in the 4-week plan, 1-4 (4 = lighter week). */
  planWeek?: number;
  seed: number;
  /** Exercise ids to avoid for variety (e.g. from previous version). */
  avoidIds?: string[];
  /** Pattern -> anchor exercise id from the plan. */
  anchors?: Partial<Record<Pattern, string>>;
}

export type StepKind = 'warmup' | 'set' | 'rest' | 'station' | 'interval-work' | 'interval-rest' | 'cardio' | 'cooldown' | 'transition';

export interface Step {
  id: string;
  kind: StepKind;
  exerciseId?: string;
  label: string;
  /** Seconds for timed steps. For 'set' steps this is an estimate only. */
  durationSec: number;
  timed: boolean;
  reps?: string; // "8–10"
  repTarget?: [number, number];
  setNumber?: number;
  totalSets?: number;
  round?: number;
  totalRounds?: number;
  rpe?: string; // e.g. "6–7"
  note?: string;
  drill?: string;
  /** e.g. 'A1' when part of a superset. */
  group?: string;
  blockId: string;
}

export interface Block {
  id: string;
  title: string;
  kind: 'warmup' | 'strength' | 'circuit' | 'intervals' | 'steady' | 'carry' | 'cooldown' | 'core' | 'recovery' | 'rounds';
  description: string;
  items: BlockItem[];
  rounds?: number;
  restBetweenRoundsSec?: number;
}

export interface BlockItem {
  exerciseId: string;
  sets?: number;
  reps?: string;
  repTarget?: [number, number];
  workSec?: number;
  restSec: number;
  rpe: string;
  loadGuidance?: string;
  suggestion?: string;
  note?: string;
  /** Do light ramp-up sets before the working sets. */
  rampUp?: boolean;
  /** Boxing round focus, e.g. a combination. */
  drill?: string;
  /** Superset/triset label: items sharing a group are done back-to-back. */
  group?: string;
}

export interface Workout {
  id: string;
  createdAt: string;
  name: string;
  objective: string;
  params: WorkoutParams;
  blocks: Block[];
  steps: Step[];
  estimatedSec: number;
  fitExplanation: string;
  typeExplanation: string;
  warnings: string[];
  removed: { exerciseId?: string; reason: string }[];
  hardSession: boolean;
}

export type GenerateResult = { ok: true; workout: Workout } | { ok: false; error: string; details: string[] };

export interface SetLog {
  exerciseId: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  pain: boolean;
  goodForm: boolean;
}

export interface SessionLog {
  id: string;
  workoutId: string;
  name: string;
  style: Style;
  focus: Focus;
  goal: Goal;
  startedAt: string;
  endedAt: string;
  activeSec: number;
  plannedSec: number;
  completedSteps: number;
  totalSteps: number;
  sets: SetLog[];
  intervalsCompleted: number;
  intervalsPlanned: number;
  cardioMinutes: number;
  isStrengthDay: boolean;
  sessionRpe: number | null;
  soreness: number | null;
  discomfort: Limitation[];
  notes: string;
  hard: boolean;
  muscles: string[];
  substitutions: { from: string; to: string | null; reason: string }[];
  /** Snapshot so the session can be repeated. */
  workout?: Workout;
}

export interface BodyLog {
  date: string;
  weight?: number;
  waist?: number;
}

export type PlanSessionType = 'strength-push' | 'strength-pull' | 'strength-upper' | 'strength-lower' | 'strength-full' | 'intervals' | 'circuit' | 'boxing' | 'steady' | 'recovery' | 'rest';

export interface PlanDay {
  date: string; // ISO date
  type: PlanSessionType;
  done?: boolean;
}

export interface Plan {
  createdAt: string;
  startDate: string;
  trainingDays: number[]; // 0=Sun..6=Sat
  duration: Duration;
  goal: Goal;
  anchors: Partial<Record<Pattern, string>>;
  days: PlanDay[];
}

export interface Favorite {
  id: string;
  name: string;
  savedAt: string;
  workout: Workout;
}

export interface AppData {
  version: 1;
  profile: Profile;
  sessions: SessionLog[];
  body: BodyLog[];
  plan: Plan | null;
  favorites: Favorite[];
  lastParams: Partial<WorkoutParams> | null;
}
