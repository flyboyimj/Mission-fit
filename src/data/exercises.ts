import type { Exercise } from '../types';

// Curated library. "limits" says what happens when a limitation is ACTIVE:
//   avoid   -> excluded from generation and substitution
//   caution -> allowed, with the modification shown
// Breathing guidance is deliberately conservative (no breath-holding) for blood-pressure safety.

const EXHALE = 'Exhale through the effort, inhale on the return. Keep breathing — never hold your breath or strain.';

export const EXERCISES: Exercise[] = [
  // ───────────── WARM-UP / MOBILITY ─────────────
  {
    id: 'march-in-place', name: 'March in Place', kind: 'warmup', phase: ['warmup', 'main'], equipOptions: [['none']],
    pattern: 'cardio', muscles: ['hips', 'calves'], impact: 'low', limits: { foot: 'caution' },
    modifications: { foot: 'Keep steps small and soft; stand on a mat in supportive shoes.' },
    cues: ['Tall posture, relaxed shoulders', 'Lift knees to a comfortable height', 'Swing arms naturally'],
    breathing: 'Breathe steadily through the nose if you can.', circuitOk: true,
  },
  {
    id: 'arm-circles', name: 'Arm Circles & Shoulder Rolls', kind: 'warmup', phase: ['warmup'], equipOptions: [['none']],
    pattern: 'mobility', muscles: ['shoulders'], impact: 'none', limits: { shoulder: 'caution' },
    modifications: { shoulder: 'Keep circles small and below shoulder height.' },
    cues: ['Start small, grow the circle gradually', 'Reverse direction halfway'], breathing: 'Relaxed, easy breathing.',
  },
  {
    id: 'hip-circles', name: 'Standing Hip Circles', kind: 'warmup', phase: ['warmup'], equipOptions: [['none']],
    pattern: 'mobility', muscles: ['hips'], impact: 'none', limits: {},
    cues: ['Hold a wall or rack for balance', 'Slow, controlled circles each direction'], breathing: 'Relaxed, easy breathing.',
  },
  {
    id: 'leg-swings', name: 'Supported Leg Swings', kind: 'warmup', phase: ['warmup'], equipOptions: [['none']],
    pattern: 'mobility', muscles: ['hips', 'hamstrings'], impact: 'none', limits: { lowBack: 'caution' },
    modifications: { lowBack: 'Small range; keep the torso still.' },
    cues: ['Hold support, swing front-to-back then side-to-side', 'Stay within a comfortable range'], breathing: 'Relaxed, easy breathing.',
  },
  {
    id: 'wall-slides', name: 'Wall Slides', kind: 'warmup', phase: ['warmup'], equipOptions: [['none']],
    pattern: 'mobility', muscles: ['shoulders', 'upper-back'], impact: 'none', limits: { shoulder: 'caution' },
    modifications: { shoulder: 'Slide only as high as feels comfortable.' },
    cues: ['Back and forearms against the wall', 'Slide up slowly, keep ribs down'], breathing: 'Exhale as you slide up.',
  },
  {
    id: 'standing-cat-camel', name: 'Standing Cat-Camel', kind: 'warmup', phase: ['warmup', 'cooldown'], equipOptions: [['none']],
    pattern: 'mobility', muscles: ['spine', 'upper-back'], impact: 'none', limits: {},
    cues: ['Hands on thighs (no wrist loading)', 'Gently round, then gently arch — small range'], breathing: 'Inhale to arch, exhale to round.',
  },
  {
    id: 'bodyweight-box-squat', name: 'Bodyweight Box Squat', kind: 'warmup', phase: ['warmup'], equipOptions: [['bench'], ['none']],
    pattern: 'squat', muscles: ['quads', 'glutes'], impact: 'none', limits: { knee: 'caution' },
    modifications: { knee: 'Use a higher box/chair; stop above any painful depth.' },
    cues: ['Sit back to a bench or chair', 'Knees track over toes', 'Stand tall without bouncing'], breathing: EXHALE,
  },
  {
    id: 'glute-bridge', name: 'Glute Bridge', kind: 'warmup', phase: ['warmup'], equipOptions: [['none']],
    pattern: 'hinge', muscles: ['glutes', 'hamstrings'], impact: 'none', limits: { knee: 'caution' },
    modifications: { knee: 'Move feet slightly farther from hips if knees complain.' },
    cues: ['Feet flat, hip-width', 'Press through heels, ribs down', 'Pause briefly at the top'],
    breathing: 'Exhale as hips rise, inhale as you lower.', circuitOk: true,
  },
  {
    id: 'hip-hinge-drill', name: 'Hip Hinge Drill', kind: 'warmup', phase: ['warmup'], equipOptions: [['none']],
    pattern: 'hinge', muscles: ['hamstrings', 'glutes'], impact: 'none', limits: { lowBack: 'caution' },
    modifications: { lowBack: 'Very small range; hands on hips; keep a neutral spine.' },
    cues: ['Soft knees, push hips back', 'Flat back, stop at a hamstring stretch'], breathing: 'Inhale back, exhale as you stand.',
  },
  {
    id: 'thoracic-open-book', name: 'Side-Lying Open Book', kind: 'mobility', phase: ['warmup', 'cooldown'], equipOptions: [['none']],
    pattern: 'mobility', muscles: ['upper-back', 'chest'], impact: 'none', limits: { shoulder: 'caution' },
    modifications: { shoulder: 'Only rotate as far as is comfortable; support the arm with a pillow.' },
    cues: ['Knees stacked and bent', 'Rotate the top arm open, follow with your eyes'], breathing: 'Exhale as you open.',
  },

  // ───────────── COOL-DOWN ─────────────
  {
    id: 'supported-hamstring-stretch', name: 'Lying Hamstring Stretch (towel)', kind: 'mobility', phase: ['cooldown'], equipOptions: [['none']],
    pattern: 'mobility', muscles: ['hamstrings'], impact: 'none', limits: {},
    cues: ['Lie on your back, towel around the foot', 'Gentle stretch, no pulling into pain'], breathing: 'Slow breaths; let each exhale relax the stretch.',
  },
  {
    id: 'hip-flexor-stretch', name: 'Half-Kneeling Hip Flexor Stretch', kind: 'mobility', phase: ['cooldown'], equipOptions: [['none']],
    pattern: 'mobility', muscles: ['hip-flexors'], impact: 'none', limits: { knee: 'caution' },
    modifications: { knee: 'Pad the down knee well, or do it standing in a split stance.' },
    cues: ['Tuck pelvis slightly', 'Shift forward gently'], breathing: 'Slow breaths; long exhales.',
  },
  {
    id: 'doorway-chest-stretch', name: 'Doorway Chest Stretch', kind: 'mobility', phase: ['cooldown'], equipOptions: [['none']],
    pattern: 'mobility', muscles: ['chest', 'shoulders'], impact: 'none', limits: { shoulder: 'caution', wrist: 'caution' },
    modifications: { shoulder: 'Keep elbow below shoulder height.', wrist: 'Rest the forearm, not the palm, on the frame.' },
    cues: ['Forearm on the frame', 'Step through gently'], breathing: 'Slow breaths.',
  },
  {
    id: 'calf-stretch', name: 'Wall Calf Stretch', kind: 'mobility', phase: ['cooldown'], equipOptions: [['none']],
    pattern: 'mobility', muscles: ['calves'], impact: 'none', limits: { foot: 'caution' },
    modifications: { foot: 'Mild stretch only; stop if the arch or heel hurts.' },
    cues: ['Back heel down', 'Lean gently into the wall'], breathing: 'Slow breaths.',
  },
  {
    id: 'breathing-reset', name: 'Breathing Reset (4-in, 6-out)', kind: 'mobility', phase: ['cooldown'], equipOptions: [['none']],
    pattern: 'mobility', muscles: [], impact: 'none', limits: {},
    cues: ['Sit or lie comfortably', 'Inhale 4 counts through the nose, exhale 6 counts'], breathing: 'Long, easy exhales help you recover.',
  },
  {
    id: 'easy-walk', name: 'Easy Walk / Easy Spin', kind: 'cardio', phase: ['cooldown'], equipOptions: [['none']],
    pattern: 'cardio', muscles: [], impact: 'low', limits: { foot: 'caution' },
    modifications: { foot: 'Use the bike instead of walking if your feet are sore.' },
    cues: ['Bring your breathing back down', 'Conversational pace'], breathing: 'Easy breathing.',
  },

  // ───────────── LOWER BODY ─────────────
  {
    id: 'goblet-squat', name: 'Goblet Squat', kind: 'strength', equipOptions: [['dumbbell'], ['kettlebell']], pattern: 'squat',
    muscles: ['quads', 'glutes', 'core'], impact: 'none', main: true, circuitOk: true, grip: 'neutral',
    limits: { knee: 'caution', lowBack: 'caution', wrist: 'caution' },
    modifications: { knee: 'Squat to a box or bench; use a pain-free depth.', lowBack: 'Lighter load, stay tall, reduce depth.', wrist: 'Hold the bell by the horns or cup the dumbbell end; wrists neutral.' },
    cues: ['Weight at chest, elbows down', 'Sit between your hips', 'Knees track over toes', 'Drive up through mid-foot'],
    breathing: EXHALE,
  },
  {
    id: 'box-squat-db', name: 'Goblet Box Squat', kind: 'strength', equipOptions: [['dumbbell', 'bench'], ['kettlebell', 'bench']], pattern: 'squat',
    muscles: ['quads', 'glutes'], impact: 'none', main: true, circuitOk: true, grip: 'neutral',
    limits: { knee: 'caution', lowBack: 'caution' },
    modifications: { knee: 'Raise the box height until pain-free.', lowBack: 'Touch the box lightly — do not relax or rock.' },
    cues: ['Sit back to touch the bench', 'Stay braced, stand without rocking'], breathing: EXHALE,
    tags: ['reduced-range'],
  },
  {
    id: 'leg-press', name: 'Leg Press', kind: 'strength', equipOptions: [['machine-leg-press']], pattern: 'squat',
    muscles: ['quads', 'glutes'], impact: 'none', main: true, limits: { knee: 'caution', lowBack: 'caution', hypertension: 'caution' },
    modifications: { knee: 'Limit depth to a pain-free range; feet a little higher on the platform.', lowBack: 'Stop before your hips curl off the pad.', hypertension: 'Moderate loads, smooth reps, breathe every rep — no grinding.' },
    cues: ['Back flat against the pad', 'Lower under control', 'Do not lock knees hard at the top'], breathing: EXHALE,
  },
  {
    id: 'leg-extension', name: 'Leg Extension', kind: 'strength', equipOptions: [['machine-leg-extension']], pattern: 'squat',
    muscles: ['quads'], impact: 'none', limits: { knee: 'caution' },
    modifications: { knee: 'Light load and partial range (stop short of full lockout).' },
    cues: ['Pad above the ankle', 'Lift smoothly, lower in 2–3 seconds'], breathing: EXHALE, circuitOk: true,
  },
  {
    id: 'db-rdl', name: 'Romanian Deadlift', kind: 'strength', equipOptions: [['dumbbell'], ['kettlebell']], pattern: 'hinge',
    muscles: ['hamstrings', 'glutes', 'upper-back'], impact: 'none', main: true, grip: 'neutral',
    limits: { lowBack: 'caution', wrist: 'caution' },
    modifications: { lowBack: 'Light load, lower only to knee height, keep a flat back.', wrist: 'Neutral grip; use straps or lighter weight if grip hurts.' },
    cues: ['Soft knees, push hips back', 'Weights slide along thighs', 'Stand by squeezing glutes — no leaning back'],
    breathing: EXHALE,
  },
  {
    id: 'kb-deadlift', name: 'Kettlebell Deadlift', kind: 'strength', equipOptions: [['kettlebell'], ['dumbbell']], pattern: 'hinge',
    muscles: ['glutes', 'hamstrings', 'quads'], impact: 'none', circuitOk: true, grip: 'neutral',
    limits: { lowBack: 'caution' }, modifications: { lowBack: 'Elevate the bell on a step or plates to shorten the range.' },
    cues: ['Bell between mid-feet', 'Hips back, chest proud', 'Push the floor away'], breathing: EXHALE,
  },
  {
    id: 'db-hip-thrust', name: 'Dumbbell Hip Thrust', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'hinge',
    muscles: ['glutes', 'hamstrings'], impact: 'none', main: true, limits: { knee: 'caution' },
    modifications: { knee: 'Adjust foot position until knees feel comfortable.' },
    cues: ['Upper back on bench edge', 'Chin tucked, ribs down', 'Drive through heels to full hip extension'], breathing: EXHALE,
  },
  {
    id: 'cable-pull-through', name: 'Cable Pull-Through', kind: 'strength', equipOptions: [['cable']], pattern: 'hinge',
    muscles: ['glutes', 'hamstrings'], impact: 'none', circuitOk: true, limits: { lowBack: 'caution' },
    modifications: { lowBack: 'Light load, short range.' },
    cues: ['Face away from the stack, rope between legs', 'Hinge back, then drive hips forward'], breathing: EXHALE,
  },
  {
    id: 'leg-curl', name: 'Leg Curl Machine', kind: 'strength', equipOptions: [['machine-leg-curl']], pattern: 'hinge',
    muscles: ['hamstrings'], impact: 'none', circuitOk: true, limits: { knee: 'caution' },
    modifications: { knee: 'Light load, controlled range.' },
    cues: ['Knee aligned with the machine pivot', 'Curl smoothly, lower slowly'], breathing: EXHALE,
  },
  {
    id: 'hip-abduction', name: 'Hip Abduction Machine', kind: 'strength', equipOptions: [['machine-hip-abduction']], pattern: 'hinge',
    muscles: ['glutes'], impact: 'none', circuitOk: true, limits: {},
    cues: ['Sit tall', 'Press knees out under control'], breathing: EXHALE,
  },
  {
    id: 'supported-split-squat', name: 'Supported Split Squat', kind: 'strength', equipOptions: [['dumbbell'], ['kettlebell'], ['none']], pattern: 'lunge',
    muscles: ['quads', 'glutes'], impact: 'none', unilateral: true, grip: 'neutral', limits: { knee: 'caution', foot: 'caution', lowBack: 'caution' },
    modifications: { knee: 'Short range — lower only partway.', foot: 'Shorter stance; hold support with one hand.', lowBack: 'Bodyweight or a single light dumbbell.' },
    cues: ['Hold a rack or wall for balance', 'Lower straight down', 'Front heel stays planted'], breathing: EXHALE,
  },
  {
    id: 'reverse-lunge', name: 'Dumbbell Reverse Lunge', kind: 'strength', equipOptions: [['dumbbell'], ['kettlebell'], ['none']], pattern: 'lunge',
    muscles: ['quads', 'glutes'], impact: 'none', unilateral: true, circuitOk: true, grip: 'neutral', limits: { knee: 'caution', foot: 'caution' },
    modifications: { knee: 'Shorter step and partial depth; switch to supported split squat if needed.', foot: 'Hold support; slower steps.' },
    cues: ['Step back softly', 'Front knee over mid-foot', 'Push through the front heel to return'], breathing: EXHALE,
  },
  {
    id: 'walking-lunge', name: 'Walking Lunge', kind: 'strength', equipOptions: [['dumbbell'], ['none']], pattern: 'lunge',
    muscles: ['quads', 'glutes'], impact: 'low', unilateral: true, limits: { knee: 'avoid', foot: 'avoid' },
    cues: ['Long, controlled steps', 'Upright torso'], breathing: EXHALE,
  },
  {
    id: 'step-up', name: 'Step-Up (low box)', kind: 'strength', equipOptions: [['dumbbell', 'bench'], ['bench']], pattern: 'lunge',
    muscles: ['quads', 'glutes'], impact: 'low', unilateral: true, circuitOk: true, grip: 'neutral', limits: { knee: 'caution', foot: 'caution' },
    modifications: { knee: 'Use a low step (6–12 in) and hold support.', foot: 'Low step; place the whole foot on the box.' },
    cues: ['Whole foot on the box', 'Drive through the top leg — minimal push from the bottom foot', 'Step down slowly'], breathing: EXHALE,
  },
  {
    id: 'calf-raise', name: 'Supported Dumbbell Calf Raise', kind: 'strength', equipOptions: [['dumbbell'], ['kettlebell'], ['none']], pattern: 'calves',
    muscles: ['calves'], impact: 'none', circuitOk: true, limits: { foot: 'caution' },
    modifications: { foot: 'Bodyweight only, small range, stop if the arch or heel hurts.' },
    cues: ['Hold support', 'Rise slowly, lower slowly'], breathing: 'Steady breathing.',
  },
  {
    id: 'kb-swing', name: 'Kettlebell Swing', kind: 'strength', equipOptions: [['kettlebell']], pattern: 'hinge',
    muscles: ['glutes', 'hamstrings', 'core'], impact: 'none', ballistic: true, limits: { lowBack: 'avoid', wrist: 'caution' },
    modifications: { wrist: 'Loose hook grip; stop if wrists ache.' },
    cues: ['Hike the bell back', 'Snap hips — arms are ropes', 'Bell floats to chest height'], breathing: 'Sharp exhale at the top of each swing.',
    tags: ['ballistic'],
  },
  {
    id: 'kb-clean', name: 'Kettlebell Clean', kind: 'strength', equipOptions: [['kettlebell']], pattern: 'hinge',
    muscles: ['glutes', 'upper-back', 'forearms'], impact: 'none', ballistic: true, unilateral: true, limits: { wrist: 'avoid', lowBack: 'caution' },
    cues: ['Zip the bell close to the body', 'Rotate the hand around the handle'], breathing: 'Exhale as the bell lands in the rack.',
    tags: ['ballistic'],
  },
  {
    id: 'jump-squat', name: 'Jump Squat', kind: 'strength', equipOptions: [['none']], pattern: 'squat',
    muscles: ['quads', 'glutes', 'calves'], impact: 'high', limits: { knee: 'avoid', foot: 'avoid', lowBack: 'caution' },
    cues: ['Land softly through the whole foot'], breathing: 'Exhale on the jump.', tags: ['plyometric'],
  },

  // ───────────── UPPER PUSH ─────────────
  {
    id: 'db-bench-neutral', name: 'Flat Dumbbell Bench Press (neutral grip)', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'h-push',
    muscles: ['chest', 'triceps', 'shoulders'], impact: 'none', main: true, grip: 'neutral', limits: { wrist: 'caution', shoulder: 'caution', hypertension: 'caution' },
    modifications: { wrist: 'Palms facing each other; stack wrists directly over elbows.', shoulder: 'Lower only to chest level or slightly above.', hypertension: 'Smooth reps, breathe out every press, avoid failure.' },
    cues: ['Feet planted, shoulder blades back', 'Lower to chest level with control', 'Press up and slightly in'], breathing: EXHALE,
  },
  {
    id: 'db-floor-press', name: 'Neutral-Grip Floor Press', kind: 'strength', equipOptions: [['dumbbell']], pattern: 'h-push',
    muscles: ['chest', 'triceps'], impact: 'none', main: true, grip: 'neutral', circuitOk: true, limits: { wrist: 'caution' },
    modifications: { wrist: 'Palms facing; wrists stacked over elbows.' },
    cues: ['Upper arms touch the floor lightly — built-in reduced range', 'Press without bouncing'], breathing: EXHALE,
    tags: ['reduced-range'],
  },
  {
    id: 'db-incline-press', name: 'Neutral-Grip Incline Press', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'h-push',
    muscles: ['chest', 'shoulders', 'triceps'], impact: 'none', grip: 'neutral', limits: { wrist: 'caution', shoulder: 'caution' },
    modifications: { wrist: 'Palms facing, wrists stacked.', shoulder: 'Low incline (15–30°), partial depth.' },
    cues: ['Low incline', 'Lower with control', 'Press up and in'], breathing: EXHALE,
  },
  {
    id: 'machine-chest-press', name: 'Machine Chest Press', kind: 'strength', equipOptions: [['machine-chest-press']], pattern: 'h-push',
    muscles: ['chest', 'triceps', 'shoulders'], impact: 'none', main: true, circuitOk: true, grip: 'neutral', limits: { wrist: 'caution', hypertension: 'caution' },
    modifications: { wrist: 'Use the vertical (neutral) handles if available.', hypertension: 'Moderate load; breathe out each press.' },
    cues: ['Handles at mid-chest', 'Press smoothly, do not lock hard'], breathing: EXHALE,
  },
  {
    id: 'cable-chest-press', name: 'Standing Cable Chest Press', kind: 'strength', equipOptions: [['cable']], pattern: 'h-push',
    muscles: ['chest', 'triceps', 'core'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { wrist: 'caution' },
    modifications: { wrist: 'Neutral handle; keep the wrist straight.' },
    cues: ['Staggered stance', 'Press forward, ribs down'], breathing: EXHALE,
  },
  {
    id: 'push-up', name: 'Push-Up', kind: 'strength', equipOptions: [['none']], pattern: 'h-push',
    muscles: ['chest', 'triceps'], impact: 'none', limits: { wrist: 'avoid', shoulder: 'caution', hypertension: 'caution' },
    cues: ['Straight line head to heels'], breathing: EXHALE, tags: ['loaded-wrist-extension'],
  },
  {
    id: 'bench-dip', name: 'Bench Dip', kind: 'strength', equipOptions: [['bench']], pattern: 'h-push',
    muscles: ['triceps', 'chest'], impact: 'none', limits: { wrist: 'avoid', shoulder: 'avoid' },
    cues: ['Shoulders down'], breathing: EXHALE, tags: ['loaded-wrist-extension'],
  },
  {
    id: 'seated-db-press', name: 'Seated Neutral-Grip Shoulder Press', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'v-push',
    muscles: ['shoulders', 'triceps'], impact: 'none', main: true, grip: 'neutral', limits: { shoulder: 'caution', hypertension: 'caution', wrist: 'caution' },
    modifications: { shoulder: 'Press slightly in front of the head; partial range.', hypertension: 'Moderate load, breathe out each rep, avoid grinding overhead.', wrist: 'Palms facing, wrists stacked.' },
    cues: ['Back supported on an upright bench', 'Press up, not back', 'Ribs down'], breathing: EXHALE,
  },
  {
    id: 'machine-shoulder-press', name: 'Machine Shoulder Press', kind: 'strength', equipOptions: [['machine-shoulder-press']], pattern: 'v-push',
    muscles: ['shoulders', 'triceps'], impact: 'none', main: true, grip: 'neutral', limits: { shoulder: 'caution', hypertension: 'caution' },
    modifications: { shoulder: 'Start the handles at a comfortable height; partial range.', hypertension: 'Moderate load; breathe out each press.' },
    cues: ['Back against the pad', 'Smooth press, controlled return'], breathing: EXHALE,
  },
  {
    id: 'lateral-raise', name: 'Lateral Raise', kind: 'strength', equipOptions: [['dumbbell'], ['cable']], pattern: 'shoulder-iso',
    muscles: ['shoulders'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { shoulder: 'caution' },
    modifications: { shoulder: 'Raise only to about 60° and use light weight.' },
    cues: ['Slight bend in elbows', 'Lead with elbows to shoulder height', 'Lower slowly'], breathing: EXHALE,
  },
  {
    id: 'cable-pushdown', name: 'Rope Triceps Pushdown', kind: 'strength', equipOptions: [['cable']], pattern: 'arms',
    muscles: ['triceps'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { wrist: 'caution' },
    modifications: { wrist: 'Rope attachment (neutral); keep wrists straight.' },
    cues: ['Elbows pinned to sides', 'Spread the rope at the bottom'], breathing: EXHALE,
  },
  {
    id: 'db-kickback', name: 'Supported Triceps Kickback', kind: 'strength', equipOptions: [['dumbbell', 'bench'], ['dumbbell']], pattern: 'arms',
    muscles: ['triceps'], impact: 'none', unilateral: true, grip: 'neutral', limits: { wrist: 'caution' },
    modifications: { wrist: 'Light weight, neutral grip.' },
    cues: ['Hand and knee on bench for support', 'Upper arm still, extend the elbow'], breathing: EXHALE,
  },

  // ───────────── UPPER PULL ─────────────
  {
    id: 'lat-pulldown', name: 'Neutral-Grip Lat Pulldown', kind: 'strength', equipOptions: [['machine-lat-pulldown'], ['cable']], pattern: 'v-pull',
    muscles: ['lats', 'biceps', 'upper-back'], impact: 'none', main: true, circuitOk: true, grip: 'neutral', limits: { shoulder: 'caution' },
    modifications: { shoulder: 'Pull to upper chest only; avoid behind-the-neck.' },
    cues: ['Chest up, slight lean back', 'Pull elbows down toward your back pockets', 'Control the return'], breathing: EXHALE,
  },
  {
    id: 'half-kneel-cable-pulldown', name: 'Half-Kneeling Single-Arm Pulldown', kind: 'strength', equipOptions: [['cable']], pattern: 'v-pull',
    muscles: ['lats', 'core'], impact: 'none', unilateral: true, grip: 'neutral', limits: { knee: 'caution' },
    modifications: { knee: 'Pad under the down knee, or perform seated.' },
    cues: ['Tall torso', 'Pull the elbow to your ribs'], breathing: EXHALE,
  },
  {
    id: 'seated-cable-row', name: 'Seated Cable Row (neutral)', kind: 'strength', equipOptions: [['machine-seated-row'], ['cable']], pattern: 'h-pull',
    muscles: ['upper-back', 'lats', 'biceps'], impact: 'none', main: true, circuitOk: true, grip: 'neutral', limits: { lowBack: 'caution' },
    modifications: { lowBack: 'Use a chest pad if available; stay tall, no rocking.' },
    cues: ['Sit tall', 'Pull handle to lower ribs', 'Squeeze shoulder blades, return slowly'], breathing: EXHALE,
  },
  {
    id: 'chest-supported-row', name: 'Chest-Supported Dumbbell Row', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'h-pull',
    muscles: ['upper-back', 'lats', 'rear-delts'], impact: 'none', main: true, grip: 'neutral', limits: {},
    cues: ['Chest on an incline bench — your back is fully supported', 'Row elbows toward hips', 'Pause, lower slowly'], breathing: EXHALE,
    tags: ['supported'],
  },
  {
    id: 'supported-one-arm-row', name: 'Bench-Supported One-Arm Row', kind: 'strength', equipOptions: [['dumbbell', 'bench'], ['kettlebell', 'bench']], pattern: 'h-pull',
    muscles: ['lats', 'upper-back'], impact: 'none', unilateral: true, circuitOk: true, grip: 'neutral', limits: { wrist: 'caution', lowBack: 'caution' },
    modifications: { wrist: 'Support on your forearm or fist, not a bent-back wrist.', lowBack: 'Keep the spine neutral; lighter weight.' },
    cues: ['Knee and hand on the bench', 'Row to the hip'], breathing: EXHALE,
  },
  {
    id: 'bent-over-db-row', name: 'Bent-Over Dumbbell Row (unsupported)', kind: 'strength', equipOptions: [['dumbbell']], pattern: 'h-pull',
    muscles: ['upper-back', 'lats'], impact: 'none', grip: 'neutral', limits: { lowBack: 'avoid' },
    cues: ['Hinge, flat back', 'Row to hips'], breathing: EXHALE,
  },
  {
    id: 'face-pull', name: 'Cable Face Pull', kind: 'strength', equipOptions: [['cable']], pattern: 'h-pull',
    muscles: ['rear-delts', 'upper-back'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { shoulder: 'caution' },
    modifications: { shoulder: 'Light load; stop the pull at a comfortable point.' },
    cues: ['Rope at face height', 'Pull toward the eyes, elbows high'], breathing: EXHALE,
  },
  {
    id: 'rear-delt-machine', name: 'Rear Delt Machine', kind: 'strength', equipOptions: [['machine-rear-delt']], pattern: 'h-pull',
    muscles: ['rear-delts', 'upper-back'], impact: 'none', circuitOk: true, grip: 'neutral', limits: {},
    cues: ['Chest on pad', 'Sweep arms back, slow return'], breathing: EXHALE,
  },
  {
    id: 'hammer-curl', name: 'Hammer Curl', kind: 'strength', equipOptions: [['dumbbell']], pattern: 'arms',
    muscles: ['biceps', 'forearms'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { wrist: 'caution' },
    modifications: { wrist: 'Lighter load; keep wrists straight.' },
    cues: ['Elbows by your sides', 'No swinging'], breathing: EXHALE,
  },
  {
    id: 'cable-rope-curl', name: 'Cable Rope Curl', kind: 'strength', equipOptions: [['cable']], pattern: 'arms',
    muscles: ['biceps', 'forearms'], impact: 'none', circuitOk: true, grip: 'neutral', limits: {},
    cues: ['Elbows still', 'Squeeze at the top, lower slowly'], breathing: EXHALE,
  },
  {
    id: 'db-curl', name: 'Supinated Dumbbell Curl', kind: 'strength', equipOptions: [['dumbbell']], pattern: 'arms',
    muscles: ['biceps'], impact: 'none', grip: 'supinated', limits: { wrist: 'caution' },
    modifications: { wrist: 'Switch to hammer curls if the wrist complains.' },
    cues: ['Elbows by sides', 'Turn palms up as you curl'], breathing: EXHALE,
  },

  // ───────────── CORE ─────────────
  {
    id: 'dead-bug', name: 'Dead Bug', kind: 'core', equipOptions: [['none']], pattern: 'core',
    muscles: ['core'], impact: 'none', circuitOk: true, limits: { lowBack: 'caution' },
    modifications: { lowBack: 'Move only the legs, or reduce the reach.' },
    cues: ['Low back gently against the floor', 'Reach opposite arm and leg slowly'], breathing: 'Exhale fully as you reach; keep breathing.',
  },
  {
    id: 'bird-dog', name: 'Bird Dog (fists or forearms)', kind: 'core', equipOptions: [['none']], pattern: 'core',
    muscles: ['core', 'glutes'], impact: 'none', circuitOk: true, limits: { wrist: 'caution', knee: 'caution' },
    modifications: { wrist: 'Rest on fists or forearms so wrists stay straight.', knee: 'Pad under the knees.' },
    cues: ['Hips level', 'Reach long, pause, return slowly'], breathing: 'Exhale as you reach.',
  },
  {
    id: 'forearm-plank', name: 'Forearm Plank (short holds)', kind: 'core', equipOptions: [['none']], pattern: 'core',
    muscles: ['core', 'shoulders'], impact: 'none', circuitOk: true, limits: { hypertension: 'caution', lowBack: 'caution', shoulder: 'caution' },
    modifications: { hypertension: 'Hold 15–20 s max and keep breathing — no breath-holding.', lowBack: 'Knees down.', shoulder: 'Incline version with forearms on a bench.' },
    cues: ['On forearms (no wrist load)', 'Squeeze glutes, ribs down'], breathing: 'Breathe slowly throughout — never hold your breath.',
  },
  {
    id: 'hand-plank', name: 'High Plank (on hands)', kind: 'core', equipOptions: [['none']], pattern: 'core',
    muscles: ['core', 'shoulders'], impact: 'none', limits: { wrist: 'avoid', hypertension: 'caution' },
    cues: ['Straight line'], breathing: 'Keep breathing.', tags: ['loaded-wrist-extension'],
  },
  {
    id: 'side-plank-knees', name: 'Side Plank from Knees', kind: 'core', equipOptions: [['none']], pattern: 'core',
    muscles: ['obliques', 'core'], impact: 'none', limits: { shoulder: 'caution', hypertension: 'caution', knee: 'caution' },
    modifications: { shoulder: 'Shorter holds or use the Pallof press instead.', hypertension: '15–20 s holds, keep breathing.', knee: 'Pad under the knee.' },
    cues: ['Elbow under shoulder', 'Hips lifted, body in line'], breathing: 'Breathe slowly throughout.',
  },
  {
    id: 'pallof-press', name: 'Pallof Press', kind: 'core', equipOptions: [['cable']], pattern: 'core',
    muscles: ['core', 'obliques'], impact: 'none', circuitOk: true, limits: {},
    cues: ['Stand side-on to the cable', 'Press out, resist rotation, return'], breathing: 'Exhale as you press out.',
  },
  {
    id: 'cable-chop', name: 'High-to-Low Cable Chop', kind: 'core', equipOptions: [['cable']], pattern: 'core',
    muscles: ['obliques', 'core'], impact: 'none', circuitOk: true, limits: { lowBack: 'caution' },
    modifications: { lowBack: 'Short range; rotate through hips and upper back, not the low back.' },
    cues: ['Pivot the back foot', 'Arms long, controlled'], breathing: 'Exhale through the chop.',
  },
  {
    id: 'sit-up', name: 'Sit-Up', kind: 'core', equipOptions: [['none']], pattern: 'core',
    muscles: ['core'], impact: 'none', limits: { lowBack: 'avoid', hypertension: 'caution' },
    cues: ['Controlled'], breathing: 'Exhale up.',
  },
  {
    id: 'russian-twist', name: 'Russian Twist', kind: 'core', equipOptions: [['none'], ['dumbbell']], pattern: 'core',
    muscles: ['obliques'], impact: 'none', limits: { lowBack: 'avoid' },
    cues: ['Controlled'], breathing: 'Keep breathing.',
  },

  // ───────────── CARRIES ─────────────
  {
    id: 'farmer-carry', name: "Farmer's Carry", kind: 'carry', equipOptions: [['dumbbell'], ['kettlebell']], pattern: 'carry',
    muscles: ['forearms', 'upper-back', 'core', 'glutes'], impact: 'low', circuitOk: true, grip: 'neutral',
    limits: { wrist: 'caution', foot: 'caution', lowBack: 'caution', hypertension: 'caution' },
    modifications: { wrist: 'Neutral handles, moderate weight; set down if wrists ache.', foot: 'Short distances or a stationary loaded march.', lowBack: 'Moderate weight, tall posture.', hypertension: 'Moderate weight — keep breathing as you walk.' },
    cues: ['Stand tall, shoulders down', 'Short, quiet steps', 'Set down with a hip hinge'], breathing: 'Steady breathing with each step — no breath-holding.',
  },
  {
    id: 'suitcase-carry', name: 'Suitcase Carry (one side)', kind: 'carry', equipOptions: [['dumbbell'], ['kettlebell']], pattern: 'carry',
    muscles: ['obliques', 'forearms', 'core'], impact: 'low', unilateral: true, circuitOk: true, grip: 'neutral',
    limits: { wrist: 'caution', foot: 'caution', lowBack: 'caution' },
    modifications: { wrist: 'Lighter weight, neutral grip.', foot: 'Short distances or march in place.', lowBack: 'Light load; do not lean.' },
    cues: ['Do not lean toward the weight', 'Switch hands halfway'], breathing: 'Steady breathing with each step.',
  },
  {
    id: 'loaded-march', name: 'Stationary Loaded March', kind: 'carry', equipOptions: [['dumbbell'], ['kettlebell']], pattern: 'carry',
    muscles: ['core', 'hips', 'forearms'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { wrist: 'caution' },
    modifications: { wrist: 'Light weight; neutral grip.' },
    cues: ['Hold weights at sides', 'March slowly in place, tall posture'], breathing: 'Steady breathing.', tags: ['low-impact-carry'],
  },

  // ───────────── ADDED WEIGHTED MOVEMENTS ─────────────
  {
    id: 'db-glute-bridge', name: 'Dumbbell Glute Bridge', kind: 'strength', equipOptions: [['dumbbell'], ['kettlebell']], pattern: 'hinge',
    muscles: ['glutes', 'hamstrings'], impact: 'none', circuitOk: true, limits: { knee: 'caution' },
    modifications: { knee: 'Move feet a little farther from your hips.' },
    cues: ['Weight across the hip crease (pad it with a towel)', 'Press through heels, ribs down', 'Pause at the top'], breathing: EXHALE,
  },
  {
    id: 'sumo-deadlift', name: 'Sumo Kettlebell Deadlift', kind: 'strength', equipOptions: [['kettlebell'], ['dumbbell']], pattern: 'hinge',
    muscles: ['glutes', 'quads', 'hamstrings', 'adductors'], impact: 'none', circuitOk: true, grip: 'neutral',
    limits: { lowBack: 'caution', knee: 'caution' },
    modifications: { lowBack: 'Elevate the bell on plates; keep a flat back.', knee: 'Narrower stance, knees track over toes.' },
    cues: ['Wide stance, toes slightly out', 'Bell under hips, chest tall', 'Push the floor apart as you stand'], breathing: EXHALE,
  },
  {
    id: 'supported-sl-rdl', name: 'Supported Single-Leg RDL', kind: 'strength', equipOptions: [['dumbbell'], ['kettlebell']], pattern: 'hinge',
    muscles: ['hamstrings', 'glutes'], impact: 'none', unilateral: true, grip: 'neutral', limits: { lowBack: 'caution', foot: 'caution' },
    modifications: { lowBack: 'Light weight, small range.', foot: 'Hold a rack firmly; keep the back toe on the floor (kickstand).' },
    cues: ['One hand on a rack, weight in the other', 'Hinge on the standing leg, hips square', 'Stand tall by squeezing the glute'], breathing: EXHALE,
  },
  {
    id: 'cable-kickback', name: 'Cable Glute Kickback', kind: 'strength', equipOptions: [['cable']], pattern: 'hinge',
    muscles: ['glutes'], impact: 'none', unilateral: true, circuitOk: true, limits: { lowBack: 'caution' },
    modifications: { lowBack: 'Small range — stop before your low back arches.' },
    cues: ['Ankle strap, hold the frame', 'Kick back from the hip, not the low back'], breathing: EXHALE,
  },
  {
    id: 'leg-press-calf', name: 'Leg Press Calf Raise', kind: 'strength', equipOptions: [['machine-leg-press']], pattern: 'calves',
    muscles: ['calves'], impact: 'none', limits: { foot: 'caution' },
    modifications: { foot: 'Light load, partial range; stop if the arch or heel hurts.' },
    cues: ['Balls of feet on the platform edge', 'Knees soft, never locked', 'Slow up, slow down'], breathing: 'Steady breathing.',
  },
  {
    id: 'db-pullover', name: 'Dumbbell Pullover (light)', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'v-pull',
    muscles: ['lats', 'chest'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { shoulder: 'caution', wrist: 'caution' },
    modifications: { shoulder: 'Lower only until arms are level with your head.', wrist: 'Cup the dumbbell end with both palms; light weight.' },
    cues: ['Lie on the bench, one dumbbell over chest', 'Arc it back with soft elbows', 'Pull it back over the chest using your lats'], breathing: EXHALE,
  },
  {
    id: 'reverse-fly', name: 'Chest-Supported Reverse Fly', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'h-pull',
    muscles: ['rear-delts', 'upper-back'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { shoulder: 'caution' },
    modifications: { shoulder: 'Light weight; raise only to shoulder height.' },
    cues: ['Chest on an incline bench', 'Sweep arms out, squeeze shoulder blades', 'Lower slowly'], breathing: EXHALE, tags: ['supported'],
  },
  {
    id: 'cable-one-arm-row', name: 'Single-Arm Cable Row', kind: 'strength', equipOptions: [['cable']], pattern: 'h-pull',
    muscles: ['lats', 'upper-back'], impact: 'none', unilateral: true, circuitOk: true, grip: 'neutral', limits: { lowBack: 'caution' },
    modifications: { lowBack: 'Staggered stance, stay tall — no twisting.' },
    cues: ['Handle at chest height', 'Row the elbow to your hip', 'Control the return'], breathing: EXHALE,
  },
  {
    id: 'db-triceps-ext', name: 'Neutral-Grip Lying Triceps Extension', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'arms',
    muscles: ['triceps'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { wrist: 'caution', shoulder: 'caution' },
    modifications: { wrist: 'Light weight, palms facing; keep wrists straight.', shoulder: 'Keep upper arms vertical.' },
    cues: ['Upper arms point at the ceiling', 'Bend at the elbows only', 'Extend smoothly'], breathing: EXHALE,
  },
  {
    id: 'cable-overhead-ext', name: 'Cable Overhead Triceps Extension', kind: 'strength', equipOptions: [['cable']], pattern: 'arms',
    muscles: ['triceps'], impact: 'none', grip: 'neutral', limits: { shoulder: 'caution', lowBack: 'caution' },
    modifications: { shoulder: 'Use pushdowns instead if overhead is uncomfortable.', lowBack: 'Staggered stance, ribs down.' },
    cues: ['Rope behind head, face away from the stack', 'Elbows point forward', 'Extend and spread the rope'], breathing: EXHALE,
  },
  {
    id: 'seated-hammer-curl', name: 'Seated Alternating Hammer Curl', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'arms',
    muscles: ['biceps', 'forearms'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { wrist: 'caution' },
    modifications: { wrist: 'Lighter load; keep wrists straight.' },
    cues: ['Back against an upright bench', 'One arm at a time, no swinging'], breathing: EXHALE,
  },
  {
    id: 'weighted-dead-bug', name: 'Weighted Dead Bug', kind: 'core', equipOptions: [['dumbbell'], ['kettlebell']], pattern: 'core',
    muscles: ['core'], impact: 'none', circuitOk: true, limits: { lowBack: 'caution', shoulder: 'caution' },
    modifications: { lowBack: 'Light weight; move only the legs if your back lifts.', shoulder: 'Hold the weight over the chest, not overhead.' },
    cues: ['Hold a light weight over your chest', 'Low back gently on the floor', 'Lower opposite leg slowly'], breathing: 'Exhale fully as the leg lowers; keep breathing.',
  },
  {
    id: 'suitcase-hold', name: 'Suitcase Hold (one side)', kind: 'core', equipOptions: [['dumbbell'], ['kettlebell']], pattern: 'core',
    muscles: ['obliques', 'core', 'forearms'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { wrist: 'caution', hypertension: 'caution' },
    modifications: { wrist: 'Moderate weight; set it down if the wrist aches.', hypertension: 'Keep breathing — short holds.' },
    cues: ['Stand tall with one weight at your side', "Don't lean toward it", 'Switch sides halfway'], breathing: 'Breathe slowly the whole time.',
  },
  {
    id: 'kb-goblet-march', name: 'Goblet Hold March', kind: 'carry', equipOptions: [['kettlebell'], ['dumbbell']], pattern: 'carry',
    muscles: ['core', 'hips', 'upper-back'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { wrist: 'caution' },
    modifications: { wrist: 'Hold the bell by the horns or cup the dumbbell end.' },
    cues: ['Weight at chest, elbows down', 'March slowly in place, tall posture'], breathing: 'Steady breathing.', tags: ['low-impact-carry'],
  },

  {
    id: 'goblet-press-out', name: 'Goblet Press-Out', kind: 'core', equipOptions: [['kettlebell'], ['dumbbell']], pattern: 'core',
    muscles: ['core', 'shoulders'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { lowBack: 'caution', wrist: 'caution' },
    modifications: { lowBack: 'Light weight, ribs down, glutes squeezed.', wrist: 'Hold the bell by the horns; wrists straight.' },
    cues: ['Stand tall, weight at chest', 'Press it straight out, pause 2 s, bring it back', "Don't let your back arch"], breathing: 'Exhale as you press out.',
  },
  {
    id: 'db-side-bend', name: 'Dumbbell Side Bend (small range)', kind: 'core', equipOptions: [['dumbbell'], ['kettlebell']], pattern: 'core',
    muscles: ['obliques'], impact: 'none', unilateral: true, grip: 'neutral', limits: { lowBack: 'caution' },
    modifications: { lowBack: 'Light weight, a few inches of range only.' },
    cues: ['Weight in one hand, other hand on hip', 'Bend sideways a few inches, return tall'], breathing: 'Exhale as you return to tall.',
  },
  {
    id: 'kb-halo', name: 'Kettlebell Halo (light)', kind: 'core', equipOptions: [['kettlebell'], ['dumbbell']], pattern: 'core',
    muscles: ['core', 'shoulders', 'upper-back'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { shoulder: 'avoid', wrist: 'caution' },
    modifications: { wrist: 'Hold by the horns; very light.' },
    cues: ['Circle the bell close around your head', 'Ribs down, glutes tight', 'Switch direction each set'], breathing: 'Slow, steady breathing.',
  },
  {
    id: 'shadow-defense', name: 'Shadow Boxing — Defense & Footwork', kind: 'cardio', equipOptions: [['none']], pattern: 'cardio',
    muscles: ['legs', 'core'], impact: 'low', limits: { lowBack: 'caution', knee: 'caution', foot: 'caution' },
    modifications: { lowBack: 'Small rolls from the knees and hips, not the low back.', knee: 'Shallow knee bend on rolls.', foot: 'Flat-footed steps, no bouncing.' },
    cues: ['Slip by turning the shoulders, eyes forward', 'Roll under with a small knee bend', 'Step and pivot — always back to stance'], breathing: 'Breathe out on every movement; never hold it.', tags: ['low-impact', 'boxing'],
  },
  {
    id: 'bag-straight', name: 'Heavy Bag — Jab & Cross', kind: 'cardio', equipOptions: [['heavy-bag']], pattern: 'cardio',
    muscles: ['shoulders', 'core', 'legs'], impact: 'low', limits: { wrist: 'caution', shoulder: 'caution', foot: 'caution', hypertension: 'caution' },
    modifications: {
      wrist: 'Hand wraps and 14–16 oz gloves. Straight punches only, about 50% power; land with the first two knuckles and a straight wrist. Stop if the wrist aches.',
      shoulder: "Don't overextend — punch to a target just inside full reach.",
      foot: 'Flat-footed; pivot gently on the back foot.',
      hypertension: 'Speed and form, not power. Keep breathing on every punch.',
    },
    cues: ['Wraps + gloves on', 'Punch and return to guard', 'Move around the bag between combos'], breathing: 'Short, sharp exhale with every punch.', tags: ['boxing'],
  },
  {
    id: 'bag-hooks', name: 'Heavy Bag — Hooks, Uppercuts & Body Shots', kind: 'cardio', equipOptions: [['heavy-bag']], pattern: 'cardio',
    muscles: ['shoulders', 'core', 'obliques'], impact: 'low', limits: { wrist: 'avoid', shoulder: 'caution', lowBack: 'caution', hypertension: 'caution' },
    modifications: { shoulder: 'Short, compact hooks.', lowBack: 'Turn through the hips and feet, not the low back.', hypertension: 'Moderate power, steady breathing.' },
    cues: ['Elbow behind the fist on hooks', 'Bend the knees to dig to the body', 'Return to guard after each shot'], breathing: 'Short exhale with every punch.', tags: ['boxing'],
  },
  {
    id: 'front-raise', name: 'Neutral-Grip Front Raise', kind: 'strength', equipOptions: [['dumbbell'], ['cable']], pattern: 'shoulder-iso',
    muscles: ['shoulders'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { shoulder: 'caution' },
    modifications: { shoulder: 'Light weight; raise only to shoulder height.' },
    cues: ['Palms facing each other', 'Raise to shoulder height, no swinging', 'Lower for 2–3 seconds'], breathing: EXHALE,
  },
  {
    id: 'incline-y-raise', name: 'Chest-Supported Y-Raise', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'shoulder-iso',
    muscles: ['shoulders', 'upper-back'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { shoulder: 'caution' },
    modifications: { shoulder: 'Very light; raise only as high as is comfortable.' },
    cues: ['Chest on an incline bench, thumbs up', 'Raise arms in a Y shape', 'Light weight — this is about control'], breathing: EXHALE, tags: ['supported'],
  },
  {
    id: 'close-grip-press', name: 'Close-Grip Neutral Dumbbell Press', kind: 'strength', equipOptions: [['dumbbell', 'bench'], ['dumbbell']], pattern: 'arms',
    muscles: ['triceps', 'chest'], impact: 'none', grip: 'neutral', limits: { wrist: 'caution', shoulder: 'caution' },
    modifications: { wrist: 'Dumbbells touching, palms facing; wrists stacked over elbows.', shoulder: 'Lower only to chest level.' },
    cues: ['Dumbbells pressed together, palms facing', 'Elbows close to your sides', 'Press straight up'], breathing: EXHALE,
  },
  {
    id: 'seated-overhead-ext', name: 'Seated Two-Hand Overhead Extension', kind: 'strength', equipOptions: [['dumbbell', 'bench'], ['dumbbell']], pattern: 'arms',
    muscles: ['triceps'], impact: 'none', grip: 'neutral', limits: { shoulder: 'caution', wrist: 'caution', lowBack: 'caution' },
    modifications: { shoulder: 'Use the lying extension instead if overhead is uncomfortable.', wrist: 'Cup the top of the dumbbell with both palms.', lowBack: 'Back supported on an upright bench; ribs down.' },
    cues: ['Sit tall against an upright bench', 'Lower the dumbbell behind your head', 'Elbows point forward'], breathing: EXHALE,
  },
  {
    id: 'cross-body-curl', name: 'Cross-Body Hammer Curl', kind: 'strength', equipOptions: [['dumbbell']], pattern: 'arms',
    muscles: ['biceps', 'forearms'], impact: 'none', circuitOk: true, grip: 'neutral', unilateral: true, limits: { wrist: 'caution' },
    modifications: { wrist: 'Lighter load; keep the wrist straight.' },
    cues: ['Curl across your body toward the opposite shoulder', 'Elbow stays at your side'], breathing: EXHALE,
  },
  {
    id: 'incline-preacher-curl', name: 'Bench-Supported Hammer Curl', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'arms',
    muscles: ['biceps', 'forearms'], impact: 'none', grip: 'neutral', unilateral: true, limits: { wrist: 'caution', shoulder: 'caution' },
    modifications: { wrist: 'Light weight; neutral grip only.', shoulder: 'Keep the bench pad low on the upper arm.' },
    cues: ['Upper arm resting on an incline bench back', 'Curl with a neutral grip', 'Lower all the way under control'], breathing: EXHALE, tags: ['supported'],
  },
  {
    id: 'cable-rope-hammer', name: 'Cable Rope Hammer Curl', kind: 'strength', equipOptions: [['cable']], pattern: 'arms',
    muscles: ['biceps', 'forearms'], impact: 'none', circuitOk: true, grip: 'neutral', limits: {},
    cues: ['Rope on the low pulley', 'Elbows pinned', 'Thumbs up throughout'], breathing: EXHALE,
  },
  {
    id: 'machine-fly', name: 'Machine Chest Fly (pec deck)', kind: 'strength', equipOptions: [['machine-rear-delt']], pattern: 'h-push',
    muscles: ['chest'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { shoulder: 'caution', wrist: 'caution' },
    modifications: { shoulder: 'Set the handles so your hands start just behind your chest, not far back.', wrist: 'Use the vertical handles or forearm pads; wrists straight.' },
    cues: ['Seat height: handles at mid-chest', 'Slight bend in the elbows, fixed', 'Squeeze the chest to bring handles together, open slowly'], breathing: EXHALE,
  },
  {
    id: 'cable-fly', name: 'Cable Chest Fly', kind: 'strength', equipOptions: [['cable']], pattern: 'h-push',
    muscles: ['chest'], impact: 'none', circuitOk: true, grip: 'neutral', limits: { shoulder: 'caution' },
    modifications: { shoulder: 'Short range — stop when hands are in line with your chest.' },
    cues: ['Pulleys at shoulder height, staggered stance', 'Soft elbows, hug a big tree', 'Control the stretch back'], breathing: EXHALE,
  },
  {
    id: 'db-fly', name: 'Flat Dumbbell Fly (reduced range)', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'h-push',
    muscles: ['chest'], impact: 'none', grip: 'neutral', limits: { shoulder: 'caution', wrist: 'caution' },
    modifications: { shoulder: 'Lower only until elbows reach bench level.', wrist: 'Light dumbbells; palms facing.' },
    cues: ['Palms facing, soft elbows', 'Open wide until a light chest stretch', 'Bring dumbbells together over the chest'], breathing: EXHALE,
  },
  {
    id: 'smith-shoulder-press', name: 'Seated Smith Machine Shoulder Press', kind: 'strength', equipOptions: [['machine-smith', 'bench']], pattern: 'v-push',
    muscles: ['shoulders', 'triceps'], impact: 'none', main: true, grip: 'pronated', limits: { wrist: 'caution', shoulder: 'caution', hypertension: 'caution' },
    modifications: {
      wrist: 'Bar sits low in the palm over the forearm bones; wrists stacked. Stop if wrists ache.',
      shoulder: 'Bench upright, bar path in front of the face; stop at chin height if needed.',
      hypertension: 'Moderate load, smooth reps, exhale on every press — never grind.',
    },
    cues: ['Upright bench under the bar', 'Hands just outside shoulders', 'Press up, lower to chin height'], breathing: EXHALE,
  },
  {
    id: 'db-leg-curl', name: 'Prone Dumbbell Leg Curl', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'hinge',
    muscles: ['hamstrings'], impact: 'none', grip: 'none', limits: { knee: 'caution', lowBack: 'caution' },
    modifications: { knee: 'Light dumbbell, smooth range; stop short of a full squeeze if knees complain.', lowBack: 'Squeeze glutes and keep hips pressed into the bench — no arching.' },
    cues: ['Lie face-down on a flat bench, knees just off the end', 'Hold a light dumbbell between your feet', 'Curl heels toward glutes, lower slowly'], breathing: EXHALE,
  },
  {
    id: 'seated-calf-raise', name: 'Seated Dumbbell Calf Raise', kind: 'strength', equipOptions: [['dumbbell', 'bench']], pattern: 'calves',
    muscles: ['calves'], impact: 'none', grip: 'none', limits: { foot: 'caution' },
    modifications: { foot: 'Light weight, partial range; stop if the arch or heel hurts.' },
    cues: ['Sit on a bench, balls of feet on a plate or step', 'Dumbbells resting on your knees', 'Lift heels slowly, pause, lower slowly'], breathing: 'Steady breathing.',
  },
  // ───────────── CARDIO ─────────────
  {
    id: 'bike', name: 'Stationary Bike', kind: 'cardio', equipOptions: [['bike']], pattern: 'cardio',
    muscles: ['quads', 'glutes'], impact: 'none', limits: { knee: 'caution' },
    modifications: { knee: 'Raise the seat slightly; favor cadence over heavy resistance.' },
    cues: ['Seat at hip height', 'Smooth circles', 'Raise resistance to raise effort'], breathing: 'Rhythmic breathing.', tags: ['low-impact'],
  },
  {
    id: 'elliptical', name: 'Elliptical', kind: 'cardio', equipOptions: [['elliptical']], pattern: 'cardio',
    muscles: ['quads', 'glutes'], impact: 'none', limits: { foot: 'caution' },
    modifications: { foot: 'Keep the whole foot on the pedal; avoid toe-pushing.' },
    cues: ['Upright posture', 'Light grip on handles'], breathing: 'Rhythmic breathing.', tags: ['low-impact'],
  },
  {
    id: 'treadmill-walk', name: 'Treadmill Incline Walk', kind: 'cardio', equipOptions: [['treadmill']], pattern: 'cardio',
    muscles: ['glutes', 'calves'], impact: 'low', limits: { foot: 'caution', knee: 'caution' },
    modifications: { foot: 'Modest incline (≤6%) and supportive shoes.', knee: 'Lower incline; shorter stride.' },
    cues: ['Walk tall, hands off the rails if safe', 'Raise incline before speed'], breathing: 'Rhythmic breathing.', tags: ['low-impact'],
  },
  {
    id: 'treadmill-run', name: 'Treadmill Run', kind: 'cardio', equipOptions: [['treadmill']], pattern: 'cardio',
    muscles: ['legs'], impact: 'high', limits: { knee: 'avoid', foot: 'avoid' },
    cues: ['Short, quick strides'], breathing: 'Rhythmic breathing.',
  },
  {
    id: 'rower', name: 'Rower', kind: 'cardio', equipOptions: [['rower']], pattern: 'cardio',
    muscles: ['legs', 'upper-back', 'lats'], impact: 'none', limits: { lowBack: 'caution', wrist: 'caution', knee: 'caution' },
    modifications: { lowBack: 'Easy pressure; stay tall; skip if back pain builds.', wrist: 'Relaxed hook grip, flat wrists.', knee: 'Shorten the slide at the catch.' },
    cues: ['Legs → body → arms; reverse on return', 'Drive with legs, not the back'], breathing: 'Exhale on the drive.', tags: ['low-impact'],
  },
  {
    id: 'step-touch', name: 'Step-Touch / Low-Impact Shuffle', kind: 'cardio', equipOptions: [['none']], pattern: 'cardio',
    muscles: ['legs'], impact: 'low', circuitOk: true, limits: { foot: 'caution' },
    modifications: { foot: 'Small steps on a cushioned surface.' },
    cues: ['Step side to side, light feet', 'Add arm swings to raise effort'], breathing: 'Rhythmic breathing.', tags: ['low-impact'],
  },
  {
    id: 'shadow-boxing', name: 'Shadow Boxing — Combinations', kind: 'cardio', equipOptions: [['none']], pattern: 'cardio',
    muscles: ['shoulders', 'core'], impact: 'low', circuitOk: true, limits: { shoulder: 'caution', wrist: 'caution', foot: 'caution' },
    modifications: { shoulder: 'Short punches below shoulder height.', wrist: 'Relaxed fists, no full-speed snaps.', foot: 'Stay flat-footed; small steps, no bouncing.' },
    cues: ['Hands up, chin down, feet planted', 'Turn the hips into the cross', 'Snap each punch back to guard'], breathing: 'Short exhale on every punch.', tags: ['low-impact', 'boxing'],
  },
  {
    id: 'burpee', name: 'Burpee', kind: 'cardio', equipOptions: [['none']], pattern: 'cardio',
    muscles: ['full-body'], impact: 'high', limits: { wrist: 'avoid', knee: 'avoid', foot: 'avoid', lowBack: 'caution', hypertension: 'caution' },
    cues: ['—'], breathing: 'Keep breathing.', tags: ['plyometric', 'loaded-wrist-extension'],
  },
  {
    id: 'jumping-jack', name: 'Jumping Jack', kind: 'cardio', equipOptions: [['none']], pattern: 'cardio',
    muscles: ['full-body'], impact: 'high', limits: { knee: 'avoid', foot: 'avoid' },
    cues: ['Land softly'], breathing: 'Rhythmic breathing.', tags: ['plyometric'],
  },
];

export const EXERCISE_MAP: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  const ex = EXERCISE_MAP[id];
  if (!ex) throw new Error(`Unknown exercise: ${id}`);
  return ex;
}

export const CARDIO_EXERCISE_FOR: Record<string, string> = {
  bike: 'bike',
  elliptical: 'elliptical',
  treadmill: 'treadmill-walk',
  rower: 'rower',
  none: 'step-touch',
};

/** Exercises excluded by default for this user; editable in Profile. */
export const DEFAULT_AVOID = ['push-up', 'bench-dip', 'hand-plank', 'burpee'];
