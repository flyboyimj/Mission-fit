import { useState } from 'react';
import { EXERCISES, getExercise } from '../data/exercises';
import { checkExercise, contextFrom } from '../engine/filter';
import { GOAL_LABEL } from '../engine/generator';
import { ANCHOR_PATTERNS, buildPlan, fmtDate, planWarnings, SESSION_LABEL, todayIso } from '../engine/plan';
import { useStore } from '../store/AppStore';
import type { Duration, Goal, PlanSessionType } from '../types';
import { Banner, Chips, Section } from './kit';
import { PATTERN_LABEL } from './labels';

const DAYS = [{ v: 1, l: 'Mon' }, { v: 2, l: 'Tue' }, { v: 3, l: 'Wed' }, { v: 4, l: 'Thu' }, { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' }, { v: 0, l: 'Sun' }];
const TYPES = Object.keys(SESSION_LABEL) as PlanSessionType[];

export function PlanScreen() {
  const { data, update } = useStore();
  const plan = data.plan;
  const [editing, setEditing] = useState(!plan);
  const [days, setDays] = useState<number[]>(plan?.trainingDays ?? [1, 2, 4, 5]);
  const [duration, setDuration] = useState<Duration>(plan?.duration ?? 45);
  const [goal, setGoal] = useState<Goal>(plan?.goal ?? 'balanced');
  const today = todayIso();
  const doneDates = new Set(data.sessions.map((s) => todayIso(new Date(s.startedAt))));

  const create = () => {
    const p = buildPlan({ profile: data.profile, trainingDays: days, duration, goal, start: new Date() });
    update((d) => ({ ...d, plan: p }));
    setEditing(false);
  };
  const setDayType = (date: string, type: PlanSessionType) => update((d) => d.plan ? { ...d, plan: { ...d.plan, days: d.plan.days.map((x) => (x.date === date ? { ...x, type } : x)) } } : d);
  const setAnchor = (pattern: string, id: string) => update((d) => d.plan ? { ...d, plan: { ...d.plan, anchors: { ...d.plan.anchors, [pattern]: id } } } : d);

  const inv = data.profile.defaultLocation === 'gym' ? data.profile.gym : data.profile.home;
  const ctx = contextFrom(data.profile, inv);
  const warnings = plan ? planWarnings(plan) : [];

  return (
    <div className="screen">
      <header className="screen-head">
        <p className="eyebrow">Weekly plan</p>
        <h1>Four-week block</h1>
      </header>

      {editing ? (
        <Section title={plan ? 'Rebuild plan' : 'Set up your plan'}>
          <fieldset className="field">
            <legend className="label">Training days</legend>
            <div className="chips">
              {DAYS.map((d) => (
                <button type="button" key={d.v} aria-pressed={days.includes(d.v)} className={`chip ${days.includes(d.v) ? 'on' : ''}`} onClick={() => setDays(days.includes(d.v) ? days.filter((x) => x !== d.v) : [...days, d.v])}>{d.l}</button>
              ))}
            </div>
          </fieldset>
          <Chips id="plan-goal" label="Goal" value={goal} onChange={setGoal} options={(Object.keys(GOAL_LABEL) as Goal[]).map((g) => ({ value: g, label: GOAL_LABEL[g] }))} />
          <Chips id="plan-duration" label="Session length" value={duration} onChange={setDuration} options={([15, 20, 30, 45, 60] as Duration[]).map((n) => ({ value: n, label: `${n} min` }))} />
          <p className="muted small">Hard sessions (intervals, circuits) are never placed on back-to-back days. Weeks 1–3 build gradually; week 4 is lighter so you recover and consolidate.</p>
          <div className="row">
            <button type="button" className="btn primary big" disabled={!days.length} onClick={create}>Build 4-week plan</button>
            {plan && <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
        </Section>
      ) : plan && (
        <>
          <div className="row">
            <span className="pill">{GOAL_LABEL[plan.goal]}</span>
            <span className="pill">{plan.duration} min</span>
            <button type="button" className="btn small" onClick={() => setEditing(true)}>Rebuild</button>
          </div>
          {warnings.map((w) => <Banner key={w} tone="warn">{w}</Banner>)}

          {[0, 1, 2, 3].map((wk) => (
            <Section key={wk} title={`Week ${wk + 1}${wk === 3 ? ' · lighter' : wk === 0 ? ' · conservative start' : ''}`}>
              <ul className="plan-week">
                {plan.days.slice(wk * 7, wk * 7 + 7).map((d) => (
                  <li key={d.date} className={`plan-day ${d.date === today ? 'today' : ''} ${d.date < today ? 'past' : ''}`}>
                    <span className="plan-date">{fmtDate(d.date)}{doneDates.has(d.date) && <span className="done-mark" aria-label="Completed"> ✓</span>}</span>
                    <label className="sr-only" htmlFor={`pd-${d.date}`}>Session for {fmtDate(d.date)}</label>
                    <select id={`pd-${d.date}`} className={`badge-select t-${d.type}`} value={d.type} onChange={(e) => setDayType(d.date, e.target.value as PlanSessionType)}>
                      {TYPES.map((t) => <option key={t} value={t}>{SESSION_LABEL[t]}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
            </Section>
          ))}

          <Section title="Main lifts (held for all 4 weeks)">
            <p className="muted small">Keeping the same main lifts lets you see real progress. Accessories, conditioning formats and order rotate around them.</p>
            {ANCHOR_PATTERNS.map((pat) => {
              const opts = EXERCISES.filter((e) => e.main && e.pattern === pat && checkExercise(e, ctx).ok);
              if (!opts.length) return null;
              const cur = plan.anchors[pat];
              return (
                <label key={pat} className="field" htmlFor={`anchor-${pat}`}>
                  <span className="label">{PATTERN_LABEL[pat]}</span>
                  <select id={`anchor-${pat}`} value={cur ?? ''} onChange={(e) => setAnchor(pat, e.target.value)}>
                    {!cur && <option value="">Auto</option>}
                    {opts.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  {cur && !checkExercise(getExercise(cur), ctx).ok && <small className="warn-text">Not available with current equipment/restrictions — a substitute will be used.</small>}
                </label>
              );
            })}
          </Section>

          <Section title="How intervals progress">
            <ul className="bullets small">
              <li>Week 1: 6 × 30s work / 90s easy</li>
              <li>Week 2: 8 × 30s / 90s</li>
              <li>Week 3: 6 × 45s / 75s</li>
              <li>Week 4: 5 × 30s / 90s at lower effort</li>
            </ul>
            <p className="muted small">Effort tops out at 8/10 (or 6/10 until clinician guidance is recorded). Your readiness and recent sessions can moderate any day.</p>
          </Section>
        </>
      )}
    </div>
  );
}
