import { useEffect, useState } from 'react';
import { getExercise } from './data/exercises';
import { checkExercise, contextFrom } from './engine/filter';
import { generateWorkout } from './engine/generator';
import { AppStoreProvider, useStore } from './store/AppStore';
import { type ActiveSnapshot, clearActive, loadActive } from './store/activeSession';
import type { AppData, Workout } from './types';
import { ActiveWorkout } from './ui/ActiveWorkout';
import { BuildScreen } from './ui/BuildScreen';
import { Banner, Icon, Sheet } from './ui/kit';
import { LibraryScreen } from './ui/LibraryScreen';
import { MissionBrief } from './ui/MissionBrief';
import { Onboarding } from './ui/Onboarding';
import { PlanScreen } from './ui/PlanScreen';
import { ProfileScreen } from './ui/ProfileScreen';
import { ProgressScreen, rehydrate } from './ui/ProgressScreen';
import { TodayScreen } from './ui/TodayScreen';

type Tab = 'today' | 'build' | 'plan' | 'library' | 'progress' | 'profile';
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'build', label: 'Build' },
  { id: 'plan', label: 'Plan' },
  { id: 'library', label: 'Library' },
  { id: 'progress', label: 'Progress' },
];

export default function App({ initial }: { initial?: AppData }) {
  return (
    <AppStoreProvider initial={initial}>
      <Shell />
    </AppStoreProvider>
  );
}

function Shell() {
  const { data, persistent, saveFailed } = useStore();
  const [tab, setTab] = useState<Tab>(() => {
    const h = typeof location !== 'undefined' ? location.hash.replace('#', '') : '';
    return (['today', 'build', 'plan', 'library', 'progress', 'profile'].includes(h) ? h : 'today') as Tab;
  });
  const [brief, setBrief] = useState<Workout | null>(null);
  const [active, setActive] = useState<Workout | null>(null);
  const [resumeSnap, setResumeSnap] = useState<ActiveSnapshot | null>(() => loadActive());
  const [resuming, setResuming] = useState<ActiveSnapshot | null>(null);
  const [replaceAsk, setReplaceAsk] = useState<Workout | null>(null);
  const startMission = (w: Workout) => {
    if (resumeSnap) { setReplaceAsk(w); return; }
    setResuming(null); setActive(w);
  };
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { window.scrollTo?.(0, 0); }, [tab, brief, active]);

  /** Saved/repeated workouts are re-checked against today's restrictions before use. */
  const openBrief = (w: Workout) => {
    const prof = data.profile;
    const ctx = contextFrom(prof, w.params.inventory, w.params.readiness);
    const bad = w.blocks.flatMap((b) => b.items).filter((i) => !checkExercise(getExercise(i.exerciseId), ctx).ok);
    if (bad.length) {
      const r = generateWorkout({ ...w.params, seed: w.params.seed + 1 }, { profile: prof, sessions: data.sessions });
      if (r.ok) {
        setNotice(`Your restrictions or equipment changed since this mission was saved (${bad.map((b) => getExercise(b.exerciseId).name).join(', ')} no longer fit). Here is an updated version with the same settings.`);
        setBrief(r.workout);
        return;
      }
      setNotice(`This saved mission no longer fits your restrictions: ${r.details.join(' ')}`);
      return;
    }
    setNotice(null);
    setBrief(w.steps?.length ? w : rehydrate(w));
  };

  if (!data.profile.onboarded) return <Onboarding />;
  if (active) return <ActiveWorkout workout={active} resume={resuming} onExit={() => { clearActive(); setResumeSnap(null); setResuming(null); setActive(null); setBrief(null); setTab('progress'); }} />;

  return (
    <div className="app">
      <header className="topbar">
        <span className="wordmark">MISSION<span>FIT</span></span>
        <button type="button" className={`btn icon ${tab === 'profile' && !brief ? 'on' : ''}`} aria-label="Profile and restrictions" onClick={() => { setBrief(null); setTab('profile'); }}>
          <Icon name="profile" />
        </button>
      </header>
      {!persistent && <Banner tone="warn">Browser storage is unavailable — changes will be lost when you close this page. Export a backup from Profile.</Banner>}
      {saveFailed && <Banner tone="danger">Couldn't save to this device (storage may be full). Export a backup from Profile.</Banner>}
      {notice && <Banner tone="info">{notice}</Banner>}

      <main className="content">
        {brief ? (
          <MissionBrief workout={brief} onStart={startMission} onBack={() => { setBrief(null); setNotice(null); }} onReplace={setBrief} />
        ) : tab === 'today' ? <TodayScreen onBrief={openBrief} go={(t) => setTab(t as Tab)} resume={resumeSnap} onResume={() => { if (resumeSnap) { setResuming(resumeSnap); setActive(resumeSnap.workout); } }} onDiscard={() => { clearActive(); setResumeSnap(null); }} />
          : tab === 'build' ? <BuildScreen onBrief={openBrief} go={(t) => setTab(t as Tab)} />
          : tab === 'plan' ? <PlanScreen />
          : tab === 'library' ? <LibraryScreen />
          : tab === 'progress' ? <ProgressScreen onRepeat={openBrief} />
          : <ProfileScreen />}
      </main>

      {resumeSnap && tab !== 'today' && !brief && (
        <button type="button" className="resume-pill" onClick={() => { setResuming(resumeSnap); setActive(resumeSnap.workout); }}>
          Resume {resumeSnap.workout.name}
        </button>
      )}
      <Sheet open={!!replaceAsk} onClose={() => setReplaceAsk(null)} title="Mission in progress">
        <p>You have an unfinished mission{resumeSnap ? `: ${resumeSnap.workout.name}` : ''}. Starting this one discards it.</p>
        <div className="stack">
          <button type="button" className="btn primary big" onClick={() => { if (resumeSnap) { setReplaceAsk(null); setBrief(null); setResuming(resumeSnap); setActive(resumeSnap.workout); } }}>Resume unfinished mission</button>
          <button type="button" className="btn" onClick={() => { const w = replaceAsk; clearActive(); setResumeSnap(null); setReplaceAsk(null); setResuming(null); setActive(w); }}>Discard it and start this one</button>
        </div>
      </Sheet>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button type="button" key={t.id} className={tab === t.id && !brief ? 'on' : ''} aria-current={tab === t.id && !brief ? 'page' : undefined} onClick={() => { setBrief(null); setNotice(null); setTab(t.id); }}>
            <Icon name={t.id} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
