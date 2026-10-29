# Mission Fit: working rules for Claude

The owner uses this app on his Android phone as an installed PWA. GitHub Pages hosts it: `.github/workflows/deploy-pages.yml` tests, builds and publishes on every push to `main`. Changes he asks for should reach his phone quickly and safely.

The repo is public. Never commit personal details (the owner's weight, age, health conditions, name) into code, defaults, tests or docs.

## Change workflow

1. Work on a branch named `claude/<short-description>`. Never commit directly to `main`.
2. Make the change. Keep `src/engine/filter.ts` (`checkExercise`) as the only gatekeeper for exercise eligibility. New generators, pickers and substitutes must call it.
3. Add or update tests in `tests/` for any behavior change.
4. Run `npm test` and `npm run build`. Both must pass before you push.
5. Push the branch and open a pull request against `main`, with a short summary of the change written in plain language. There are no preview deploys, so describe what to check after merging.
6. Merging to `main` runs the workflow and publishes in about two minutes. If tests fail, nothing is published. The installed app picks up the update the next time it opens while online.

## Safety defaults that must not regress

- Effort is never above 8/10, and nothing is prescribed as all-out or max-rep.
- Push-ups, dips, hand planks and burpees are on the default avoid list. Loaded wrist extension is excluded while wrists are an active limitation.
- High-impact and ballistic kettlebell work are locked until screening plus an explicit opt-in.
- Lifts include breathing cues (exhale on effort, no breath-holding). Isometric holds are capped at 20 s while hypertension is active.
- "This hurts" never suggests pushing through pain. If nothing fits, the movement is removed with an explanation.
- No calorie, heart-rate or wearable estimates. No medical claims.

## Data compatibility

User data lives in `localStorage` on the phone. When changing stored shapes, add a migration in `src/store/storage.ts` so existing history and settings survive the update.

## Service worker

`public/sw.js` serves pages network-first so new deploys arrive. Bump `CACHE` only when the cached shell list changes.
