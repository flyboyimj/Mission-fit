import { useEffect, useState } from 'react';
import type { FilterContext } from '../engine/filter';
import { findSubstitutes, searchExercises, type SearchHit, type SubOption, type SubReason } from '../engine/substitute';
import type { Exercise, Limitation } from '../types';
import { Banner, Sheet, Toggle } from './kit';
import { equipText, LIMIT_OPTIONS, PATTERN_LABEL } from './labels';

/**
 * Lets the user choose the replacement. Three levels:
 *  1. Suggested — best matches for the same slot
 *  2. More for this slot — every other exercise with the same pattern/muscles
 *  3. Search all — any exercise your restrictions allow
 * Every list passes the same restriction filter as the generator.
 */
export function ExercisePicker({ open, onClose, exercise, ctx, excludeIds, onApply, allowRemove = true }: {
  open: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  ctx: FilterContext;
  excludeIds: string[];
  onApply: (from: string, to: Exercise | null, reason: SubReason, permanentAvoid: boolean) => void;
  allowRemove?: boolean;
}) {
  const [reason, setReason] = useState<SubReason>('choose');
  const [area, setArea] = useState<Limitation | 'other' | null>(null);
  const [never, setNever] = useState(false);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { if (open) { setReason('choose'); setArea(null); setNever(false); setQuery(''); setShowAll(false); } }, [open, exercise?.id]);
  if (!exercise) return null;

  const waitingForArea = reason === 'hurts' && !area;
  const hurtArea = reason === 'hurts' ? area ?? undefined : undefined;
  const exclude = [...excludeIds, exercise.id];
  const result = waitingForArea ? null : findSubstitutes(exercise.id, reason, ctx, { hurtArea, excludeIds: exclude });
  const slotIds = new Set([...(result?.options ?? []), ...(result?.more ?? [])].map((o) => o.exercise.id));
  const searching = query.trim().length > 0;
  const hits: SearchHit[] = waitingForArea || (!searching && !showAll) ? [] : searchExercises(ctx, { excludeIds: exclude, hurtArea, query }).filter((o) => o.exercise.id !== exercise.id && (searching || !slotIds.has(o.exercise.id)));
  const allowedHits = hits.filter((h) => h.allowed);
  const blockedHits = hits.filter((h) => !h.allowed);
  const pick = (to: Exercise | null) => onApply(exercise.id, to, reason, never);

  return (
    <Sheet open={open} onClose={onClose} title={`Swap: ${exercise.name}`}>
      <div className="stack">
        <div className="chips" role="radiogroup" aria-label="Reason">
          {([['choose', 'I’ll choose'], ['busy', 'Equipment busy'], ['dislike', 'Don’t like this'], ['hurts', 'This hurts']] as [SubReason, string][]).map(([r, l]) => (
            <button type="button" key={r} role="radio" aria-checked={reason === r} className={`chip ${reason === r ? (r === 'hurts' ? 'on danger' : 'on') : ''}`} onClick={() => { setReason(r); setArea(null); }}>{l}</button>
          ))}
        </div>

        {reason === 'hurts' && (
          <>
            <Banner tone="danger">Stop this movement now — don't train through pain.</Banner>
            <fieldset className="field">
              <legend className="label">Where?</legend>
              <div className="chips">
                {[...LIMIT_OPTIONS, { value: 'other' as const, label: 'Somewhere else' }].map((o) => (
                  <button type="button" key={o.value} className={`chip ${area === o.value ? 'on' : ''}`} onClick={() => setArea(o.value)}>{o.label}</button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        {reason === 'dislike' && <Toggle id="sub-never" checked={never} onChange={setNever} label="Don't suggest this exercise again" hint="Adds it to your avoid list (editable in Profile)." />}

        {result && (
          <>
            {result.safety && <p className="muted small">{result.safety}</p>}
            {result.options.length > 0 && <OptionList title="Suggested" items={result.options} onPick={pick} />}
            {result.more.length > 0 && <OptionList title="More for this slot" items={result.more} onPick={pick} />}
            {result.removalReason && <Banner tone="info">{result.removalReason}</Banner>}
          </>
        )}

        {!waitingForArea && (
          <>
            <label className="field" htmlFor="pick-search">
              <span className="label">Search the whole library</span>
              <input id="pick-search" type="search" placeholder="Name, muscle or equipment — e.g. chest, legs, abs, cable row" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            {!searching && !showAll && <button type="button" className="link" onClick={() => setShowAll(true)}>Browse the whole library</button>}
            {(searching || showAll) && (
              <>
                {allowedHits.length
                  ? <OptionList title={searching ? `You can use (${allowedHits.length})` : `Other exercises you can use (${allowedHits.length})`} items={allowedHits} onPick={pick} showPattern />
                  : <p className="muted small">Nothing {searching ? 'matching' : 'else'} is available with today's equipment and restrictions.</p>}
                {blockedHits.length > 0 && (
                  <details className="blocked">
                    <summary>Not available right now ({blockedHits.length})</summary>
                    <ul className="blocked-list">
                      {blockedHits.map((h) => (
                        <li key={h.exercise.id}>
                          <strong>{h.exercise.name}</strong>
                          <span className="muted small">{h.reasons.join(' · ')}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
            <p className="muted small">Search covers all {searchExercises(ctx).length} main exercises. Unavailable ones show why. Picking one from a different muscle group changes what this slot trains.</p>
          </>
        )}

        {allowRemove && !waitingForArea && <button type="button" className="btn ghost" onClick={() => pick(null)}>Remove this movement from today's mission</button>}
      </div>
    </Sheet>
  );
}

function OptionList({ title, items, onPick, showPattern }: { title: string; items: SubOption[]; onPick: (e: Exercise) => void; showPattern?: boolean }) {
  return (
    <section className="stack tight">
      <h3 className="label">{title}</h3>
      {items.map((o) => (
        <button type="button" key={o.exercise.id} className="option" onClick={() => onPick(o.exercise)}>
          <strong>{o.exercise.name}</strong>
          <span className="muted small">{showPattern ? `${PATTERN_LABEL[o.exercise.pattern]} · ` : ''}{equipText(o.exercise.equipOptions)}</span>
          {o.why && <span className="muted small">{o.why}</span>}
        </button>
      ))}
    </section>
  );
}
