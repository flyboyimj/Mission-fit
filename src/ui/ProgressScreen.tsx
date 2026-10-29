import { useState } from 'react';
import { getExercise } from '../data/exercises';
import { blocksToSteps, estimateSec, STYLE_LABEL } from '../engine/generator';
import { todayIso } from '../engine/plan';
import { fmtDuration, liftTrend, trackedLifts, weeklyStats } from '../engine/stats';
import { useStore } from '../store/AppStore';
import type { Workout } from '../types';
import { BarChart, LineChart } from './Charts';
import { Banner, Section } from './kit';

export function ProgressScreen({ onRepeat }: { onRepeat: (w: Workout) => void }) {
  const { data, update } = useStore();
  const [w, setW] = useState('');
  const [waist, setWaist] = useState('');
  const [date, setDate] = useState(todayIso());
  const lifts = trackedLifts(data.sessions);
  const [lift, setLift] = useState(lifts[0] ?? '');
  const weeks = weeklyStats(data.sessions, 8);
  const body = [...data.body].sort((a, b) => a.date.localeCompare(b.date));
  const weightPts = body.filter((b) => b.weight).map((b) => ({ x: b.date.slice(5), y: b.weight! }));
  const waistPts = body.filter((b) => b.waist).map((b) => ({ x: b.date.slice(5), y: b.waist! }));
  const trend = lift ? liftTrend(lift, data.sessions) : [];
  const sessions = [...data.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const intervalSessions = sessions.filter((s) => s.intervalsPlanned > 0).slice(0, 8).reverse();

  const logBody = () => {
    const weight = parseFloat(w);
    const wa = parseFloat(waist);
    if (isNaN(weight) && isNaN(wa)) return;
    update((d) => {
      const others = d.body.filter((b) => b.date !== date);
      const existing = d.body.find((b) => b.date === date);
      const entry = { date, weight: isNaN(weight) ? existing?.weight : weight, waist: isNaN(wa) ? existing?.waist : wa };
      const latest = [...others, entry].filter((b) => b.weight).sort((a, b) => b.date.localeCompare(a.date))[0];
      return { ...d, body: [...others, entry], profile: latest?.weight ? { ...d.profile, currentWeight: latest.weight } : d.profile };
    });
    setW(''); setWaist('');
  };

  const deleteSession = (id: string) => update((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));

  return (
    <div className="screen">
      <header className="screen-head">
        <p className="eyebrow">Progress</p>
        <h1>After-action report</h1>
      </header>

      <Section title="Body weight">
        <LineChart label="Body weight over time" points={weightPts} goal={data.profile.goalWeight || undefined} unit=" lb" />
        <label className="field" htmlFor="bw-date"><span className="label">Date</span><input id="bw-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <div className="grid2">
          <label className="field" htmlFor="bw-w"><span className="label">Weight (lb)</span><input id="bw-w" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} placeholder={data.profile.currentWeight ? String(data.profile.currentWeight) : ''} /></label>
          <label className="field" htmlFor="bw-waist"><span className="label">Waist (in, optional)</span><input id="bw-waist" inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} /></label>
        </div>
        <button type="button" className="btn primary" onClick={logBody}>Log measurement</button>
        {waistPts.length > 0 && <LineChart label="Waist measurement" points={waistPts} unit=" in" height={120} />}
        <p className="muted small">Weight moves day to day with water and food. Look at the trend over weeks. Fat loss depends mainly on nutrition and overall energy balance; training supports it but no plan can guarantee a result. Mission Fit does not estimate calories burned.</p>
      </Section>

      <Section title="Weekly cardio minutes">
        <BarChart label="Cardio minutes per week" bars={weeks.map((x) => ({ x: x.week.slice(5), y: x.cardioMin }))} guide={150} />
        <p className="muted small">Counted from completed cardio steps (intervals, steady cardio, cardio stations). Dashed line: 150 min reference.</p>
      </Section>

      <Section title="Strength days per week">
        <BarChart label="Strength days per week" bars={weeks.map((x) => ({ x: x.week.slice(5), y: x.strengthDays }))} guide={2} height={120} />
      </Section>

      <Section title="Lift trends">
        {lifts.length ? (
          <>
            <label className="field" htmlFor="lift-sel"><span className="label">Exercise</span>
              <select id="lift-sel" value={lift} onChange={(e) => setLift(e.target.value)}>
                {lifts.map((id) => <option key={id} value={id}>{getExercise(id).name}</option>)}
              </select>
            </label>
            <LineChart label="Top set weight" points={trend.map((t) => ({ x: t.date.slice(5), y: t.topWeight }))} unit=" lb" />
            <table className="table">
              <thead><tr><th>Date</th><th>Top set</th><th>Est. 1-rep max*</th></tr></thead>
              <tbody>{trend.slice(-6).reverse().map((t) => <tr key={t.date}><td>{t.date.slice(5)}</td><td>{t.topWeight} × {t.topReps}</td><td>{t.e1rm}</td></tr>)}</tbody>
            </table>
            <p className="muted small">*Estimate from the Epley formula — for tracking trends only. Mission Fit never asks you to test a max.</p>
          </>
        ) : <p className="muted">Log sets during a strength workout to see trends here.</p>}
      </Section>

      <Section title="Conditioning">
        {intervalSessions.length ? (
          <BarChart label="Intervals completed per session" bars={intervalSessions.map((s) => ({ x: todayIso(new Date(s.startedAt)).slice(5), y: s.intervalsCompleted }))} height={120} />
        ) : <p className="muted">Complete an interval session to track completed intervals.</p>}
      </Section>

      <Section title="Session log">
        {sessions.length === 0 && <Banner tone="info">No sessions yet. Your history is stored only on this device.</Banner>}
        <ul className="list">
          {sessions.slice(0, 30).map((s) => {
            const snap = s.workout ?? data.favorites.find((f) => f.workout.id === s.workoutId)?.workout;
            return (
              <li key={s.id} className="log-row">
                <div className="log-main">
                  <strong>{s.name}</strong>
                  <span className="muted small">{new Date(s.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {STYLE_LABEL[s.style]} · {fmtDuration(s.activeSec)}</span>
                  <span className="small">
                    {Math.round((s.completedSteps / Math.max(1, s.totalSteps)) * 100)}% done
                    {s.sets.length ? ` · ${s.sets.length} sets` : ''}
                    {s.intervalsPlanned ? ` · ${s.intervalsCompleted}/${s.intervalsPlanned} intervals` : ''}
                    {s.sessionRpe ? ` · effort ${s.sessionRpe}` : ''}
                    {s.soreness ? ` · soreness ${s.soreness}` : ''}
                    {s.discomfort.length ? ` · discomfort: ${s.discomfort.join(', ')}` : ''}
                  </span>
                </div>
                <div className="log-actions">
                  {snap && <button type="button" className="btn small" onClick={() => onRepeat(rehydrate(snap))}>Repeat</button>}
                  <DeleteButton onConfirm={() => deleteSession(s.id)} />
                </div>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return armed
    ? <button type="button" className="btn small danger" onClick={onConfirm} onBlur={() => setArmed(false)}>Confirm delete</button>
    : <button type="button" className="btn small ghost" onClick={() => setArmed(true)}>Delete</button>;
}

/** Saved snapshots drop their step list to save space; rebuild it from the blocks. */
export function rehydrate(w: Workout): Workout {
  const steps = w.steps?.length ? w.steps : blocksToSteps(w.blocks);
  return { ...w, id: `w-${Date.now()}`, steps, estimatedSec: estimateSec(steps), createdAt: new Date().toISOString() };
}
