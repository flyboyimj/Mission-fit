import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getExercise } from '../data/exercises';
import { contextFrom, LIMITATION_LABEL } from '../engine/filter';
import { availableWeightsFor, workoutMuscles } from '../engine/generator';
import { RPE_SCALE } from '../engine/health';
import { nextStep, suggestLoad } from '../engine/progression';
import { cardioMinutesFromSteps, fmtDuration, isStrengthWorkout } from '../engine/stats';
import * as T from '../engine/timer';
import { type ActiveSnapshot, type DebriefDraft, saveActive } from '../store/activeSession';
import { useStore } from '../store/AppStore';
import type { Exercise, SessionLog, SetLog, Step, Workout } from '../types';
import { pickVerse, themesForStyle } from '../data/verses';
import { ExercisePicker } from './ExercisePicker';
import { Banner, ExampleLink, Icon, MultiChips, SafetyContent, Sheet, Toggle, VerseCard } from './kit';
import { LIMIT_OPTIONS } from './labels';

type Phase = 'run' | 'debrief';

const KIND_LABEL: Record<Step['kind'], string> = {
  warmup: 'Warm-up', set: 'Set', rest: 'Rest', station: 'Station', 'interval-work': 'Work', 'interval-rest': 'Easy', cardio: 'Steady', cooldown: 'Cool-down', transition: 'Move',
};

// ───────── audio ─────────
function useAudio(enabled: boolean, voice: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const unlock = useCallback(() => {
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AC) ctxRef.current = new AC();
      }
      ctxRef.current?.resume?.();
    } catch { /* audio not available */ }
  }, []);
  const beep = useCallback((freq = 880, ms = 120) => {
    if (!enabled) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.type = 'square';
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + ms / 1000 + 0.02);
    } catch { /* ignore */ }
  }, [enabled]);
  const say = useCallback((text: string) => {
    if (!enabled || !voice) return;
    try {
      const s = window.speechSynthesis;
      if (!s) return;
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      s.speak(u);
    } catch { /* ignore */ }
  }, [enabled, voice]);
  return { unlock, beep, say };
}

function useWakeLock() {
  const lock = useRef<{ release: () => Promise<void> } | null>(null);
  const request = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
      if (nav.wakeLock) lock.current = await nav.wakeLock.request('screen');
    } catch { /* not granted — fine */ }
  }, []);
  const release = useCallback(() => { lock.current?.release().catch(() => {}); lock.current = null; }, []);
  useEffect(() => release, [release]);
  return { request, release };
}

