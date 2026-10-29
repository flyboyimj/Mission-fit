import { useState } from 'react';
import { BODY_PART_LABEL, BODY_PART_ORDER, customGroups, defaultIntervals, FOCUS_LABEL, generateWorkout, GOAL_LABEL, surpriseParams } from '../engine/generator';
import { effortCap } from '../engine/health';
import { useStore } from '../store/AppStore';
import type { BodyPart, CardioMachine, Duration, Equip, Focus, Goal, Location, Style, Workout, WorkoutParams } from '../types';
import { Banner, Chips, MultiChips, Section, Toggle } from './kit';
import { CARDIO, MACHINES, parseWeights, weightsText } from './labels';
import { defaultParams, inventoryFor } from './params';
import { ReadinessCheck } from './Readiness';

const STYLE_OPTS: { value: Style; label: string; hint: string }[] = [
  { value: 'circuit', label: 'Military circuit', hint: 'Timed resistance stations in rounds — not HIIT.' },
  { value: 'hiit', label: 'HIIT intervals', hint: 'Work/recovery bouts on low-impact cardio.' },
  { value: 'strength', label: 'Traditional strength', hint: 'Sets, reps, full rest, progression.' },
  { value: 'strength-cond', label: 'Strength + conditioning', hint: 'Lifts first, then cardio.' },
  { value: 'steady', label: 'Moderate cardio', hint: 'One steady, conversational effort.' },
  { value: 'boxing', label: 'Boxing rounds', hint: 'Timed shadow-boxing and heavy-bag rounds, then a weighted core finisher.' },
  { value: 'recovery', label: 'Recovery', hint: 'Mobility and easy movement.' },
];

