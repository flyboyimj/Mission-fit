import { useState } from 'react';
import { getExercise } from '../data/exercises';
import { BODY_PART_LABEL, BODY_PART_ORDER, differentVersion, FOCUS_LABEL, generateWorkout, GOAL_LABEL, STYLE_LABEL, swapExercise } from '../engine/generator';
import { contextFrom } from '../engine/filter';
import { ExercisePicker } from './ExercisePicker';
import { fmtMinutes } from '../engine/stats';
import { useStore } from '../store/AppStore';
import type { Block, Exercise, Workout } from '../types';
import { pickVerse, themesForStyle } from '../data/verses';
import { Banner, ExampleLink, Icon, RpeScale, Sheet, VerseCard } from './kit';

export function MissionBrief({ workout, onStart, onBack, onReplace }: { workout: Workout; onStart: (w: Workout) => void; onBack: () => void; onReplace: (w: Workout) => void }) {
  const { data, update } = useStore();
  const [rpeOpen, setRpeOpen] = useState(false);
  const [swapId, setSwapId] = useState<string | null>(null);
  const ctx = contextFrom(data.profile, workout.params.inventory, workout.params.readiness);
  const applySwap = (from: string, to: Exercise | null, _reason: string, never: boolean) => {
    if (never) update((d) => ({ ...d, profile: { ...d.profile, avoidList: [...new Set([...d.profile.avoidList, from])] } }));
    onReplace(swapExercise(workout, from, to?.id ?? null, { profile: data.profile, sessions: data.sessions }));
    setSaved(false);
    setSwapId(null);
  };
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(data.favorites.some((f) => f.workout.id === workout.id));
  const p = workout.params;

  const variant = () => {
    const r = differentVersion(workout, { profile: data.profile, sessions: data.sessions });
    if (r.ok) { setErr(null); onReplace(r.workout); setSaved(false); }
    else setErr(`${r.error} ${r.details.join(' ')}`);
  };
  const favorite = () => {
    if (saved) return;
    update((d) => ({ ...d, favorites: [{ id: `f-${Date.now()}`, name: workout.name, savedAt: new Date().toISOString(), workout }, ...d.favorites] }));
    setSaved(true);
  };

  return (
    <div className="brief">
      <div className="brief-head">
        <p className="eyebrow">Mission brief · {STYLE_LABEL[p.style]}</p>
        <h1 className="mission-name">{workout.name}</h1>
        <p className="objective">{workout.objective}</p>
        <div className="meta-row">
          <span className="pill">≈ {fmtMinutes(workout.estimatedSec)} <small>est.</small></span>
          <span className="pill">{GOAL_LABEL[p.goal]}</span>
          <span className="pill">{p.bodyParts?.length ? BODY_PART_ORDER.filter((b) => p.bodyParts!.includes(b)).map((b) => BODY_PART_LABEL[b]).join(' · ') : FOCUS_LABEL[p.focus]}</span>
          <span className="pill">{p.location === 'gym' ? 'Commercial gym' : 'Home'}</span>
          {p.planWeek && <span className="pill">Plan week {p.planWeek}</span>}
        </div>
      </div>

      {data.profile.showVerses !== false && (
        <VerseCard compact verse={pickVerse(themesForStyle(p.style, { lowReadiness: p.readiness.energy <= 2 || p.readiness.soreness >= 4 }), workout.id)} />
      )}
      {workout.warnings.map((w) => <Banner key={w} tone="warn">{w}</Banner>)}
      {workout.warnings.some((w) => w.includes('36 hours')) && (
        <button type="button" className="btn ghost" onClick={() => {
          const r = generateWorkout({ ...p, overrideRecovery: true }, { profile: data.profile, sessions: data.sessions });
          if (r.ok) onReplace(r.workout);
        }}>I feel fully recovered — use the planned interval effort</button>
      )}
      {workout.removed.length > 0 && (
        <Banner tone="info">
          <strong>Left out on purpose:</strong>
          <ul className="bullets">{workout.removed.map((r, i) => <li key={i}>{r.reason}</li>)}</ul>
        </Banner>
      )}
      {err && <Banner tone="danger">{err}</Banner>}

      <details className="explain">
        <summary>How this fits your goal</summary>
        <p>{workout.fitExplanation}</p>
        <p>{workout.typeExplanation}</p>
        <button type="button" className="link" onClick={() => setRpeOpen(true)}>What do the effort numbers mean?</button>
      </details>

      {workout.blocks.map((b) => <BlockView key={b.id} block={b} onSwap={['warmup', 'cooldown'].includes(b.kind) ? undefined : setSwapId} />)}

      <ExercisePicker
        open={!!swapId}
        onClose={() => setSwapId(null)}
        exercise={swapId ? getExercise(swapId) : null}
        ctx={ctx}
        excludeIds={workout.blocks.flatMap((b) => b.items.map((i) => i.exerciseId))}
        onApply={applySwap}
      />

      <div className="sticky-actions">
        <button type="button" className="btn primary big" onClick={() => onStart(workout)}>Start mission</button>
        <div className="row">
          <button type="button" className="btn" onClick={variant}>Different version</button>
          <button type="button" className="btn" onClick={favorite} aria-pressed={saved}><Icon name="star" size={18} /> {saved ? 'Saved' : 'Save'}</button>
          <button type="button" className="btn ghost" onClick={onBack}>Back</button>
        </div>
      </div>

      <Sheet open={rpeOpen} onClose={() => setRpeOpen(false)} title="Effort scale (1–10)">
        <RpeScale />
        <p className="muted">Effort is judged by feel, not by an age-predicted heart-rate formula — those formulas are population averages, not personal limits, and some blood-pressure medications change heart-rate response.</p>
      </Sheet>
    </div>
  );
}

