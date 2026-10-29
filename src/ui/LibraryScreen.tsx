import { useMemo, useState } from 'react';
import { EXERCISES } from '../data/exercises';
import { checkExercise, contextFrom, LIMITATION_LABEL } from '../engine/filter';
import { useStore } from '../store/AppStore';
import type { Exercise, Limitation, Pattern } from '../types';
import { Chips, ExampleLink, Sheet, Toggle } from './kit';
import { equipText, PATTERN_LABEL } from './labels';

type Group = 'all' | 'lower' | 'push' | 'pull' | 'core' | 'cardio' | 'boxing' | 'mobility';
const GROUP: Record<Group, Pattern[]> = {
  all: [], lower: ['squat', 'hinge', 'lunge', 'calves'], push: ['h-push', 'v-push', 'shoulder-iso'], pull: ['h-pull', 'v-pull'],
  core: ['core', 'carry'], cardio: ['cardio'], boxing: [], mobility: ['mobility'],
};

export function LibraryScreen() {
  const { data, update } = useStore();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<Group>('all');
  const [onlyMine, setOnlyMine] = useState(false);
  const [loc, setLoc] = useState(data.profile.defaultLocation);
  const [open, setOpen] = useState<Exercise | null>(null);
  const ctx = contextFrom(data.profile, loc === 'gym' ? data.profile.gym : data.profile.home);

  const list = useMemo(() => EXERCISES.filter((e) => {
    if (q && !`${e.name} ${e.muscles.join(' ')}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (group === 'boxing') { if (!e.tags?.includes('boxing')) return false; }
    else if (group !== 'all' && !GROUP[group].includes(e.pattern) && !(group === 'pull' && e.pattern === 'arms' && e.muscles.includes('biceps')) && !(group === 'push' && e.pattern === 'arms' && e.muscles.includes('triceps'))) return false;
    if (onlyMine && !checkExercise(e, ctx).ok) return false;
    return true;
  }), [q, group, onlyMine, ctx]);

  const toggleAvoid = (id: string) => update((d) => ({ ...d, profile: { ...d.profile, avoidList: d.profile.avoidList.includes(id) ? d.profile.avoidList.filter((x) => x !== id) : [...d.profile.avoidList, id] } }));

  return (
    <div className="screen">
      <header className="screen-head">
        <p className="eyebrow">Exercise library</p>
        <h1>{EXERCISES.length} movements</h1>
      </header>
      <label className="field" htmlFor="lib-search"><span className="sr-only">Search</span>
        <input id="lib-search" type="search" placeholder="Search name or muscle" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <Chips id="lib-group" value={group} onChange={setGroup} options={(Object.keys(GROUP) as Group[]).map((g) => ({ value: g, label: g === 'all' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1) }))} />
      <div className="row">
        <Chips id="lib-loc" value={loc} onChange={setLoc} options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]} />
      </div>
      <Toggle id="lib-mine" checked={onlyMine} onChange={setOnlyMine} label="Only show what fits me" hint="Equipment at the selected location plus your active limitations." />

      <ul className="lib-list">
        {list.map((e) => {
          const r = checkExercise(e, ctx);
          const status = !r.ok ? 'excluded' : r.cautions.length ? 'caution' : 'ok';
          return (
            <li key={e.id}>
              <button type="button" className="lib-row" onClick={() => setOpen(e)}>
                <span className="lib-main">
                  <strong>{e.name}</strong>
                  <span className="muted small">{PATTERN_LABEL[e.pattern]} · {equipText(e.equipOptions)}</span>
                </span>
                <span className={`status s-${status}`}>{status === 'ok' ? 'Fits' : status === 'caution' ? 'Modify' : 'Excluded'}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''}>
        {open && <ExerciseDetail ex={open} ctxResult={checkExercise(open, ctx)} avoided={data.profile.avoidList.includes(open.id)} onToggleAvoid={() => toggleAvoid(open.id)} />}
      </Sheet>
    </div>
  );
}

function ExerciseDetail({ ex, ctxResult, avoided, onToggleAvoid }: { ex: Exercise; ctxResult: ReturnType<typeof checkExercise>; avoided: boolean; onToggleAvoid: () => void }) {
  return (
    <div className="stack">
      <dl className="facts">
        <div><dt>Pattern</dt><dd>{PATTERN_LABEL[ex.pattern]}</dd></div>
        <div><dt>Muscles</dt><dd>{ex.muscles.join(', ') || '—'}</dd></div>
        <div><dt>Equipment</dt><dd>{equipText(ex.equipOptions)}</dd></div>
        <div><dt>Impact</dt><dd>{ex.impact}{ex.ballistic ? ' · ballistic' : ''}</dd></div>
        {ex.grip && ex.grip !== 'none' && <div><dt>Grip</dt><dd>{ex.grip}</dd></div>}
      </dl>
      {!ctxResult.ok && <div className="banner danger"><strong>Excluded for you:</strong><ul className="bullets">{ctxResult.reasons.map((r) => <li key={r}>{r}</li>)}</ul></div>}
      {ctxResult.cautions.length > 0 && <div className="banner warn"><strong>Modify:</strong><ul className="bullets">{ctxResult.cautions.map((c) => <li key={c.area}>{LIMITATION_LABEL[c.area]}: {c.text}</li>)}</ul></div>}
      <h3>Technique</h3>
      <ul className="bullets">{ex.cues.map((c) => <li key={c}>{c}</li>)}</ul>
      <p className="breath">{ex.breathing}</p>
      <ExampleLink ex={ex} />
      {Object.keys(ex.limits).length > 0 && (
        <>
          <h3>Limitation tags</h3>
          <ul className="tag-list">
            {(Object.entries(ex.limits) as [Limitation, string][]).map(([k, v]) => <li key={k} className={`tag ${v}`}>{LIMITATION_LABEL[k]}: {v}</li>)}
            {ex.tags?.map((t) => <li key={t} className="tag">{t}</li>)}
          </ul>
        </>
      )}
      <button type="button" className="btn" onClick={onToggleAvoid}>{avoided ? 'Remove from avoid list' : 'Add to avoid list'}</button>
    </div>
  );
}
