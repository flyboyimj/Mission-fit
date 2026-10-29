import { useEffect, type ReactNode } from 'react';
import { demoUrl } from '../data/demo';
import type { Verse } from '../data/verses';
import type { Exercise } from '../types';
import { RPE_SCALE, STOP_SYMPTOMS, STOP_TEXT } from '../engine/health';

export function Chips<T extends string | number>({ options, value, onChange, label, id }: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  id: string;
}) {
  return (
    <fieldset className="field">
      {label && <legend className="label">{label}</legend>}
      <div className="chips" role="radiogroup" aria-label={label} id={id}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value}
            className={`chip ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)} title={o.hint}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function MultiChips<T extends string>({ options, value, onChange, label, id }: {
  options: { value: T; label: string; disabled?: boolean }[];
  value: T[];
  onChange: (v: T[]) => void;
  label?: string;
  id: string;
}) {
  return (
    <fieldset className="field">
      {label && <legend className="label">{label}</legend>}
      <div className="chips" id={id}>
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button key={o.value} type="button" aria-pressed={on} disabled={o.disabled}
              className={`chip ${on ? 'on' : ''}`} onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}>
              {on ? '✓ ' : ''}{o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Toggle({ checked, onChange, label, hint, id, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; id: string; disabled?: boolean }) {
  return (
    <label className={`toggle ${disabled ? 'disabled' : ''}`} htmlFor={id}>
      <span className="toggle-text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, label, unit, id }: { value: number | null; onChange: (v: number) => void; step?: number; min?: number; max?: number; label: string; unit?: string; id: string }) {
  const v = value ?? 0;
  return (
    <div className="stepper">
      <label htmlFor={id} className="label">{label}</label>
      <div className="stepper-row">
        <button type="button" className="btn icon" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, +(v - step).toFixed(1)))}>−</button>
        <input id={id} inputMode="decimal" value={value ?? ''} placeholder="—" onChange={(e) => { const n = parseFloat(e.target.value); onChange(isNaN(n) ? 0 : Math.min(max, Math.max(min, n))); }} />
        {unit && <span className="unit">{unit}</span>}
        <button type="button" className="btn icon" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, +(v + step).toFixed(1)))}>+</button>
      </div>
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="btn ghost small" onClick={onClose}>Close</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger' | 'ok'; children: ReactNode }) {
  return <div className={`banner ${tone}`} role={tone === 'danger' ? 'alert' : undefined}>{children}</div>;
}

export function SafetyContent() {
  return (
    <div className="stack">
      <p><strong>{STOP_TEXT}</strong></p>
      <ul className="bullets">{STOP_SYMPTOMS.map((s) => <li key={s}>{s}</li>)}</ul>
      <p className="muted">Breathe through every rep: exhale on the effort, never hold your breath or strain. Mission Fit supports fitness habits; it does not diagnose, treat or prevent any condition.</p>
    </div>
  );
}

export function RpeScale({ compact }: { compact?: boolean }) {
  return (
    <ol className={`rpe-scale ${compact ? 'compact' : ''}`}>
      {RPE_SCALE.map((r) => (
        <li key={r.value} className={r.value >= 9 ? 'off' : ''}>
          <span className="rpe-n">{r.value}</span>
          <span><strong>{r.label}</strong> — {r.desc}</span>
        </li>
      ))}
    </ol>
  );
}

export function Section({ title, children, action, id }: { title: string; children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <section className="section" id={id}>
      <div className="section-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (name) {
    case 'today': return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 4v3M12 17v3M4 12h3M17 12h3" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>;
    case 'build': return <svg {...common}><path d="M4 7h10M4 17h6M18 7h2M14 17h6" /><circle cx="16" cy="7" r="2" /><circle cx="12" cy="17" r="2" /></svg>;
    case 'plan': return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="1.5" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>;
    case 'library': return <svg {...common}><path d="M5 4h4v16H5zM10 4h4v16h-4z" /><path d="M15.5 5l3.5-.8 2 15.6-3.5.8z" /></svg>;
    case 'progress': return <svg {...common}><path d="M4 19h16" /><path d="M6 15l4-4 3 3 5-6" /></svg>;
    case 'profile': return <svg {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-3.5 3.8-5 7-5s6 1.5 7 5" /></svg>;
    case 'alert': return <svg {...common}><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>;
    case 'sound': return <svg {...common}><path d="M4 10v4h4l5 4V6L8 10z" /><path d="M16 9c1 1 1 5 0 6M18.5 7c2 2.5 2 7.5 0 10" /></svg>;
    case 'mute': return <svg {...common}><path d="M4 10v4h4l5 4V6L8 10z" /><path d="M17 10l4 4M21 10l-4 4" /></svg>;
    case 'star': return <svg {...common}><path d="M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.3 7 19l1.2-5.6L4 9.6 9.6 9z" /></svg>;
    default: return null;
  }
}

export function VerseCard({ verse, compact, label }: { verse: Verse; compact?: boolean; label?: string }) {
  return (
    <figure className={`verse ${compact ? 'compact' : ''}`}>
      {label && <p className="eyebrow">{label}</p>}
      <blockquote>{verse.text}</blockquote>
      <figcaption>{verse.ref} <span>KJV</span></figcaption>
    </figure>
  );
}

/** Link out to example videos for an exercise. Opens outside the app. */
export function ExampleLink({ ex, compact }: { ex: Exercise; compact?: boolean }) {
  return (
    <a className={`example-link ${compact ? 'compact' : ''}`} href={demoUrl(ex)} target="_blank" rel="noopener noreferrer" aria-label={`Watch an example of ${ex.name} (opens YouTube)`}>
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
      Watch an example
    </a>
  );
}
