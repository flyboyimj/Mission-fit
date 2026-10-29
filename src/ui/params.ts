import { weekOfPlan, sessionToParams, todayIso } from '../engine/plan';
import type { AppData, Inventory, Location, Readiness, WorkoutParams } from '../types';

export function inventoryFor(data: AppData, loc: Location): Inventory {
  const inv = loc === 'gym' ? data.profile.gym : data.profile.home;
  return JSON.parse(JSON.stringify(inv));
}

export function defaultParams(data: AppData): WorkoutParams {
  const loc = data.lastParams?.location ?? data.profile.defaultLocation;
  return {
    goal: data.lastParams?.goal ?? data.plan?.goal ?? 'balanced',
    focus: data.lastParams?.focus ?? 'full',
    style: data.lastParams?.style ?? 'strength-cond',
    location: loc,
    duration: data.lastParams?.duration ?? data.plan?.duration ?? 45,
    inventory: inventoryFor(data, loc),
    readiness: { energy: 3, soreness: 2, discomfort: [] },
    includeCarries: data.lastParams?.includeCarries ?? true,
    cardioMachine: data.lastParams?.cardioMachine,
    intervals: data.lastParams?.intervals,
    seed: Math.floor(Math.random() * 1e9),
  };
}

/** Params for today's plan session, or null on a rest day / no plan. */
export function planParams(data: AppData, readiness: Readiness, now = new Date()): WorkoutParams | null {
  const plan = data.plan;
  if (!plan) return null;
  const today = todayIso(now);
  const day = plan.days.find((d) => d.date === today);
  if (!day) return null;
  const sp = sessionToParams(day.type);
  if (!sp) return null;
  const base = defaultParams(data);
  return {
    ...base,
    ...sp,
    goal: plan.goal,
    duration: plan.duration,
    planWeek: weekOfPlan(plan, today) ?? undefined,
    anchors: plan.anchors,
    readiness,
    intervals: undefined,
  };
}
