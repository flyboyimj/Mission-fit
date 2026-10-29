import { useState } from 'react';
import { getExercise } from '../data/exercises';
import { clearanceValid, effortCap, screeningComplete } from '../engine/health';
import { useStore } from '../store/AppStore';
import type { Profile } from '../types';
import { Banner, Chips, RpeScale, SafetyContent, Section, Toggle } from './kit';
import { ClearanceForm, DataControls, InventoryEditor, LimitationsEditor, ScreeningForm, ScreeningResult } from './ProfileParts';

export function ProfileScreen() {
  const { data, update } = useStore();
  const p = data.profile;
  const setP = (patch: Partial<Profile>) => update((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
  const [screenOpen, setScreenOpen] = useState(false);
  const [invTab, setInvTab] = useState<'gym' | 'home'>(p.defaultLocation);
  const [impactAck, setImpactAck] = useState(false);
  const [ballAck, setBallAck] = useState(false);
  const cap = effortCap(p);
  const impactBlocked = p.limitations.knee || p.limitations.foot || !screeningComplete(p.screening);
  const ballisticBlocked = p.limitations.lowBack || p.limitations.wrist || !screeningComplete(p.screening);

  return (
    <div className="screen">
      <header className="screen-head">
        <p className="eyebrow">Profile & restrictions</p>
        <h1>Service record</h1>
      </header>

      <Section title="About you">
        <div className="grid2">
          <label className="field" htmlFor="pf-name"><span className="label">Name (optional)</span><input id="pf-name" value={p.name} onChange={(e) => setP({ name: e.target.value })} /></label>
          <label className="field" htmlFor="pf-age"><span className="label">Age</span><input id="pf-age" inputMode="numeric" value={p.age || ''} onChange={(e) => setP({ age: parseInt(e.target.value) || 0 })} /></label>
          <label className="field" htmlFor="pf-cw"><span className="label">Current weight (lb)</span><input id="pf-cw" inputMode="decimal" value={p.currentWeight || ''} onChange={(e) => setP({ currentWeight: parseFloat(e.target.value) || 0 })} /></label>
          <label className="field" htmlFor="pf-gw"><span className="label">Goal weight (lb)</span><input id="pf-gw" inputMode="decimal" value={p.goalWeight || ''} onChange={(e) => setP({ goalWeight: parseFloat(e.target.value) || 0 })} /></label>
        </div>
      </Section>

      <Section title="Physical limitations">
        <p className="muted small">{p.limitationsConfirmedAt ? `Last confirmed ${new Date(p.limitationsConfirmedAt).toLocaleDateString()}.` : 'Not yet confirmed.'} Changes apply to every generated workout, substitution and Surprise Me.</p>
        <LimitationsEditor profile={p} onChange={(l) => setP({ limitations: l, limitationsConfirmedAt: new Date().toISOString(), allowHighImpact: (l.knee || l.foot) ? false : p.allowHighImpact, allowBallistic: (l.lowBack || l.wrist) ? false : p.allowBallistic })} />
        <Toggle id="pf-loaded" checked={p.loadedMain ?? true} onChange={(v) => setP({ loadedMain: v })} label="Weighted main work" hint="Lifts, circuits and core use dumbbells, kettlebells, cables or machines. Bodyweight moves stay in warm-ups, cool-downs and recovery." />
        <Toggle id="pf-neutral" checked={p.preferNeutralGrip} onChange={(v) => setP({ preferNeutralGrip: v })} label="Prefer neutral grips" hint="When wrists are limited, exclude palms-up/palms-down grip variations." />
      </Section>

      <Section title="Health screening">
        <ScreeningResult profile={p} />
        <p className="muted small">{p.screeningAt ? `Completed ${new Date(p.screeningAt).toLocaleDateString()}.` : 'Not completed.'} Retake it whenever your health changes.</p>
        {screenOpen ? (
          <>
            <ScreeningForm value={p.screening} onAnswer={(k, v) => update((d) => ({ ...d, profile: { ...d.profile, screening: { ...d.profile.screening, [k]: v }, screeningAt: new Date().toISOString() } }))} />
            <button type="button" className="btn" onClick={() => setScreenOpen(false)}>Done</button>
          </>
        ) : <button type="button" className="btn" onClick={() => setScreenOpen(true)}>Retake screening</button>}
      </Section>

      <Section title="Clinician guidance">
        <Banner tone={cap.vigorousAllowed ? 'ok' : 'warn'}>{cap.vigorousAllowed ? (clearanceValid(p) ? `Guidance recorded — valid until ${p.clearance!.reviewBy}. ` : '') + cap.reason : cap.reason}</Banner>
        <ClearanceForm profile={p} onChange={(c) => setP({ clearance: c })} />
      </Section>

      <Section title="Permissions">
        <p className="muted small">Off by default. Each needs a completed screening, no conflicting limitation, and your explicit choice.</p>
        <Toggle id="pf-impact" checked={p.allowHighImpact} disabled={impactBlocked || (!p.allowHighImpact && !impactAck)} onChange={(v) => setP({ allowHighImpact: v })}
          label="Allow high-impact moves" hint={impactBlocked ? 'Unavailable while knees or feet are active, or screening is incomplete.' : 'Jumping and running. Tick the acknowledgment below first.'} />
        {!impactBlocked && !p.allowHighImpact && <Toggle id="pf-impact-ack" checked={impactAck} onChange={setImpactAck} label="I understand high-impact work raises joint load and I'll stop if anything hurts" />}
        <Toggle id="pf-ballistic" checked={p.allowBallistic} disabled={ballisticBlocked || (!p.allowBallistic && !ballAck)} onChange={(v) => setP({ allowBallistic: v })}
          label="Allow ballistic kettlebell work" hint={ballisticBlocked ? 'Unavailable while lower back or wrists are active, or screening is incomplete.' : 'Swings and cleans. Tick the acknowledgment below first.'} />
        {!ballisticBlocked && !p.allowBallistic && <Toggle id="pf-ball-ack" checked={ballAck} onChange={setBallAck} label="I know these lifts well and will keep loads moderate" />}
      </Section>

      <Section title="Avoid list">
        {p.avoidList.length ? (
          <ul className="tag-list">
            {p.avoidList.map((id) => (
              <li key={id} className="tag removable">
                {safeName(id)}
                <button type="button" aria-label={`Allow ${safeName(id)}`} onClick={() => setP({ avoidList: p.avoidList.filter((x) => x !== id) })}>×</button>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Nothing on your avoid list.</p>}
        <p className="muted small">Push-ups, dips, high planks and burpees start here by default. Even if removed, your limitation settings still apply.</p>
      </Section>

      <Section title="Equipment">
        <Chips id="pf-loc" label="Default location" value={p.defaultLocation} onChange={(v) => setP({ defaultLocation: v })} options={[{ value: 'gym', label: 'Commercial gym' }, { value: 'home', label: 'Home' }]} />
        <Chips id="pf-invtab" label="Edit inventory" value={invTab} onChange={setInvTab} options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]} />
        <InventoryEditor key={invTab} idp={`inv-${invTab}`} inv={p[invTab]} onChange={(i) => setP({ [invTab]: i } as Partial<Profile>)} />
      </Section>

      <Section title="Audio">
        <Toggle id="pf-audio" checked={p.audioCues} onChange={(v) => setP({ audioCues: v })} label="Countdown beeps" hint="3-2-1 beeps and a tone at each new step." />
        <Toggle id="pf-voice" checked={p.voiceCues} onChange={(v) => setP({ voiceCues: v })} label="Voice announcements" hint="Speaks the next exercise using your device's voice." />
      </Section>

      <Section title="Scripture">
        <Toggle id="pf-verses" checked={p.showVerses ?? true} onChange={(v) => setP({ showVerses: v })} label="Show Bible verses" hint="A verse for the day on Today, one matched to each mission, short verses on rest screens, and a closing verse in the debrief. King James Version." />
      </Section>

      <Section title="Effort scale">
        <RpeScale />
      </Section>

      <Section title="Safety">
        <SafetyContent />
      </Section>

      <Section title="Your data">
        <DataControls />
      </Section>

      <p className="muted small center">Mission Fit is a training log and planner. It does not provide medical advice, diagnose, treat or prevent any disease.</p>
    </div>
  );
}

function safeName(id: string) {
  try { return getExercise(id).name; } catch { return id; }
}
