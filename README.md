# Mission Fit

Mission Fit is a mobile-first workout planner and logger with military-inspired structure. It takes your physical limitations, blood pressure, equipment and recovery into account when it builds a workout. It is built with React and TypeScript.

The rules-based generator runs entirely in the browser. It makes no AI or API calls and has no backend. Your data is kept in `localStorage`, with controls to export, import and delete it.

## Run it

```bash
npm install
npm run dev          # local dev server
npm test             # 41 unit + UI tests (Vitest + Testing Library)
npm run build        # PWA build → dist/ (installable, offline-capable)
npm run build:single # one self-contained HTML file → dist-single/
```

### Install on your Android phone (PWA)

The app is published to GitHub Pages by `.github/workflows/deploy-pages.yml` on every push to `main`. Tests run first, and nothing is published if they fail.

Live app: **https://flyboyimj.github.io/Mission-fit/**

Open that address in Chrome on your phone and choose **⋮ → Install app**. The service worker caches the app shell, so it keeps working at a gym with poor signal.

## Architecture

| Area | File | Notes |
|---|---|---|
| Exercise library | `src/data/exercises.ts` | 111 movements (including shadow-boxing and heavy-bag drills); weighted versions are preferred whenever the equipment is there. Each has equipment options, movement pattern, muscles, impact, ballistic flag, grip, cues, breathing, and per-limitation `avoid` / `caution` rules with modifications. |
| Restriction filter | `src/engine/filter.ts` | `checkExercise()` is the only gatekeeper. The generator, substitutions, Surprise Me, the Library and saved-workout re-checks all call it. |
| Health logic | `src/engine/health.ts` | 8-question screening and the 1–10 effort scale. Effort is capped at 6/10 until clinician guidance is recorded. Guidance expires on its review date, or immediately if new urgent symptoms are reported. |
| Generator | `src/engine/generator.ts` | Builds warm-up, main blocks and cool-down within your time budget. Strength work comes before conditioning. It is history-aware: no back-to-back hard sessions, and it spreads muscle load. If it can't build a valid workout, it returns an explanation. |
| Substitutions | `src/engine/substitute.ts`, `src/ui/ExercisePicker.tsx` | You choose the replacement: suggested matches, every other option for the same slot, or search/browse any allowed exercise. Available in the brief (Swap) and during the workout (Substitute). |
| Substitution rules | `src/engine/substitute.ts` | Keeps the same movement pattern and muscles. Adds "busy / dislike / hurts" logic. If nothing fits, the movement is removed and the reason given. |
| Timer | `src/engine/timer.ts` | Pure, timestamp-based reducer: start, pause, resume, skip, +30 s, finish. It stays accurate if the phone sleeps. |
| Sets & reps | `src/engine/generator.ts` | Every lift is 3–4 working sets of 8–12 reps. Goal changes rest and effort, not the scheme. Lifts start at 3 sets; spare time adds a 4th. |
| Push / pull days | `src/engine/generator.ts` (`buildSplit`) | Push slots, in order: flat bench → incline press → machine fly; overhead press → Smith press → raises; pushdown → lying extension → kickback (each slot has fallbacks when equipment or restrictions rule it out). Push = 3 chest + 3 shoulder + 3 triceps. Pull = 3 back + 3 biceps. All at 3–4 × 8–12. Straight sets when time allows, otherwise supersets/trisets (15 s switch). Push/pull days are always the full count: lifting only, and sessions under 45 min are extended to 45 min with a notice. |
| Body-part picker | `src/engine/generator.ts` (`customGroups`) | In Build, pick any mix of chest, back, shoulders, quads, hamstrings, glutes, biceps, triceps, calves or core. Each gets 3 exercises (2 each for 4–5 parts, 1 each for 6+) at 3–4 × 8–12. Supersets never exceed 3 exercises, and time is extended when needed. |
| Boxing | `src/engine/generator.ts` (`buildBoxing`) | Timed rounds (default 2 min, 60 s rest) rotating shadow combos, defense/footwork and heavy-bag straight punches, then a weighted core finisher. Bag hooks are excluded while wrists are limited. |
| Scripture | `src/data/verses.ts` | 42 King James Version verses (public domain) tagged by theme: strength, endurance, fight, soldier, discipline, rest, renewal, body, finish. A matching verse appears on Today, in each brief, on rest screens and in the debrief. It can be turned off in Profile. |
| Progression | `src/engine/progression.ts` | Double progression: increase by the smallest available weight step, hold, or reduce. Pain or near-max effort triggers a reduction. |
| 4-week plan | `src/engine/plan.ts` | Built from your training days. Day order is optimized so hard days are never consecutive. Main lifts stay fixed for the block, and week 4 is lighter. |
| Switch today | `src/ui/TodayScreen.tsx` | Switch swaps today's planned session for any other type. It can trade with the day later this week that already has that session, keeping the week balanced. It warns about back-to-back hard days. |
| Resume | `src/store/activeSession.ts` | The in-progress workout (step, timer, logged sets, swaps, debrief draft) is saved to this device after every change, every 5 s while running, and when the app is hidden or closed. On reopen, Today offers Resume or Discard. It resumes paused, so time away isn't counted. |
| Storage | `src/store/storage.ts` | Versioned JSON, migration, and validated import. |

