import { useRef, useState } from 'react';
import { defaultReviewDate, SCREENING_QUESTIONS, screeningFlags, urgentFlags } from '../engine/health';
import { todayIso } from '../engine/plan';
import { useStore } from '../store/AppStore';
import { exportJson, importJson } from '../store/storage';
import type { CardioMachine, Equip, Inventory, Limitation, Profile, ScreeningAnswers } from '../types';
import { WeightInput } from './BuildScreen';
import { Banner, MultiChips, Toggle } from './kit';
import { CARDIO, MACHINES } from './labels';

export const LIMIT_INFO: { key: Limitation; label: string; prior: boolean; desc: string }[] = [
  { key: 'wrist', label: 'Wrists', prior: true, desc: 'Excludes push-ups, dips and loaded wrist extension; prefers neutral grips.' },
  { key: 'lowBack', label: 'Lower back', prior: true, desc: 'Excludes unsupported bent-over rows, sit-ups, twists and swings; favors supported rows and reduced-range hinges.' },
  { key: 'knee', label: 'Knees', prior: true, desc: 'Excludes jumping and walking lunges; uses box squats, partial ranges and low steps.' },
  { key: 'foot', label: 'Feet', prior: true, desc: 'Excludes running and jumping; shortens carries; favors bike, elliptical and rower.' },
  { key: 'shoulder', label: 'Shoulders', prior: false, desc: 'Excludes dips; limits overhead range and lateral-raise height.' },
  { key: 'hypertension', label: 'High blood pressure', prior: true, desc: 'Breathing cues on every lift, short isometric holds, no maximal efforts; vigorous intervals need recorded clinician guidance.' },
];

