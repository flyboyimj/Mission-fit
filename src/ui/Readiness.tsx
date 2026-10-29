import type { Readiness } from '../types';
import { MultiChips } from './kit';
import { LIMIT_OPTIONS } from './labels';

const ENERGY = ['Drained', 'Low', 'OK', 'Good', 'Charged'];
const SORE = ['None', 'Mild', 'Some', 'Sore', 'Very sore'];

export function ReadinessCheck({ value, onChange }: { value: Readiness; onChange: (r: Readiness) => void }) {
  return (
    <div className="stack">
      <fieldset className="field">
        <legend className="label">Energy</legend>
        <div className="scale5">
          {ENERGY.map((l, i) => (
            <button type="button" key={l} className={`chip ${value.energy === i + 1 ? 'on' : ''}`} onClick={() => onChange({ ...value, energy: (i + 1) as Readiness['energy'] })}>
              <b>{i + 1}</b><small>{l}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="field">
        <legend className="label">Soreness</legend>
        <div className="scale5">
          {SORE.map((l, i) => (
            <button type="button" key={l} className={`chip ${value.soreness === i + 1 ? 'on' : ''}`} onClick={() => onChange({ ...value, soreness: (i + 1) as Readiness['soreness'] })}>
              <b>{i + 1}</b><small>{l}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <MultiChips id="readiness-discomfort" label="Discomfort today (these areas get extra protection)" options={LIMIT_OPTIONS} value={value.discomfort} onChange={(d) => onChange({ ...value, discomfort: d })} />
    </div>
  );
}
