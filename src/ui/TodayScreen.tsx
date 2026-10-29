import { useState } from 'react';
import { generateWorkout, recentHardSession, STYLE_LABEL } from '../engine/generator';
import { effortCap, urgentFlags } from '../engine/health';
import { fmtDate, HARD_TYPES, SESSION_LABEL, todayIso, weekOfPlan } from '../engine/plan';
import type { PlanSessionType } from '../types';
import { fmtDuration, weeklyStats } from '../engine/stats';
import type { ActiveSnapshot } from '../store/activeSession';
import { useStore } from '../store/AppStore';
import type { Readiness, Workout } from '../types';
import { pickVerse, type VerseTheme } from '../data/verses';
import { Banner, Section, SafetyContent, Sheet, Toggle, VerseCard } from './kit';
import { defaultParams, planParams } from './params';
import { ReadinessCheck } from './Readiness';

export function TodayScreen({ onBrief, go, resume, onResume, onDiscard }: { onBrief: (w: Workout) => void; go: (tab: string) => void; resume?: ActiveSnapshot | null; onResume?: () => void; onDiscard?: () => void }) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const { data, update } = useStore();
  const [readiness, setReadiness] = useState<Readiness>({ energy: 3, soreness: 2, discomfort: [] });
  const [checkOpen, setCheckOpen] = useState<null | 'plan' | 'recovery'>(null);
  const [safety, setSafety] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const today = todayIso(now);
  const plan = data.plan;
  const planDay = plan?.days.find((d) => d.date === today);
  const week = plan ? weekOfPlan(plan, today) : null;
  const [switchOpen, setSwitchOpen] = useState(false);
  const [swapWith, setSwapWith] = useState(true);
  const [switchNote, setSwitchNote] = useState<string | null>(null);
  const todayIdx = plan ? plan.days.findIndex((d) => d.date === today) : -1;
  const weekDays = plan && todayIdx >= 0 ? plan.days.slice(Math.floor(todayIdx / 7) * 7, Math.floor(todayIdx / 7) * 7 + 7) : [];
  /** The next day later this week that already has the chosen session — it can take today's session instead. */
  const swapCandidate = (t: PlanSessionType) => weekDays.find((d) => d.date > today && d.type === t);
  const switchTo = (t: PlanSessionType) => {
    if (!plan || !planDay) return;
    const original = planDay.type;
    const other = swapWith ? swapCandidate(t) : undefined;
    const days = plan.days.map((d) => (d.date === today ? { ...d, type: t } : other && d.date === other.date ? { ...d, type: original } : d));
    // Warn (don't block) if the change puts two hard sessions back to back.
    const i = days.findIndex((d) => d.date === today);
    const hardNext = [days[i - 1], days[i + 1]].some((d) => d && HARD_TYPES.includes(d.type)) && HARD_TYPES.includes(t);
    update((d) => ({ ...d, plan: d.plan ? { ...d.plan, days } : d.plan }));
    setSwitchNote(
      `Today is now ${SESSION_LABEL[t]}.` +
      (other ? ` ${SESSION_LABEL[original]} moved to ${fmtDate(other.date)}.` : '') +
      (hardNext ? ' Heads up: that puts two hard sessions back to back — effort will be moderated if you trained hard yesterday.' : ''),
    );
    setSwitchOpen(false);
  };
  const cap = effortCap(data.profile);
  const stats = weeklyStats(data.sessions, 1)[0];
  const doneToday = data.sessions.some((s) => todayIso(new Date(s.startedAt)) === today);
  const lastHard = recentHardSession(data.sessions, now);
  const greeting = now.getHours() < 12 ? 'Morning' : now.getHours() < 18 ? 'Afternoon' : 'Evening';

  const launch = () => {
    let params = checkOpen === 'plan' ? planParams(data, readiness) : null;
    if (checkOpen === 'recovery' || (!params && checkOpen === 'plan')) params = { ...defaultParams(data), style: 'recovery', focus: 'full', duration: 20, readiness };
    if (!params) return;
    const r = generateWorkout(params, { profile: data.profile, sessions: data.sessions });
    setCheckOpen(null);
    if (r.ok) { setError(null); onBrief(r.workout); } else setError(`${r.error} ${r.details.join(' ')}`);
  };

  return (
    <div className="screen">
      <header className="screen-head">
        <p className="eyebrow">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1>{greeting}{data.profile.name ? `, ${data.profile.name}` : ''}</h1>
      </header>

      {urgentFlags(data.profile) && <Banner tone="danger">Your screening answers include symptoms that should be checked by a clinician before you train. Until then, keep sessions to easy recovery work and stop if any symptom returns.</Banner>}
      {!cap.vigorousAllowed && !urgentFlags(data.profile) && <Banner tone="warn">{cap.reason} <button type="button" className="link" onClick={() => go('profile')}>Update guidance</button></Banner>}
      {error && <Banner tone="danger">{error}</Banner>}

      {resume && (
        <section className="resume-card" aria-label="Unfinished mission">
          <p className="eyebrow">Mission in progress</p>
          <h2>{resume.workout.name}</h2>
          <p className="muted small">
            Step {Math.min(resume.timer.index + 1, resume.steps.length)} of {resume.steps.length}
            {' · '}{Object.keys(resume.logs).length} set{Object.keys(resume.logs).length === 1 ? '' : 's'} logged
            {' · '}{fmtDuration(Math.round(resume.timer.activeMs / 1000))} done
            {' · '}last saved {new Date(resume.savedAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
          </p>
          <div className="row">
            <button type="button" className="btn primary big" onClick={onResume}>{resume.phase === 'debrief' ? 'Finish debrief' : 'Resume mission'}</button>
            {confirmDiscard
              ? <button type="button" className="btn danger" onClick={() => { setConfirmDiscard(false); onDiscard?.(); }}>Confirm discard</button>
              : <button type="button" className="btn ghost" onClick={() => setConfirmDiscard(true)}>Discard</button>}
          </div>
        </section>
      )}

      {switchNote && <Banner tone="ok">{switchNote} <button type="button" className="link" onClick={() => setSwitchNote(null)}>OK</button></Banner>}

      <section className="mission-card">
        <p className="eyebrow">Today's mission{week ? ` · Week ${week} of 4${week === 4 ? ' (lighter week)' : ''}` : ''}</p>
        {plan && planDay ? (
          <>
            <h2 className="mission-type">{SESSION_LABEL[planDay.type]}</h2>
            {planDay.type === 'rest' ? (
              <p className="muted">Scheduled rest. Recovery is training too — an easy walk or mobility session is optional.</p>
            ) : doneToday ? (
              <p className="ok-text">Logged today. Good work — recovery now.</p>
            ) : (
              <p className="muted">{data.plan!.duration} min · {planDay.type === 'intervals' && lastHard ? 'Recent hard session detected — effort will be moderated.' : 'Generated from your plan, equipment and restrictions.'}</p>
            )}
            <div className="row">
              {planDay.type !== 'rest' && <button type="button" className="btn primary big" onClick={() => setCheckOpen('plan')}>Brief me</button>}
              {planDay.type === 'rest' && <button type="button" className="btn big" onClick={() => setCheckOpen('recovery')}>Optional recovery</button>}
              <button type="button" className="btn" onClick={() => { setSwapWith(true); setSwitchOpen(true); }}>Switch</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mission-type">No plan scheduled</h2>
            <p className="muted">Build a 4-week plan around your training days, or create a one-off mission.</p>
            <div className="row">
              <button type="button" className="btn primary" onClick={() => go('plan')}>Create plan</button>
              <button type="button" className="btn" onClick={() => go('build')}>Build a workout</button>
            </div>
          </>
        )}
      </section>

      {data.profile.showVerses !== false && (() => {
        const t = planDay?.type;
        const themes: VerseTheme[] = t === 'rest' || t === 'recovery' ? ['rest'] : t === 'boxing' ? ['fight'] : t === 'intervals' || t === 'steady' ? ['endurance'] : t === 'circuit' ? ['soldier'] : t?.startsWith('strength') ? ['strength', 'discipline'] : ['discipline', 'strength', 'soldier'];
        return <VerseCard label="Verse for today" verse={pickVerse(themes, today)} />;
      })()}

      <Section title="This week">
        <div className="stat-grid">
          <div><span className="stat-n">{stats.cardioMin}<small>/150</small></span><span className="stat-l">cardio minutes</span></div>
          <div><span className="stat-n">{stats.strengthDays}<small>/2</small></span><span className="stat-l">strength days</span></div>
          <div><span className="stat-n">{stats.sessions}</span><span className="stat-l">sessions</span></div>
          <div><span className="stat-n">{data.profile.currentWeight || '—'}<small> lb</small></span><span className="stat-l">{data.profile.goalWeight ? `goal ${data.profile.goalWeight} lb` : 'set a goal in Profile'}</span></div>
        </div>
        <p className="muted small">Targets reflect the common adult guideline of 150 min moderate activity and 2 strength days per week — a reference point, not a personal prescription.</p>
      </Section>

      {data.favorites.length > 0 && (
        <Section title="Favorites">
          <ul className="list">
            {data.favorites.slice(0, 5).map((f) => (
              <li key={f.id}>
                <button type="button" className="list-btn" onClick={() => onBrief({ ...f.workout, id: `w-${Date.now()}` })}>
                  <strong>{f.name}</strong>
                  <span className="muted small">{STYLE_LABEL[f.workout.params.style]} · {f.workout.params.duration} min</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {plan && (
        <Section title="Coming up">
          <ul className="list compact">
            {plan.days.filter((d) => d.date > today).slice(0, 4).map((d) => (
              <li key={d.date} className="list-row"><span>{fmtDate(d.date)}</span><span className={`badge t-${d.type}`}>{SESSION_LABEL[d.type]}</span></li>
            ))}
          </ul>
        </Section>
      )}

      <button type="button" className="safety-link" onClick={() => setSafety(true)}>When to stop exercising</button>

      <Sheet open={switchOpen} onClose={() => setSwitchOpen(false)} title="Switch today's workout">
        <p className="muted small">Planned: {planDay ? SESSION_LABEL[planDay.type] : '—'}. Pick what you'd rather do today.</p>
        <Toggle id="switch-swap" checked={swapWith} onChange={setSwapWith} label="Trade days if it's planned later this week" hint="Keeps your week balanced: that day gets today's original session." />
        <div className="stack tight">
          {(['strength-lower', 'strength-push', 'strength-pull', 'strength-upper', 'strength-full', 'boxing', 'intervals', 'circuit', 'steady', 'recovery', 'rest'] as PlanSessionType[])
            .filter((t) => t !== planDay?.type)
            .map((t) => {
              const other = swapWith ? swapCandidate(t) : undefined;
              return (
                <button type="button" key={t} className="option" onClick={() => switchTo(t)}>
                  <strong>{t === 'strength-lower' ? 'Leg day (Strength — Lower)' : SESSION_LABEL[t]}</strong>
                  <span className="muted small">{other ? `Trades with ${fmtDate(other.date)}` : 'Today only'}</span>
                </button>
              );
            })}
        </div>
      </Sheet>

      <Sheet open={!!checkOpen} onClose={() => setCheckOpen(null)} title="Readiness check">
        <ReadinessCheck value={readiness} onChange={setReadiness} />
        {(readiness.energy <= 2 || readiness.soreness >= 4) && <Banner tone="info">Low readiness: the mission will be lighter. A recovery session is a smart choice today.</Banner>}
        <button type="button" className="btn primary big" onClick={launch}>Generate briefing</button>
      </Sheet>
      <Sheet open={safety} onClose={() => setSafety(false)} title="Stop if you notice"><SafetyContent /></Sheet>
    </div>
  );
}