export function BuildScreen({ onBrief, go }: { onBrief: (w: Workout) => void; go?: (tab: string) => void }) {
  const [cappedTap, setCappedTap] = useState<number | null>(null);
  const { data, update } = useStore();
  const [p, setP] = useState<WorkoutParams>(() => ({ ...defaultParams(data), bodyParts: data.lastParams?.bodyParts }));
  const [error, setError] = useState<{ error: string; details: string[] } | null>(null);
  const [showMachines, setShowMachines] = useState(false);
  const cap = effortCap(data.profile);
  const set = (patch: Partial<WorkoutParams>) => { setError(null); setP((x) => ({ ...x, ...patch })); };
  const inv = p.inventory;
  const setInv = (patch: Partial<WorkoutParams['inventory']>) => set({ inventory: { ...inv, ...patch } });

  const strengthGroups = ([
    inv.dumbbell && 'dumbbell', inv.kettlebell && 'kettlebell', inv.machines.length > 0 && 'machine', inv.cable && 'cable',
  ].filter(Boolean)) as string[];

  const run = (params: WorkoutParams) => {
    const r = generateWorkout(params, { profile: data.profile, sessions: data.sessions });
    update((d) => ({ ...d, lastParams: { goal: params.goal, focus: params.focus, style: params.style, location: params.location, duration: params.duration, includeCarries: params.includeCarries, cardioMachine: params.cardioMachine, intervals: params.intervals, bodyParts: params.bodyParts } }));
    if (r.ok) onBrief(r.workout);
    else setError({ error: r.error, details: r.details });
  };

  const boxing = p.style === 'boxing';
  const showIntervals = p.style === 'hiit' || p.style === 'strength-cond' || boxing;
  const d = defaultIntervals(p.goal);
  const iv = p.intervals ?? {};

  return (
    <div className="screen">
      <header className="screen-head">
        <p className="eyebrow">Build a workout</p>
        <h1>Plan the mission</h1>
      </header>

      <Section title="Readiness">
        <ReadinessCheck value={p.readiness} onChange={(r) => set({ readiness: r })} />
      </Section>

      <Section title="Objective">
        <Chips id="goal" label="Goal" value={p.goal} onChange={(v: Goal) => set({ goal: v })}
          options={(Object.keys(GOAL_LABEL) as Goal[]).map((g) => ({ value: g, label: GOAL_LABEL[g] }))} />
        <Chips id="style" label="Style" value={p.style} onChange={(v: Style) => set({ style: v })} options={STYLE_OPTS} />
        <p className="muted small">{STYLE_OPTS.find((s) => s.value === p.style)?.hint}</p>
        <Chips id="focus" label="Focus" value={p.focus} onChange={(v: Focus) => set({ focus: v })}
          options={(Object.keys(FOCUS_LABEL) as Focus[]).map((f) => ({ value: f, label: FOCUS_LABEL[f] }))} />
        <MultiChips id="body-parts" label="Body parts (optional — overrides focus)" value={p.bodyParts ?? []}
          onChange={(v: BodyPart[]) => set({ bodyParts: v.length ? v : undefined })}
          options={BODY_PART_ORDER.map((b) => ({ value: b, label: BODY_PART_LABEL[b] }))} />
        {!!p.bodyParts?.length && (
          <div className="row">
            <p className="muted small" style={{ flex: 1, minWidth: 0 }}>
              {(() => {
                const groups = customGroups(p.bodyParts);
                const total = groups.reduce((t, g) => t + g.slots.length, 0);
                return `${groups.map((g) => `${g.slots.length} ${g.label}`).join(' · ')} — ${total} exercises at 3–4 × 8–12. ${p.style === 'strength' || p.style === 'strength-cond' ? 'Lifting only; time is extended if needed.' : 'Choose Traditional strength or Strength + conditioning to use body parts.'}`;
              })()}
            </p>
            <button type="button" className="btn small ghost" onClick={() => set({ bodyParts: undefined })}>Clear</button>
          </div>
        )}
        {!p.bodyParts?.length && (p.focus === 'push' || p.focus === 'pull') && (p.style === 'strength' || p.style === 'strength-cond') && (
          <p className="muted small">{p.focus === 'push' ? 'Push day: 3 chest · 3 shoulders · 3 triceps.' : 'Pull day: 3 back · 3 biceps.'} Lifting only, at least 45 minutes so every exercise fits.</p>
        )}
        <Chips id="duration" label="Duration (includes warm-up & cool-down)" value={p.duration} onChange={(v: Duration) => set({ duration: v })}
          options={([15, 20, 30, 45, 60] as Duration[]).map((n) => ({ value: n, label: `${n} min` }))} />
      </Section>

      <Section title="Equipment">
        <Chips id="location" label="Location" value={p.location} onChange={(v: Location) => set({ location: v, inventory: inventoryFor(data, v) })}
          options={[{ value: 'gym', label: 'Commercial gym' }, { value: 'home', label: 'Home' }]} />
        <MultiChips id="equip" label="Strength equipment today" value={strengthGroups}
          onChange={(v) => setInv({ dumbbell: v.includes('dumbbell'), kettlebell: v.includes('kettlebell'), cable: v.includes('cable'), machines: v.includes('machine') ? (inv.machines.length ? inv.machines : MACHINES.map((m) => m.id)) : [] })}
          options={[{ value: 'dumbbell', label: 'Dumbbells' }, { value: 'kettlebell', label: 'Kettlebells' }, { value: 'machine', label: 'Resistance machines' }, { value: 'cable', label: 'Cable machine' }]} />
        <Toggle id="bench" checked={inv.bench} onChange={(v) => setInv({ bench: v })} label="Bench available" />
        <Toggle id="heavy-bag" checked={!!inv.heavyBag} onChange={(v) => setInv({ heavyBag: v })} label="Heavy bag available" hint="Used for boxing rounds. Wraps and gloves required." />
        <button type="button" className="link" onClick={() => setShowMachines(!showMachines)}>{showMachines ? 'Hide' : 'Choose'} specific machines & weights</button>
        {showMachines && (
          <div className="stack inset">
            <MultiChips id="machines" label="Machines" value={inv.machines} onChange={(v: Equip[]) => setInv({ machines: v })} options={MACHINES.map((m) => ({ value: m.id, label: m.label }))} />
            <WeightInput id="db-w" label="Dumbbells (lb)" value={inv.dumbbellWeights} onChange={(w) => setInv({ dumbbellWeights: w })} />
            <WeightInput id="kb-w" label="Kettlebells (lb)" value={inv.kettlebellWeights} onChange={(w) => setInv({ kettlebellWeights: w })} />
            <p className="muted small">Changes here apply to today only. Save permanent equipment in Profile.</p>
          </div>
        )}
        <MultiChips id="cardio" label="Cardio equipment (optional)" value={inv.cardio} onChange={(v: CardioMachine[]) => setInv({ cardio: v })} options={CARDIO.map((c) => ({ value: c.id, label: c.label }))} />
        {inv.cardio.length > 1 && (
          <Chips id="cardio-pref" label="Preferred cardio machine" value={p.cardioMachine ?? inv.cardio[0]} onChange={(v) => set({ cardioMachine: v as CardioMachine })}
            options={inv.cardio.map((c) => ({ value: c, label: CARDIO.find((x) => x.id === c)!.label }))} />
        )}
        <Toggle id="carries" checked={p.includeCarries} onChange={(v) => set({ includeCarries: v })} label="Include loaded carries" hint="Farmer's or suitcase carries — swapped for a stationary march if feet need it." />
      </Section>

      {showIntervals && (
        <Section title={boxing ? 'Round settings' : 'Interval settings'}>
          <p className="muted small">{boxing
            ? `Leave blank for the default: 2-minute rounds, 60 s rest, effort ${Math.min(7, cap.maxRpe)}.`
            : `Leave blank for the conservative default (${d.workSec}s work / ${d.restSec}s easy, effort ${Math.min(d.workRpe, cap.maxRpe)}).`}</p>
          <div className="grid3">
            <NumField id="iv-work" label={boxing ? 'Round (s)' : 'Work (s)'} value={iv.workSec} onChange={(n) => set({ intervals: { ...iv, workSec: n } })} />
            <NumField id="iv-rest" label={boxing ? 'Rest (s)' : 'Easy (s)'} value={iv.restSec} onChange={(n) => set({ intervals: { ...iv, restSec: n } })} />
            <NumField id="iv-rounds" label="Rounds" value={iv.rounds} onChange={(n) => set({ intervals: { ...iv, rounds: n } })} />
          </div>
          <Chips id="iv-rpe" label="Work effort" value={Math.min(iv.workRpe ?? d.workRpe, cap.maxRpe)}
            onChange={(v) => { if (v > cap.maxRpe) { setCappedTap(v); return; } setCappedTap(null); set({ intervals: { ...iv, workRpe: v } }); }}
            options={[5, 6, 7, 8].map((n) => ({ value: n, label: `${n}/10${n > cap.maxRpe ? ' 🔒' : ''}` }))} />
          {!cap.vigorousAllowed && (
            <Banner tone="warn">
              {cappedTap ? <strong>{cappedTap}/10 is locked. </strong> : null}
              Because you reported high blood pressure, efforts above 6/10 unlock once you record clinician guidance for vigorous exercise (Profile → Clinician guidance). It stays valid until the review date you set.
              {go && <button type="button" className="btn small" onClick={() => go('profile')}>Record guidance in Profile</button>}
            </Banner>
          )}
        </Section>
      )}

      {error && (
        <Banner tone="danger">
          <strong>{error.error}</strong>
          <ul className="bullets">{error.details.map((x) => <li key={x}>{x}</li>)}</ul>
        </Banner>
      )}

      <div className="sticky-actions">
        <button type="button" className="btn primary big" onClick={() => run({ ...p, seed: Math.floor(Math.random() * 1e9) })}>Generate mission</button>
        <button type="button" className="btn big" onClick={() => {
          const sp = surpriseParams(p, { profile: data.profile, sessions: data.sessions }, Math.floor(Math.random() * 1e9));
          setP(sp);
          run(sp);
        }}>Surprise me</button>
      </div>
    </div>
  );
}

function NumField({ id, label, value, onChange }: { id: string; label: string; value?: number; onChange: (n?: number) => void }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="label">{label}</span>
      <input id={id} inputMode="numeric" value={value ?? ''} placeholder="auto" onChange={(e) => { const n = parseInt(e.target.value); onChange(isNaN(n) ? undefined : n); }} />
    </label>
  );
}

export function WeightInput({ id, label, value, onChange }: { id: string; label: string; value: number[]; onChange: (w: number[]) => void }) {
  const [text, setText] = useState(weightsText(value));
  return (
    <label className="field" htmlFor={id}>
      <span className="label">{label}</span>
      <input id={id} value={text} placeholder="e.g. 10-50 by 5  or  15, 20, 25" onChange={(e) => setText(e.target.value)} onBlur={() => { const w = parseWeights(text); onChange(w); setText(weightsText(w)); }} />
      <small className="muted">{value.length ? `${value.length} weights: ${value.slice(0, 8).join(', ')}${value.length > 8 ? '…' : ''}` : 'None'}</small>
    </label>
  );
}