// ───────── main ─────────
export function ActiveWorkout({ workout, onExit, resume }: { workout: Workout; onExit: () => void; resume?: ActiveSnapshot | null }) {
  const { data, update } = useStore();
  const profile = data.profile;
  const [steps, setStepsState] = useState<Step[]>(resume?.steps ?? workout.steps);
  const stepsRef = useRef<Step[]>(resume?.steps ?? workout.steps);
  const setSteps = (s: Step[]) => { stepsRef.current = s; setStepsState(s); };
  const [timer, setTimer] = useState<T.TimerState>(() => resume?.timer ?? T.initTimer(workout.steps));
  const [now, setNow] = useState(Date.now());
  const [phase, setPhase] = useState<Phase>(resume?.phase ?? 'run');
  const [audioOn, setAudioOn] = useState(profile.audioCues);
  const [startedAt, setStartedAt] = useState<string | null>(resume?.startedAt ?? null);
  const [logs, setLogs] = useState<Record<string, SetLog>>(resume?.logs ?? {});
  const [subs, setSubs] = useState<SessionLog['substitutions']>(resume?.subs ?? []);
  const [resumedNotice, setResumedNotice] = useState(!!resume);
  const [subOpen, setSubOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [painPrompt, setPainPrompt] = useState(false);
  const audio = useAudio(audioOn, profile.voiceCues);
  const wake = useWakeLock();
  const lastBeep = useRef<number>(-1);
  const prevIndex = useRef(resume?.timer.index ?? 0);

  const step = steps[timer.index];
  const nextStepObj = steps.slice(timer.index + 1).find((s) => s.kind !== 'transition') ?? null;
  const ex = step?.exerciseId ? getExercise(step.exerciseId) : null;
  const remainingMs = T.remaining(timer, now);

  // ticking
  useEffect(() => {
    if (timer.status !== 'running') return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [timer.status]);

  useEffect(() => {
    if (timer.status !== 'running') return;
    const next = T.tick(timer, steps, now);
    if (next !== timer) setTimer(next);
    // countdown beeps for timed steps
    if (step?.timed && timer.endAt) {
      const sec = Math.ceil((timer.endAt - now) / 1000);
      if (sec <= 3 && sec >= 1 && sec !== lastBeep.current) { lastBeep.current = sec; audio.beep(660, 90); }
    }
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  // cue on step change
  useEffect(() => {
    if (timer.index !== prevIndex.current) {
      prevIndex.current = timer.index;
      lastBeep.current = -1;
      if (timer.status === 'running') {
        audio.beep(1040, 220);
        const s = steps[timer.index];
        if (s) audio.say(s.kind === 'rest' ? `Rest. Next: ${nextName(steps, timer.index)}` : s.label.replace(/—/g, ''));
      }
    }
    if (timer.status === 'finished' && phase === 'run') { audio.beep(1320, 400); setPhase('debrief'); wake.release(); }
  }, [timer.index, timer.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx = useMemo(() => contextFrom(profile, workout.params.inventory, workout.params.readiness), [profile, workout]);

  const begin = () => {
    audio.unlock();
    wake.request();
    const t = Date.now();
    setStartedAt(new Date(t).toISOString());
    setNow(t);
    setTimer((s) => T.start(s, steps, t));
    audio.beep(1040, 220);
    if (steps[0]) audio.say(steps[0].label);
  };
  const act = (fn: (s: T.TimerState, n: number) => T.TimerState) => { const t = Date.now(); setNow(t); setTimer((s) => fn(s, t)); };

  // ── set logging ──
  const weights = ex ? availableWeightsFor(ex, workout.params.inventory) : [];
  const blockItem = useMemo(() => workout.blocks.flatMap((b) => b.items).find((i) => i.exerciseId === step?.exerciseId), [workout, step]);
  const defaultWeight = (): number | null => {
    if (!ex) return null;
    const prev = Object.values(logs).filter((l) => l.exerciseId === ex.id).sort((a, b) => b.setNumber - a.setNumber)[0];
    if (prev?.weight) return prev.weight;
    if (step?.repTarget) {
      const sug = suggestLoad(ex.id, data.sessions, step.repTarget, weights, workout.params.readiness);
      if (sug.weight) return sug.weight;
    }
    return weights.length ? weights[Math.floor(weights.length / 4)] : null;
  };
  const [form, setForm] = useState<{ weight: number | null; reps: number | null; rpe: number | null; pain: boolean; goodForm: boolean }>({ weight: null, reps: null, rpe: null, pain: false, goodForm: true });
  useEffect(() => {
    if (step?.kind === 'set') setForm({ weight: defaultWeight(), reps: step.repTarget?.[1] ?? null, rpe: null, pain: false, goodForm: true });
  }, [timer.index, step?.exerciseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setDone = () => {
    if (!step || !ex) return;
    const log: SetLog = { exerciseId: ex.id, setNumber: step.setNumber ?? 1, weight: form.weight, reps: form.reps, rpe: form.rpe, pain: form.pain, goodForm: form.goodForm };
    setLogs((l) => ({ ...l, [step.id]: log }));
    if (form.pain) { setPainPrompt(true); act((s, n) => T.pause(T.complete(s, stepsRef.current, n), n)); return; }
    act((s, n) => T.complete(s, stepsRef.current, n));
  };

  // ── substitutions ──
  const applySub = (from: string, to: Exercise | null, reason: string, permanentAvoid: boolean) => {
    const cur = timer.index;
    let newSteps: Step[];
    if (to) {
      newSteps = steps.map((s, i) => (i >= cur && s.exerciseId === from ? { ...s, exerciseId: to.id, label: s.label.replace(getExercise(from).name, to.name), note: undefined } : s));
    } else {
      const head = steps.slice(0, cur);
      const tail = steps.slice(cur);
      const kept: Step[] = [];
      let dropNextRest = false;
      for (const s of tail) {
        if (s.exerciseId === from) { dropNextRest = true; continue; }
        if (dropNextRest && (s.kind === 'rest' || s.kind === 'transition') && !s.exerciseId) { dropNextRest = false; continue; }
        dropNextRest = false;
        kept.push(s);
      }
      newSteps = [...head, ...kept];
    }
    setSteps(newSteps);
    setSubs((x) => [...x, { from, to: to?.id ?? null, reason }]);
    if (permanentAvoid) update((d) => ({ ...d, profile: { ...d.profile, avoidList: [...new Set([...d.profile.avoidList, from])] } }));
    const t = Date.now();
    setTimer((s) => {
      if (newSteps.length <= s.index) return T.finish(s, t);
      const st = newSteps[s.index];
      const running = s.status === 'running';
      return { ...s, remainingMs: st.durationSec * 1000, endAt: running && st.timed ? t + st.durationSec * 1000 : null, lastTick: running ? t : s.lastTick };
    });
    setSubOpen(false);
  };

  // ── debrief ──
  const [debrief, setDebrief] = useState<DebriefDraft>(resume?.debrief ?? { rpe: null, soreness: 2, discomfort: [], notes: '', favorite: false });

  // ── save progress on this device so an accidental close can be resumed ──
  const latest = useRef({ workout, steps, timer, startedAt, logs, subs, phase, debrief });
  latest.current = { workout, steps, timer, startedAt, logs, subs, phase, debrief };
  const persist = () => {
    const c = latest.current;
    if (!c.startedAt) return; // nothing to resume before Start
    saveActive({ workout: c.workout, steps: c.steps, timer: c.timer, startedAt: c.startedAt, logs: c.logs, subs: c.subs, phase: c.phase, debrief: c.debrief });
  };
  useEffect(persist, [steps, timer.index, timer.status, logs, subs, phase, debrief, startedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Keep elapsed time fresh while running, and save the moment the app is hidden or closed.
    const id = window.setInterval(() => { if (latest.current.timer.status === 'running') persist(); }, 5000);
    const onHide = () => { if (document.visibilityState === 'hidden') persist(); };
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', onHide);
    return () => { window.clearInterval(id); window.removeEventListener('pagehide', persist); document.removeEventListener('visibilitychange', onHide); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const saveSession = () => {
    const end = new Date();
    const completed = timer.completed;
    const intervalsPlanned = steps.filter((s) => s.kind === 'interval-work').length;
    const intervalsCompleted = completed.filter((i) => steps[i]?.kind === 'interval-work').length;
    const sets = Object.values(logs);
    const stationsDone = completed.filter((i) => steps[i]?.kind === 'station').length;
    const session: SessionLog = {
      id: `s-${end.getTime()}`,
      workoutId: workout.id,
      name: workout.name,
      style: workout.params.style,
      focus: workout.params.focus,
      goal: workout.params.goal,
      startedAt: startedAt ?? end.toISOString(),
      endedAt: end.toISOString(),
      activeSec: T.activeSeconds(timer, Date.now()),
      plannedSec: workout.estimatedSec,
      completedSteps: completed.length,
      totalSteps: steps.length,
      sets,
      intervalsCompleted,
      intervalsPlanned,
      cardioMinutes: Math.round(cardioMinutesFromSteps(steps, completed) * 10) / 10,
      isStrengthDay: isStrengthWorkout(workout) && (sets.length > 0 || stationsDone > 0),
      sessionRpe: debrief.rpe,
      soreness: debrief.soreness,
      discomfort: debrief.discomfort,
      notes: debrief.notes,
      hard: workout.hardSession && intervalsCompleted >= Math.ceil(intervalsPlanned / 2),
      muscles: workoutMuscles(workout),
      substitutions: subs,
      workout: { ...workout, steps: [] },
    };
    update((d) => ({
      ...d,
      sessions: [...d.sessions, session],
      favorites: debrief.favorite && !d.favorites.some((f) => f.workout.id === workout.id)
        ? [{ id: `f-${Date.now()}`, name: workout.name, savedAt: end.toISOString(), workout }, ...d.favorites]
        : d.favorites,
    }));
    onExit();
  };

  if (phase === 'debrief') {
    const completed = timer.completed.length;
    const pct = Math.round((completed / Math.max(1, steps.length)) * 100);
    const rpeInfo = RPE_SCALE.find((r) => r.value === debrief.rpe);
    return (
      <div className="active debrief">
        <p className="eyebrow">Debrief</p>
        <h1 className="mission-name">{workout.name}</h1>
        {profile.showVerses !== false && <VerseCard compact verse={pickVerse(['finish'], workout.id)} />}
        <div className="stat-grid">
          <div><span className="stat-n">{fmtDuration(T.activeSeconds(timer, Date.now()))}</span><span className="stat-l">active time</span></div>
          <div><span className="stat-n">{pct}%</span><span className="stat-l">steps completed</span></div>
          <div><span className="stat-n">{Object.keys(logs).length}</span><span className="stat-l">sets logged</span></div>
          <div><span className="stat-n">{Math.round(cardioMinutesFromSteps(steps, timer.completed))}</span><span className="stat-l">cardio min</span></div>
        </div>
        <fieldset className="field">
          <legend className="label">Overall session effort</legend>
          <div className="rpe-pick">
            {RPE_SCALE.map((r) => (
              <button type="button" key={r.value} className={`chip ${debrief.rpe === r.value ? 'on' : ''}`} onClick={() => setDebrief({ ...debrief, rpe: r.value })}>{r.value}</button>
            ))}
          </div>
          {rpeInfo && <p className="muted small">{rpeInfo.label}: {rpeInfo.desc}</p>}
        </fieldset>
        <fieldset className="field">
          <legend className="label">Soreness now (1 = none, 5 = very sore)</legend>
          <div className="chips">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} className={`chip ${debrief.soreness === n ? 'on' : ''}`} onClick={() => setDebrief({ ...debrief, soreness: n })}>{n}</button>)}</div>
        </fieldset>
        <MultiChips id="debrief-discomfort" label="Any discomfort?" options={LIMIT_OPTIONS} value={debrief.discomfort} onChange={(v) => setDebrief({ ...debrief, discomfort: v })} />
        {debrief.discomfort.length > 0 && <Banner tone="warn">Noted. Next workouts will lower the load on your {debrief.discomfort.map((d) => LIMITATION_LABEL[d]).join(', ')} if you flag it again in the readiness check. Pain that persists or worsens deserves a check with a clinician or physical therapist.</Banner>}
        <label className="field" htmlFor="debrief-notes"><span className="label">Notes</span>
          <textarea id="debrief-notes" rows={3} value={debrief.notes} onChange={(e) => setDebrief({ ...debrief, notes: e.target.value })} placeholder="Machine settings, how it felt…" />
        </label>
        <Toggle id="debrief-fav" checked={debrief.favorite} onChange={(v) => setDebrief({ ...debrief, favorite: v })} label="Save this mission as a favorite" />
        <div className="stack">
          <button type="button" className="btn primary big" onClick={saveSession}>Save to log</button>
          <button type="button" className="btn ghost" onClick={onExit}>Discard without saving</button>
        </div>
      </div>
    );
  }

  const totalSteps = steps.length;
  const progress = (timer.completed.length + timer.skipped.length) / Math.max(1, totalSteps);
  const timed = step?.timed;
  const isRest = step && (step.kind === 'rest' || step.kind === 'transition' || step.kind === 'interval-rest');
  const sec = Math.ceil(remainingMs / 1000);

  return (
    <div className={`active ${isRest ? 'is-rest' : ''} ${step?.kind === 'interval-work' ? 'is-work' : ''}`}>
      <header className="active-bar">
        <button type="button" className="btn ghost small" onClick={() => setConfirmFinish(true)}>Finish</button>
        <div className="active-title">
          <span>{workout.name}</span>
          <small>{timer.index + 1}/{totalSteps} · {fmtDuration(T.activeSeconds(timer, now))}</small>
        </div>
        <button type="button" className="btn icon" aria-label={audioOn ? 'Mute audio cues' : 'Turn on audio cues'} aria-pressed={audioOn} onClick={() => { audio.unlock(); setAudioOn(!audioOn); }}>
          <Icon name={audioOn ? 'sound' : 'mute'} />
        </button>
        <button type="button" className="btn icon danger" aria-label="Stop symptoms" onClick={() => setSafetyOpen(true)}><Icon name="alert" /></button>
      </header>
      <div className="progress" aria-hidden="true"><span style={{ width: `${progress * 100}%` }} /></div>
      {resumedNotice && (
        <div className="resume-note" role="status">
          <span>Picked up where you left off — {Object.keys(logs).length} set{Object.keys(logs).length === 1 ? '' : 's'} logged. Tap Resume when ready.</span>
          <button type="button" className="btn ghost small" onClick={() => setResumedNotice(false)}>OK</button>
        </div>
      )}

      <main className="active-main">
        <p className="phase">
          {step ? KIND_LABEL[step.kind] : ''}
          {step?.setNumber ? ` ${step.setNumber} of ${step.totalSets}` : ''}
          {step?.group ? ` · superset ${step.group}` : ''}
          {step?.round ? ` · round ${step.round}/${step.totalRounds}` : ''}
        </p>
        <h1 className="active-name">{isRest ? (step!.kind === 'interval-rest' ? 'Easy — recover' : step!.label) : (ex?.name ?? step?.label)}</h1>
        <p className="target">
          {step?.kind === 'interval-rest' ? 'effort 2–3/10' : isRest ? '' : [
            step?.reps ? `${step.reps}${step.kind === 'set' ? ' reps' : ''}` : '',
            step?.rpe ? `effort ${step.rpe}/10` : '',
          ].filter(Boolean).join(' · ')}
        </p>
        {step?.drill && !isRest && <p className="drill">{step.drill}</p>}

        {timed ? (
          <div className={`clock ${sec <= 3 && timer.status === 'running' ? 'ending' : ''}`} aria-live="off">{fmtDuration(sec)}</div>
        ) : step?.kind === 'set' ? (
          <SetForm form={form} setForm={setForm} weights={weights} ex={ex!} />
        ) : (
          <div className="clock small">Self-paced</div>
        )}

        {!isRest && ex && (
          <div className="cue">
            <p>{ex.cues[0]}</p>
            <p className="breath">{ex.breathing}</p>
            <div className="cue-links">
              <button type="button" className="link" onClick={() => setTechOpen(true)}>Technique & modifications</button>
              <ExampleLink ex={ex} compact />
            </div>
          </div>
        )}
        {isRest && <p className="breath center">Breathe slowly. Shake out, sip water.</p>}
        {isRest && profile.showVerses !== false && sec >= 20 && (
          <VerseCard compact verse={pickVerse(step!.kind === 'interval-rest' || workout.params.style === 'recovery' ? ['rest', 'renewal', 'endurance'] : themesForStyle(workout.params.style), `${workout.id}-${timer.index}`)} />
        )}

        {timer.status === 'idle' ? (
          <button type="button" className="btn primary big" onClick={begin}>Start</button>
        ) : step?.kind === 'set' || (step && !step.timed) ? (
          <button type="button" className="btn primary big" onClick={step.kind === 'set' ? setDone : () => act((s, n) => T.complete(s, stepsRef.current, n))}>
            {step.kind === 'set' ? 'Set done' : 'Done'}
          </button>
        ) : null}

        <div className="controls">
          {timer.status === 'running' && <button type="button" className="btn" onClick={() => act((s, n) => T.pause(s, n))}>Pause</button>}
          {timer.status === 'paused' && <button type="button" className="btn primary" onClick={() => act((s, n) => T.resume(s, stepsRef.current, n))}>Resume</button>}
          {timer.status === 'idle' && <span />}
          <button type="button" className="btn" onClick={() => act((s, n) => T.skip(s, stepsRef.current, n))} disabled={timer.status === 'idle'}>Skip</button>
          <button type="button" className="btn" onClick={() => act((s, n) => T.addTime(s, 30, n))} disabled={!timed}>+30s rest</button>
          <button type="button" className="btn" onClick={() => setSubOpen(true)} disabled={!ex || isRest || step?.kind === 'warmup' || step?.kind === 'cooldown'}>Substitute</button>
        </div>
      </main>

      <footer className="next-up">
        {nextStepObj ? (
          <>
            <span className="label">Next</span>
            <span className="next-name">{nextStepObj.exerciseId ? getExercise(nextStepObj.exerciseId).name : nextStepObj.label}</span>
            <span className="muted small">
              {nextStepObj.kind === 'set' ? `Set ${nextStepObj.setNumber}/${nextStepObj.totalSets} · ${nextStepObj.reps}` : `${KIND_LABEL[nextStepObj.kind]} · ${fmtDuration(nextStepObj.durationSec)}`}
            </span>
          </>
        ) : <span className="muted">Last step — finish strong and controlled.</span>}
      </footer>

      <Sheet open={techOpen} onClose={() => setTechOpen(false)} title={ex?.name ?? 'Technique'}>
        {ex && (
          <div className="stack">
            {step?.note && <p className="caution">{step.note}</p>}
            {blockItem?.suggestion && <p className="suggest">{blockItem.suggestion}</p>}
            {blockItem?.loadGuidance && <p>{blockItem.loadGuidance}</p>}
            <ul className="bullets">{ex.cues.map((c) => <li key={c}>{c}</li>)}</ul>
            <p className="breath">{ex.breathing}</p>
            <ExampleLink ex={ex} />
          </div>
        )}
      </Sheet>

      <Sheet open={safetyOpen} onClose={() => setSafetyOpen(false)} title="Stop if you notice">
        <SafetyContent />
        <button type="button" className="btn danger big" onClick={() => { setSafetyOpen(false); act((s, n) => T.finish(s, n)); }}>End session now</button>
      </Sheet>

      <Sheet open={confirmFinish} onClose={() => setConfirmFinish(false)} title="Finish mission?">
        <p>Remaining steps will be marked incomplete. You can still log effort and notes.</p>
        <div className="stack">
          <button type="button" className="btn primary big" onClick={() => { setConfirmFinish(false); act((s, n) => T.finish(s, n)); }}>Finish & debrief</button>
          <button type="button" className="btn ghost" onClick={onExit}>Exit without saving</button>
        </div>
      </Sheet>

      <Sheet open={painPrompt} onClose={() => setPainPrompt(false)} title="You flagged pain">
        <p><strong>Don't push through pain.</strong> Stop this movement. Swap it for something that doesn't hurt, or skip it.</p>
        <div className="stack">
          <button type="button" className="btn primary" onClick={() => { setPainPrompt(false); setSubOpen(true); }}>Find a pain-free substitute</button>
          <button type="button" className="btn" onClick={() => { setPainPrompt(false); const id = steps[timer.index - 1]?.exerciseId ?? ex?.id; if (id) applySub(id, null, 'pain', false); act((s, n) => T.resume(s, stepsRef.current, n)); }}>Remove this movement</button>
          <button type="button" className="btn ghost" onClick={() => setSafetyOpen(true)}>Symptoms beyond joint pain?</button>
        </div>
      </Sheet>

      <ExercisePicker
        open={subOpen}
        onClose={() => setSubOpen(false)}
        exercise={ex ?? (steps[timer.index - 1]?.exerciseId ? getExercise(steps[timer.index - 1].exerciseId!) : null)}
        ctx={ctx}
        excludeIds={steps.map((s) => s.exerciseId!).filter(Boolean)}
        onApply={applySub}
      />
    </div>
  );
}

function nextName(steps: Step[], i: number): string {
  const n = steps.slice(i + 1).find((s) => s.exerciseId);
  return n?.exerciseId ? getExercise(n.exerciseId).name : 'cool-down';
}

function SetForm({ form, setForm, weights, ex }: {
  form: { weight: number | null; reps: number | null; rpe: number | null; pain: boolean; goodForm: boolean };
  setForm: (f: typeof form) => void;
  weights: number[];
  ex: Exercise;
}) {
  const bodyweight = !weights.length;
  const stepW = (dir: 1 | -1) => {
    const cur = form.weight ?? 0;
    const w = weights.length ? nextStep(weights, cur, dir) : Math.max(0, cur + dir * 5);
    setForm({ ...form, weight: w });
  };
  return (
    <div className="setform">
      {!bodyweight && (
        <div className="stepper">
          <span className="label" id="w-label">Weight (lb{ex.equipOptions.some((o) => o.includes('dumbbell')) ? ', each' : ''})</span>
          <div className="stepper-row">
            <button type="button" className="btn icon" aria-label="Lighter" onClick={() => stepW(-1)}>−</button>
            <input id="set-weight" aria-label="Weight" inputMode="decimal" value={form.weight ?? ''} onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || null })} />
            <button type="button" className="btn icon" aria-label="Heavier" onClick={() => stepW(1)}>+</button>
          </div>
        </div>
      )}
      <div className="stepper">
        <span className="label" id="r-label">Reps done</span>
        <div className="stepper-row">
          <button type="button" className="btn icon" aria-label="Fewer reps" onClick={() => setForm({ ...form, reps: Math.max(0, (form.reps ?? 0) - 1) })}>−</button>
          <input id="set-reps" aria-label="Reps done" inputMode="numeric" value={form.reps ?? ''} onChange={(e) => setForm({ ...form, reps: parseInt(e.target.value) || null })} />
          <button type="button" className="btn icon" aria-label="More reps" onClick={() => setForm({ ...form, reps: (form.reps ?? 0) + 1 })}>+</button>
        </div>
      </div>
      <div className="rpe-mini" role="group" aria-label="Set effort (optional)">
        <span className="label">Effort</span>
        {[5, 6, 7, 8, 9].map((n) => <button type="button" key={n} className={`chip small ${form.rpe === n ? 'on' : ''}`} onClick={() => setForm({ ...form, rpe: form.rpe === n ? null : n })}>{n}</button>)}
      </div>
      <div className="row">
        <button type="button" className={`chip ${!form.goodForm ? 'on warn' : ''}`} aria-pressed={!form.goodForm} onClick={() => setForm({ ...form, goodForm: !form.goodForm })}>Form slipped</button>
        <button type="button" className={`chip ${form.pain ? 'on danger' : ''}`} aria-pressed={form.pain} onClick={() => setForm({ ...form, pain: !form.pain })}>Pain</button>
      </div>
    </div>
  );
}