function prescription(block: Block, i: Block['items'][number]): string {
  if (block.kind === 'circuit') return `${i.workSec}s work`;
  if (block.kind === 'rounds') return `${(i.workSec ?? 0) % 60 ? `${i.workSec}s` : `${(i.workSec ?? 0) / 60} min`} round${i.drill ? ` · ${i.drill}` : ''}`;
  if (block.kind === 'intervals') return `${block.rounds} × ${i.workSec}s work / ${i.restSec}s easy`;
  if (block.kind === 'steady' || block.kind === 'warmup' || block.kind === 'cooldown' || block.kind === 'recovery') {
    const sec = i.workSec ?? 0;
    return sec >= 120 ? `${Math.round(sec / 60)} min` : `${sec}s`;
  }
  if (i.workSec) return `${i.sets} × ${i.workSec}s · rest ${i.restSec}s`;
  return `${i.sets} × ${i.reps} · rest ${i.restSec >= 60 ? `${Math.round(i.restSec / 6) / 10} min` : `${i.restSec}s`}`;
}

function BlockView({ block, onSwap }: { block: Block; onSwap?: (id: string) => void }) {
  return (
    <section className={`block block-${block.kind}`}>
      <div className="block-head">
        <h2>{block.title}</h2>
        {block.kind === 'circuit' && block.restBetweenRoundsSec ? <span className="muted small">{block.restBetweenRoundsSec}s between rounds</span> : null}
      </div>
      <p className="muted small">{block.description}</p>
      <ol className="ex-list">
        {block.items.map((it, idx) => {
          const ex = getExercise(it.exerciseId);
          return (
            <li key={`${it.exerciseId}-${idx}`} className="ex-item">
              <details>
                <summary>
                  <span className="ex-name">{it.group && <span className="group-tag">{it.group}</span>}{ex.name}</span>
                  <span className="ex-rx">{prescription(block, it)}{it.rpe ? <> · effort {it.rpe}</> : null}</span>
                </summary>
                <div className="ex-detail">
                  {it.rampUp && <p className="tag-line">Start with 1–2 light ramp-up sets.</p>}
                  {it.drill && <p className="suggest">Round focus: {it.drill}</p>}
                  {it.suggestion && <p className="suggest">{it.suggestion}</p>}
                  {it.loadGuidance && <p>{it.loadGuidance}</p>}
                  {it.note && <p className="caution">{it.note}</p>}
                  <ul className="bullets">{ex.cues.map((c) => <li key={c}>{c}</li>)}</ul>
                  <p className="breath">{ex.breathing}</p>
                  <ExampleLink ex={ex} />
                </div>
              </details>
              {onSwap && <button type="button" className="btn small swap-btn" aria-label={`Swap ${ex.name}`} onClick={() => onSwap(it.exerciseId)}>Swap</button>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