## Safety defaults

These apply unless you change them in Profile:

- **Confirmed limitations.** Limitations are confirmed during onboarding, not assumed. Wrists, lower back, knees, feet and blood pressure start switched on as a conservative default, and each can be set to "Not now".
- **Default avoid list.** Push-ups, dips, hand planks and burpees start on it. Loaded wrist extension is excluded whenever wrists are active.
- **Locked movement types.** High-impact and ballistic kettlebell work are locked. To unlock them you need a completed screening, no conflicting active limitation, and an explicit acknowledgment.
- **Effort ceiling.** Effort never exceeds 8/10, and the app never prescribes all-out or max-rep efforts. Heart-rate formulas are not used as limits.
- **Breathing cues.** Every lift tells you to exhale on effort and not hold your breath. Isometric holds are capped at 20 s while hypertension is active.
- **Pain handling.** "Pain" on a set or "This hurts" stops the movement and offers pain-free alternatives or removal. The app never suggests pushing through pain.
- **Stop-symptoms list.** It is one tap away during every workout.

## What was verified

Run `npm test` to repeat these checks.

- **Filtering.** Defaults exclude push-ups, dips, jumps and swings. Equipment is respected. Today's discomfort turns cautions into exclusions. Neutral grips are enforced.
- **Generator matrix.** Every combination was tested: 6 styles × 6 focuses × 5 durations × home/gym. Every exercise passed the filter. Effort never exceeded 8. Warm-up and cool-down were present. Estimated duration stayed at or under target +10%.
- **Effort cap and clearance.** The cap applies when guidance is absent or expired. A requested "all-out" interval is clamped to 8. After a recent hard session, intervals are moderated unless you override.
- **Substitutions.** "Busy" switches equipment. "Hurts" excludes anything that loads that area. When nothing fits, the movement is removed with an explanation.
- **Timer.** Pause doesn't count time. Timed steps auto-advance without drift. Rep-based sets wait for "Set done". +30 s, skip and finish all work.
- **Plan.** 28 days, no consecutive hard days for 3–6 training days, anchors chosen.
- **Progression.** Increase, hold, reduce-after-pain, reduce-after-near-max, and hold-when-tired all behave as described above.
- **Storage.** Export/import round-trip works and invalid backups are rejected.
- **UI flows.** These ran in a test DOM:
  - Onboarding: screening gate and acknowledgment gate.
  - Build → brief → active workout: timers advance, a set is logged, the debrief saves to history.
  - Substitution sheet, plan editing, library exclusion reasons, body-weight log.
  - Typed-confirmation delete and the locked ballistic permission.

## Not implemented / known limits

- **No cloud sync.** Data stays on one browser. Clearing site data, private mode, or switching devices loses it, so export regularly.
- **No calorie, heart-rate or wearable data.** This is intentional.
- **Install and offline use only when self-hosted.** The claude.ai artifact viewer can't install the app or run its service worker, and it may block the export download. When that happens, use the export copy box.
- **Fonts come from Google Fonts.** They load on first visit, with system fallbacks offline. No health data is sent.
- **No bundled videos.** Each exercise has a **Watch an example** button that opens a YouTube search for its form demo (needs a connection).
- **Pounds only.** Machine stacks are assumed to step in 5 lb increments.
- **Missed plan days stay put.** They aren't automatically rescheduled. You can edit any day.
- **Audio may not fire when the screen is off.** Beeps and voice depend on the device. The timer stays accurate, and a screen wake lock is requested.
- **The screening is not a validated clinical instrument.** It's a paraphrased triage aid.

Mission Fit supports fitness habits. It does not diagnose, treat or prevent any condition.