export function LimitationsEditor({ profile, onChange }: { profile: Profile; onChange: (l: Profile['limitations']) => void }) {
  return (
    <div className="stack">
      {LIMIT_INFO.map((l) => (
        <div key={l.key} className="limit-row">
          <div>
            <strong>{l.label}</strong>
            {l.prior && <span className="tag">previously reported</span>}
            <p className="muted small">{l.desc}</p>
          </div>
          <div className="seg" role="radiogroup" aria-label={`${l.label} status`}>
            <button type="button" role="radio" aria-checked={profile.limitations[l.key]} className={`chip ${profile.limitations[l.key] ? 'on' : ''}`} onClick={() => onChange({ ...profile.limitations, [l.key]: true })}>Active</button>
            <button type="button" role="radio" aria-checked={!profile.limitations[l.key]} className={`chip ${!profile.limitations[l.key] ? 'on' : ''}`} onClick={() => onChange({ ...profile.limitations, [l.key]: false })}>Not now</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ScreeningForm({ value, onAnswer }: { value: ScreeningAnswers; onAnswer: (key: keyof ScreeningAnswers, v: boolean) => void }) {
  return (
    <ol className="screening">
      {SCREENING_QUESTIONS.map((q) => (
        <li key={q.key}>
          <p>{q.text}</p>
          <div className="seg" role="radiogroup" aria-label={q.text}>
            <button type="button" role="radio" aria-checked={value[q.key] === true} className={`chip ${value[q.key] === true ? 'on warn' : ''}`} onClick={() => onAnswer(q.key, true)}>Yes</button>
            <button type="button" role="radio" aria-checked={value[q.key] === false} className={`chip ${value[q.key] === false ? 'on' : ''}`} onClick={() => onAnswer(q.key, false)}>No</button>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ScreeningResult({ profile }: { profile: Profile }) {
  const flags = screeningFlags(profile);
  if (urgentFlags(profile)) return <Banner tone="danger"><strong>Please talk to a clinician before training.</strong> Chest symptoms, fainting or a supervision requirement need medical input first. If symptoms are happening now or are severe, seek urgent care.</Banner>;
  if (flags.length) return <Banner tone="warn"><strong>Clinician guidance recommended before vigorous exercise.</strong> You can train at moderate effort (up to 6/10) now. Vigorous intervals unlock once you record guidance below.</Banner>;
  return <Banner tone="ok">No flags. Effort is still capped at 8/10 and progresses gradually.</Banner>;
}

export function ClearanceForm({ profile, onChange }: { profile: Profile; onChange: (c: Profile['clearance']) => void }) {
  const c = profile.clearance ?? { hasGuidance: false, date: todayIso(), notes: '', reviewBy: defaultReviewDate() };
  return (
    <div className="stack">
      <Toggle id="clr-has" checked={c.hasGuidance} onChange={(v) => onChange({ ...c, hasGuidance: v })} label="A clinician has advised me on vigorous exercise" hint="Record what they said in your own words." />
      {c.hasGuidance && (
        <>
          <div className="grid2">
            <label className="field" htmlFor="clr-date"><span className="label">Date of guidance</span><input id="clr-date" type="date" value={c.date} onChange={(e) => onChange({ ...c, date: e.target.value })} /></label>
            <label className="field" htmlFor="clr-review"><span className="label">Review by</span><input id="clr-review" type="date" value={c.reviewBy} onChange={(e) => onChange({ ...c, reviewBy: e.target.value })} /></label>
          </div>
          <label className="field" htmlFor="clr-notes"><span className="label">Notes (limits, targets, medication effects)</span><textarea id="clr-notes" rows={2} value={c.notes} onChange={(e) => onChange({ ...c, notes: e.target.value })} /></label>
        </>
      )}
      <p className="muted small">Guidance is time-limited. A past normal cardiac evaluation isn't permanent clearance — the cap returns on the review date, or if new chest symptoms, fainting or a supervision requirement are reported.</p>
    </div>
  );
}

export function InventoryEditor({ inv, onChange, idp }: { inv: Inventory; onChange: (i: Inventory) => void; idp: string }) {
  return (
    <div className="stack">
      <Toggle id={`${idp}-db`} checked={inv.dumbbell} onChange={(v) => onChange({ ...inv, dumbbell: v })} label="Dumbbells" />
      {inv.dumbbell && <WeightInput id={`${idp}-dbw`} label="Dumbbell weights (lb)" value={inv.dumbbellWeights} onChange={(w) => onChange({ ...inv, dumbbellWeights: w })} />}
      <Toggle id={`${idp}-kb`} checked={inv.kettlebell} onChange={(v) => onChange({ ...inv, kettlebell: v })} label="Kettlebells" />
      {inv.kettlebell && <WeightInput id={`${idp}-kbw`} label="Kettlebell weights (lb)" value={inv.kettlebellWeights} onChange={(w) => onChange({ ...inv, kettlebellWeights: w })} />}
      <Toggle id={`${idp}-cable`} checked={inv.cable} onChange={(v) => onChange({ ...inv, cable: v })} label="Cable machine" />
      <Toggle id={`${idp}-bench`} checked={inv.bench} onChange={(v) => onChange({ ...inv, bench: v })} label="Adjustable bench" />
      <Toggle id={`${idp}-bag`} checked={!!inv.heavyBag} onChange={(v) => onChange({ ...inv, heavyBag: v })} label="Heavy bag" />
      <MultiChips id={`${idp}-machines`} label="Resistance machines" value={inv.machines} onChange={(v: Equip[]) => onChange({ ...inv, machines: v })} options={MACHINES.map((m) => ({ value: m.id, label: m.label }))} />
      <MultiChips id={`${idp}-cardio`} label="Cardio machines" value={inv.cardio} onChange={(v: CardioMachine[]) => onChange({ ...inv, cardio: v })} options={CARDIO.map((m) => ({ value: m.id, label: m.label }))} />
    </div>
  );
}

export function DataControls() {
  const { data, replace, wipe, persistent } = useStore();
  const [exportText, setExportText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paste, setPaste] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState<ReturnType<typeof importJson> | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  const doExport = async () => {
    const text = exportJson(data);
    setExportText(text);
    setCopied(false);
    const filename = `mission-fit-backup-${todayIso()}.json`;
    // Inside the claude.ai artifact viewer, files go through the host's downloads capability.
    const host = (window as unknown as { claude?: { use: (n: string) => Promise<{ save: (r: { filename: string; data: string }) => Promise<unknown> } | null> } }).claude;
    if (host?.use) {
      try {
        const dl = await host.use('downloads');
        if (dl) { await dl.save({ filename, data: text }); return; }
      } catch (e) {
        if ((e as { code?: string }).code === 'declined') return;
      }
    }
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch { /* download may be blocked; copy box below still works */ }
  };
  const copy = async () => {
    if (!exportText) return;
    try { await navigator.clipboard.writeText(exportText); setCopied(true); }
    catch { area.current?.select(); setMsg({ tone: 'danger', text: 'Copy was blocked — the text is selected; copy it manually.' }); }
  };
  const stage = (text: string) => {
    try { setPending(importJson(text)); setMsg(null); }
    catch (e) { setPending(null); setMsg({ tone: 'danger', text: (e as Error).message }); }
  };
  const onFile = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => stage(String(r.result));
    r.readAsText(f);
  };

  return (
    <div className="stack">
      <Banner tone="info">
        Your profile, health answers and history are stored only in this browser's local storage{persistent ? '' : ' — which is unavailable right now, so nothing will be kept after you close this page'}. Nothing is sent anywhere. Clearing browser data, private browsing or switching devices loses it, so export a backup regularly.
      </Banner>
      <button type="button" className="btn" onClick={doExport}>Export backup</button>
      {exportText && (
        <div className="stack">
          <p className="muted small">If no download started, copy this text and save it in a file or note.</p>
          <textarea ref={area} readOnly rows={4} value={exportText} id="export-text" />
          <button type="button" className="btn small" onClick={copy}>{copied ? 'Copied' : 'Copy to clipboard'}</button>
        </div>
      )}
      <label className="field" htmlFor="import-file"><span className="label">Import backup file</span>
        <input id="import-file" type="file" accept="application/json,.json" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      <label className="field" htmlFor="import-paste"><span className="label">…or paste backup text</span>
        <textarea id="import-paste" rows={2} value={paste} onChange={(e) => setPaste(e.target.value)} />
      </label>
      {paste && <button type="button" className="btn small" onClick={() => stage(paste)}>Check pasted backup</button>}
      {pending && (
        <Banner tone="warn">
          Backup contains {pending.sessions.length} sessions and {pending.body.length} measurements. Importing replaces everything on this device.
          <div className="row"><button type="button" className="btn primary small" onClick={() => { replace(pending); setPending(null); setPaste(''); setMsg({ tone: 'ok', text: 'Backup imported.' }); }}>Replace my data</button>
            <button type="button" className="btn ghost small" onClick={() => setPending(null)}>Cancel</button></div>
        </Banner>
      )}
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
      <div className="danger-zone">
        <label className="field" htmlFor="del-confirm"><span className="label">Delete all data — type DELETE to confirm</span>
          <input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        </label>
        <button type="button" className="btn danger" disabled={confirm !== 'DELETE'} onClick={() => { wipe(); setConfirm(''); }}>Delete everything</button>
      </div>
    </div>
  );
}
