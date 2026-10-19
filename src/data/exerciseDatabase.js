/**
 * exerciseDatabase.js — CamieWell Offline Exercise Library
 * =========================================================
 * Phase 6 — Structured library of bodyweight and 3 kg dumbbell exercises.
 *
 * Categories:
 *  - Chest
 *  - Shoulders
 *  - Back
 *  - Biceps
 *  - Triceps
 *  - Core and abs
 *  - Legs and glutes
 *  - Full body
 *  - Warm-up and stretching
 *
 * Each exercise contains:
 *  - id, name, category, primaryMuscles, equipment, difficulty
 *  - recommendedReps, defaultType ('reps'|'time'), defaultReps, defaultDurationSec
 *  - step-by-step instructions
 *  - correct starting position
 *  - movement & breathing guidance
 *  - common mistakes to avoid
 *  - easier variation
 *  - safety tips & when to stop
 *  - animationType for offline SVG animator
 */

export const EXERCISE_CATEGORIES = [
  'All',
  'Chest',
  'Shoulders',
  'Back',
  'Biceps',
  'Triceps',
  'Core and abs',
  'Legs and glutes',
  'Full body',
  'Warm-up and stretching',
];

export const EXERCISES = [
  // ── CHEST ───────────────────────────────────────────────────────────
  {
    id: 'chest_pushups',
    name: 'Standard Push-Up',
    category: 'Chest',
    primaryMuscles: ['Chest (Pectorals)', 'Triceps', 'Anterior Deltoids'],
    equipment: 'bodyweight',
    difficulty: 'Intermediate',
    recommendedReps: '8–12 reps',
    defaultType: 'reps',
    defaultReps: 10,
    defaultDurationSec: null,
    defaultRestSec: 45,
    startingPosition: 'High plank position with hands slightly wider than shoulder-width, wrists under shoulders, core braced, and feet hip-width apart.',
    instructions: [
      'Engage your glutes and core to form a straight line from your head to your heels.',
      'Inhale as you lower your chest towards the floor by bending your elbows at roughly a 45-degree angle.',
      'Lower until your chest is about an inch from the floor or as low as your shoulders allow comfortably.',
      'Exhale and press through your palms to push the floor away, returning to the starting high plank position.'
    ],
    movementAndBreathing: 'Inhale on the descent; exhale forcefully on the push-up. Keep neck neutral by gazing 6 inches in front of your fingertips.',
    commonMistakes: [
      'Flaring elbows out at a 90-degree angle (places excess stress on shoulders).',
      'Sagging hips or arching the lower back.',
      'Dropping the head forward before the chest.'
    ],
    easierVariation: 'Incline Push-Up with hands on an elevated surface (couch, counter, or sturdy chair), or Knee Push-Ups.',
    safetyTips: 'Keep wrists stacked under shoulders. Stop if you feel sharp pain in your wrists, elbows, or front of shoulders.',
    animationType: 'pushup',
  },
  {
    id: 'chest_incline_pushup',
    name: 'Incline Push-Up',
    category: 'Chest',
    primaryMuscles: ['Lower Chest', 'Triceps', 'Core'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '10–15 reps',
    defaultType: 'reps',
    defaultReps: 12,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Place your hands shoulder-width apart on a sturdy elevated surface (couch, sturdy table, or bench). Step back into a strong plank.',
    instructions: [
      'Maintain a rigid straight plank line through ankles, hips, and shoulders.',
      'Slowly bend your elbows to lower your sternum to touch the edge of the elevated surface.',
      'Press firmly through your hands and extend your arms back to the starting plank.'
    ],
    movementAndBreathing: 'Inhale as you lower; exhale as you push back up. Keep your core tight throughout.',
    commonMistakes: [
      'Bending at the hips rather than moving the entire body as a plank.',
      'Using an unstable or slippery elevated surface.'
    ],
    easierVariation: 'Increase the incline angle (e.g. wall push-up).',
    safetyTips: 'Always ensure your hands are dry and the surface will not slip or slide away.',
    animationType: 'incline_pushup',
  },
  {
    id: 'chest_db_floor_press',
    name: 'Dumbbell Floor Press',
    category: 'Chest',
    primaryMuscles: ['Pectorals', 'Triceps'],
    equipment: 'dumbbells',
    difficulty: 'Beginner',
    recommendedReps: '10–14 reps',
    defaultType: 'reps',
    defaultReps: 12,
    defaultDurationSec: null,
    defaultRestSec: 45,
    startingPosition: 'Lie flat on your back on an exercise mat with knees bent and feet flat on the floor. Hold a 3 kg dumbbell in each hand, upper arms resting on the floor at a 45-degree angle to your torso.',
    instructions: [
      'Brace your core and plant your feet firmly into the floor.',
      'Exhale and press both dumbbells straight up over your chest until your arms are extended, without locking elbows.',
      'Inhale and lower the dumbbells in a controlled tempo until your upper arms gently touch the floor.'
    ],
    movementAndBreathing: 'Exhale as you press the dumbbells upward; inhale as you lower them until elbows lightly tap the mat.',
    commonMistakes: [
      'Bouncing your elbows forcefully off the floor.',
      'Over-arching the lower back off the mat.'
    ],
    easierVariation: 'Perform with a lighter tempo or single-arm floor press with core focus.',
    safetyTips: 'The floor naturally protects your shoulder joint from hyperextension. Never drop dumbbells near your face.',
    animationType: 'db_floor_press',
  },
  {
    id: 'chest_db_fly',
    name: 'Dumbbell Floor Chest Fly',
    category: 'Chest',
    primaryMuscles: ['Pectorals (Chest)', 'Anterior Shoulders'],
    equipment: 'dumbbells',
    difficulty: 'Beginner',
    recommendedReps: '10–12 reps',
    defaultType: 'reps',
    defaultReps: 10,
    defaultDurationSec: null,
    defaultRestSec: 45,
    startingPosition: 'Lie on your back on a mat, knees bent, holding a 3 kg dumbbell in each hand directly above your chest, palms facing each other, elbows slightly soft.',
    instructions: [
      'Maintain a gentle, fixed bend in your elbows throughout the movement.',
      'Inhale as you open your arms wide in a smooth arc until the backs of your upper arms graze the mat.',
      'Exhale and squeeze your chest muscles to bring the dumbbells back together over your chest.'
    ],
    movementAndBreathing: 'Inhale deeply as you open your arms; exhale smoothly as you hug the weights back together over your sternum.',
    commonMistakes: [
      'Locking out elbows completely or excessively bending elbows into a press.',
      'Letting wrists hyperextend under the weight.'
    ],
    easierVariation: 'Reduce range of motion or perform with bodyweight arm flyes.',
    safetyTips: 'The floor prevents shoulder hyperextension. Stop if you feel pulling in the front shoulder joint.',
    animationType: 'db_fly',
  },

  // ── SHOULDERS ────────────────────────────────────────────────────────
  {
    id: 'shoulder_db_overhead_press',
    name: 'Dumbbell Overhead Shoulder Press',
    category: 'Shoulders',
    primaryMuscles: ['Deltoids (Anterior & Lateral)', 'Triceps', 'Upper Traps'],
    equipment: 'dumbbells',
    difficulty: 'Beginner',
    recommendedReps: '10–12 reps',
    defaultType: 'reps',
    defaultReps: 10,
    defaultDurationSec: null,
    defaultRestSec: 45,
    startingPosition: 'Stand tall with feet hip-width apart or seated tall on a chair. Hold dumbbells at shoulder height with palms facing forward or slightly inward, elbows pointing downward.',
    instructions: [
      'Brace your abdominal muscles and keep your ribcage down.',
      'Exhale and press both dumbbells vertically overhead until arms are nearly straight.',
      'Pause for a split second with dumbbells aligned over shoulders.',
      'Inhale and lower under control back to ear level.'
    ],
    movementAndBreathing: 'Exhale while pressing overhead; inhale while lowering with control. Avoid arching your lower back.',
    commonMistakes: [
      'Arching lower back and thrusting pelvis forward.',
      'Locking out elbows with sudden impact at the top.'
    ],
    easierVariation: 'Seated Overhead Press with back support or pressing one arm at a time.',
    safetyTips: 'Do not shrug your neck or shoulders up into your ears. Lower weights immediately if you experience sharp pinch.',
    animationType: 'db_overhead_press',
  },
  {
    id: 'shoulder_db_lateral_raise',
    name: 'Dumbbell Lateral Raise',
    category: 'Shoulders',
    primaryMuscles: ['Lateral Deltoids (Side Shoulders)'],
    equipment: 'dumbbells',
    difficulty: 'Beginner',
    recommendedReps: '10–14 reps',
    defaultType: 'reps',
    defaultReps: 12,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Stand tall with feet hip-width, knees slightly soft, dumbbells resting at your thighs, palms facing inward.',
    instructions: [
      'Slightly bend your elbows (about 10 degrees).',
      'Exhale and raise your arms out to the sides until your elbows are parallel to the floor (shoulder height).',
      'Lead with your elbows, keeping wrists relaxed.',
      'Inhale and lower slowly over 2 seconds back to your sides.'
    ],
    movementAndBreathing: 'Exhale as you lift; inhale as you lower. Control the negative phase.',
    commonMistakes: [
      'Swinging your torso or using momentum to toss the weights up.',
      'Raising hands higher than elbows (internal shoulder impingement).'
    ],
    easierVariation: 'Bend elbows to 90 degrees (shorter lever arm reduces strain on 3 kg weights).',
    safetyTips: 'Do not lift above shoulder height. 3 kg dumbbells are ideal for slow, controlled reps.',
    animationType: 'db_lateral_raise',
  },
  {
    id: 'shoulder_db_front_raise',
    name: 'Dumbbell Front Raise',
    category: 'Shoulders',
    primaryMuscles: ['Anterior Deltoids (Front Shoulders)'],
    equipment: 'dumbbells',
    difficulty: 'Beginner',
    recommendedReps: '10–12 reps',
    defaultType: 'reps',
    defaultReps: 10,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Stand with feet shoulder-width, holding dumbbells in front of thighs, palms facing your body.',
    instructions: [
      'Keep your core braced and shoulders rolled back.',
      'Exhale and raise the dumbbells straight forward until parallel to the floor.',
      'Pause briefly at shoulder height, then inhale and lower slowly back to thighs.'
    ],
    movementAndBreathing: 'Exhale on lift; inhale on descent. Keep your gaze forward and torso motionless.',
    commonMistakes: [
      'Rocking back and forth from the lower spine.',
      'Shrugging the neck.'
    ],
    easierVariation: 'Alternate arms (single-arm raise).',
    safetyTips: 'Do not swing or lean back. Keep movement strictly controlled.',
    animationType: 'db_front_raise',
  },
  {
    id: 'shoulder_pike_pushup',
    name: 'Pike Push-Up',
    category: 'Shoulders',
    primaryMuscles: ['Anterior Deltoids', 'Triceps', 'Upper Back'],
    equipment: 'bodyweight',
    difficulty: 'Intermediate',
    recommendedReps: '6–10 reps',
    defaultType: 'reps',
    defaultReps: 8,
    defaultDurationSec: null,
    defaultRestSec: 45,
    startingPosition: 'Start in a downward dog / inverted V position with hands shoulder-width and hips raised high toward the ceiling.',
    instructions: [
      'Gaze back toward your toes to maintain a neutral neck.',
      'Inhale and bend elbows, lowering the crown of your head diagonally forward toward the floor between your hands.',
      'Exhale and press firmly into the floor, pushing hips back up and returning to the pike position.'
    ],
    movementAndBreathing: 'Inhale as you lower; exhale as you press up and back.',
    commonMistakes: [
      'Letting elbows flare completely wide.',
      'Dropping hips into a standard push-up plank.'
    ],
    easierVariation: 'Perform with hands on an elevated bed or bench to reduce inverted bodyweight load.',
    safetyTips: 'Stop immediately if you feel lightheaded, dizzy, or neck strain.',
    animationType: 'pike_pushup',
  },

  // ── BACK ─────────────────────────────────────────────────────────────
  {
    id: 'back_db_bent_over_row',
    name: 'Dumbbell Bent-Over Row',
    category: 'Back',
    primaryMuscles: ['Latissimus Dorsi', 'Rhomboids', 'Rear Deltoids', 'Biceps'],
    equipment: 'dumbbells',
    difficulty: 'Beginner',
    recommendedReps: '10–14 reps',
    defaultType: 'reps',
    defaultReps: 12,
    defaultDurationSec: null,
    defaultRestSec: 45,
    startingPosition: 'Stand with feet hip-width apart. Hinge at your hips with a flat back at a 45-degree angle, knees soft. Hold a 3 kg dumbbell in each hand, arms hanging naturally.',
    instructions: [
      'Keep your chest proud and spine long and neutral.',
      'Exhale and pull the dumbbells up toward your hip pockets, driving your elbows back toward the ceiling.',
      'Squeeze your shoulder blades together firmly at the top for 1 second.',
      'Inhale and lower the dumbbells smoothly back to the hanging starting position.'
    ],
    movementAndBreathing: 'Exhale on the pull; inhale as you lower the weights. Maintain a strong abdominal brace.',
    commonMistakes: [
      'Rounding the upper or lower back (cat-spine posture).',
      'Yanking the weights up using hips and torso momentum.',
      'Pulling weights toward the collarbone instead of the hip pockets.'
    ],
    easierVariation: 'Single-arm supported row with one knee and one hand on a sturdy chair or couch.',
    safetyTips: 'Maintain a flat back at all times. Stop if you experience tension in your lower back.',
    animationType: 'db_bent_row',
  },
  {
    id: 'back_superman',
    name: 'Superman Back Extension',
    category: 'Back',
    primaryMuscles: ['Erector Spinae (Lower Back)', 'Glutes', 'Upper Back'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '10–12 reps or 30s hold',
    defaultType: 'reps',
    defaultReps: 10,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Lie face down on a mat with arms extended overhead and legs straight behind you, forehead gently hovering above the mat.',
    instructions: [
      'Inhale and gently engage your core.',
      'Exhale and simultaneously lift your chest, arms, and legs 2–4 inches off the floor by squeezing your glutes and back muscles.',
      'Hold the lifted peak position for 1–2 seconds.',
      'Inhale and lower back down with control.'
    ],
    movementAndBreathing: 'Exhale on the lift; inhale on the release. Keep your gaze down at the mat so your neck stays neutral.',
    commonMistakes: [
      'Craning the neck upward to look at the wall.',
      'Jerking violently into hyperextension.'
    ],
    easierVariation: 'Lift only your arms first, or only your legs, or alternate opposite arm and opposite leg.',
    safetyTips: 'Do not over-hyperextend the spine. Lift only a few inches using glute and upper back tension.',
    animationType: 'superman',
  },
  {
    id: 'back_db_reverse_fly',
    name: 'Dumbbell Reverse Fly',
    category: 'Back',
    primaryMuscles: ['Rear Deltoids', 'Rhomboids', 'Middle Trapezius'],
    equipment: 'dumbbells',
    difficulty: 'Beginner',
    recommendedReps: '10–12 reps',
    defaultType: 'reps',
    defaultReps: 10,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Hinge at the hips with a flat back, knees soft. Hold dumbbells with palms facing each other, arms hanging down, elbows slightly rounded.',
    instructions: [
      'Keep your neck aligned with your spine.',
      'Exhale and raise both arms out to the sides like wings until elbows align with torso height.',
      'Focus on squeezing the muscles between your shoulder blades.',
      'Inhale and lower the dumbbells slowly back down.'
    ],
    movementAndBreathing: 'Exhale as you raise the weights out; inhale as you lower.',
    commonMistakes: [
      'Standing up too tall during reps.',
      'Using body momentum or throwing the head back.'
    ],
    easierVariation: 'Perform prone on floor with thumbs pointed up (Prone Y/T/W).',
    safetyTips: 'Keep weights light (3 kg is plenty). Focus on clean muscle contraction.',
    animationType: 'db_reverse_fly',
  },

  // ── BICEPS ───────────────────────────────────────────────────────────
  {
    id: 'biceps_db_curl',
    name: 'Dumbbell Bicep Curl',
    category: 'Biceps',
    primaryMuscles: ['Biceps Brachii', 'Brachialis'],
    equipment: 'dumbbells',
    difficulty: 'Beginner',
    recommendedReps: '10–14 reps',
    defaultType: 'reps',
    defaultReps: 12,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Stand tall with feet hip-width, holding dumbbells at your sides, palms facing forward, elbows pinned close to your torso.',
    instructions: [
      'Keep upper arms stationary and elbows close to your ribs.',
      'Exhale and curl the dumbbells upward toward your front shoulders.',
      'Squeeze your biceps firmly at the top of the curl.',
      'Inhale and lower the dumbbells with a controlled 2-second tempo until your arms are fully extended.'
    ],
    movementAndBreathing: 'Exhale on the upward curl; inhale as you lower the weights.',
    commonMistakes: [
      'Swinging the torso or thrusting elbows forward to cheat the weight up.',
      'Letting the weights drop quickly on the way down.'
    ],
    easierVariation: 'Alternate curls (curl one arm at a time) or seated curls.',
    safetyTips: 'Keep wrists firm and straight. Do not swing your lower back.',
    animationType: 'db_bicep_curl',
  },
  {
    id: 'biceps_db_hammer_curl',
    name: 'Dumbbell Hammer Curl',
    category: 'Biceps',
    primaryMuscles: ['Brachioradialis (Forearm)', 'Brachialis', 'Biceps'],
    equipment: 'dumbbells',
    difficulty: 'Beginner',
    recommendedReps: '10–14 reps',
    defaultType: 'reps',
    defaultReps: 12,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Stand tall with feet shoulder-width, holding dumbbells with a neutral grip (palms facing inward toward each other).',
    instructions: [
      'Pin your elbows against your ribs.',
      'Exhale and curl the dumbbells straight up while keeping palms facing each other throughout.',
      'Pause and squeeze at the top contraction.',
      'Inhale and lower slowly over 2 seconds.'
    ],
    movementAndBreathing: 'Exhale curling up; inhale lowering down.',
    commonMistakes: [
      'Letting elbows drift backward behind the body.',
      'Using hips to propel the weights.'
    ],
    easierVariation: 'Perform seated or alternating arms.',
    safetyTips: 'Maintain upright posture; do not arch the lower back.',
    animationType: 'db_hammer_curl',
  },

  // ── TRICEPS ──────────────────────────────────────────────────────────
  {
    id: 'triceps_overhead_extension',
    name: 'Overhead Dumbbell Tricep Extension',
    category: 'Triceps',
    primaryMuscles: ['Triceps (Long Head)'],
    equipment: 'dumbbells',
    difficulty: 'Beginner',
    recommendedReps: '10–12 reps',
    defaultType: 'reps',
    defaultReps: 12,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Stand or sit tall. Hold one 3 kg dumbbell with both hands overhead (or one in each hand pressed together), elbows pointing forward beside your ears.',
    instructions: [
      'Keep upper arms stationary alongside your head.',
      'Inhale and bend your elbows to lower the dumbbell behind your head until your forearms are roughly parallel to the floor.',
      'Exhale and press through your triceps to extend your arms back straight overhead.'
    ],
    movementAndBreathing: 'Inhale on the descent behind head; exhale as you extend arms straight overhead.',
    commonMistakes: [
      'Flaring elbows out wide to the sides.',
      'Arching lower back and jutting ribs forward.'
    ],
    easierVariation: 'Perform seated with back support or use Tricep Dips on floor.',
    safetyTips: 'Ensure a secure two-handed grip on the dumbbell. Keep neck relaxed.',
    animationType: 'tricep_overhead',
  },
  {
    id: 'triceps_bench_dips',
    name: 'Chair / Mat Tricep Dips',
    category: 'Triceps',
    primaryMuscles: ['Triceps', 'Anterior Deltoids'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '10–15 reps',
    defaultType: 'reps',
    defaultReps: 12,
    defaultDurationSec: null,
    defaultRestSec: 45,
    startingPosition: 'Sit on the edge of a sturdy chair or couch. Place your hands on the edge beside your hips. Walk your feet forward, slide your hips just off the seat, knees bent at 90 degrees.',
    instructions: [
      'Keep your back close to the chair edge.',
      'Inhale and bend your elbows straight back to lower your hips toward the floor until elbows reach 90 degrees.',
      'Exhale and push through your palms to straighten your arms back to the start.'
    ],
    movementAndBreathing: 'Inhale as you lower; exhale as you press up. Keep shoulders rolled down away from ears.',
    commonMistakes: [
      'Drifting hips far away from the chair (causes excessive shoulder strain).',
      'Shrugging shoulders into ears.'
    ],
    easierVariation: 'Perform Floor Tricep Dips with hands and feet flat on the mat.',
    safetyTips: 'Do not dip deeper than 90 degrees at the elbow. Stop if you feel shoulder impingement.',
    animationType: 'tricep_dips',
  },
  {
    id: 'triceps_db_kickback',
    name: 'Dumbbell Tricep Kickback',
    category: 'Triceps',
    primaryMuscles: ['Triceps (Lateral & Medial Heads)'],
    equipment: 'dumbbells',
    difficulty: 'Beginner',
    recommendedReps: '10–12 reps',
    defaultType: 'reps',
    defaultReps: 10,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Hinge forward at the hips with flat back. Pull your elbows up so your upper arms are pinned parallel to your torso.',
    instructions: [
      'Keep your upper arms locked in place against your ribs.',
      'Exhale and extend your forearms backward until your arms are straight.',
      'Squeeze the backs of your arms for 1 full second.',
      'Inhale and return your forearms forward to 90 degrees.'
    ],
    movementAndBreathing: 'Exhale kicking back; inhale returning forward.',
    commonMistakes: [
      'Dropping upper arms down between repetitions.',
      'Swinging arms like a pendulum.'
    ],
    easierVariation: 'One arm at a time with the other hand resting on a table for support.',
    safetyTips: 'Keep your torso still and spine neutral.',
    animationType: 'tricep_kickback',
  },

  // ── CORE AND ABS ─────────────────────────────────────────────────────
  {
    id: 'core_plank',
    name: 'Forearm Plank',
    category: 'Core and abs',
    primaryMuscles: ['Transverse Abdominis', 'Rectus Abdominis', 'Glutes', 'Shoulders'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '20–45 seconds',
    defaultType: 'time',
    defaultReps: null,
    defaultDurationSec: 30,
    defaultRestSec: 30,
    startingPosition: 'Lie face down on a mat. Prop yourself up on your forearms with elbows directly under shoulders, forearms parallel, feet hip-width.',
    instructions: [
      'Tuck your toes and lift your hips, thighs, and torso off the floor.',
      'Form one continuous straight line from your head to your heels.',
      'Squeeze your glutes, brace your abs as if expecting a punch, and press your forearms into the floor.',
      'Breathe steadily throughout the hold.'
    ],
    movementAndBreathing: 'Never hold your breath. Take calm, steady breaths while maintaining core tension.',
    commonMistakes: [
      'Sagging hips (hyperextending lower back).',
      'Piking hips high in the air.',
      'Holding breath.'
    ],
    easierVariation: 'Knee Plank (plank supported on knees rather than toes).',
    safetyTips: 'If your lower back starts arching or aching, drop your knees to reset immediately.',
    animationType: 'plank',
  },
  {
    id: 'core_dead_bug',
    name: 'Dead Bug',
    category: 'Core and abs',
    primaryMuscles: ['Deep Core', 'Transverse Abdominis', 'Hip Flexors'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '10–14 reps',
    defaultType: 'reps',
    defaultReps: 12,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Lie on your back with arms reaching toward the ceiling and knees bent at 90 degrees directly above hips (tabletop position). Press your lower back firmly into the mat.',
    instructions: [
      'Glue your lower back to the floor so there is zero gap.',
      'Exhale and slowly lower your right arm overhead while extending your left leg straight out until both hover 2 inches above the mat.',
      'Inhale and bring both limbs back to the tabletop starting position.',
      'Repeat with left arm and right leg.'
    ],
    movementAndBreathing: 'Exhale as you extend; inhale as you return. Focus on keeping your lower back pressed to the floor.',
    commonMistakes: [
      'Allowing lower back to arch off the mat as limbs extend.',
      'Moving too fast without core engagement.'
    ],
    easierVariation: 'Keep knees bent and perform heel taps rather than full leg extensions.',
    safetyTips: 'Only lower limbs as far as you can maintain your lower back pressed into the mat.',
    animationType: 'dead_bug',
  },
  {
    id: 'core_bird_dog',
    name: 'Bird Dog',
    category: 'Core and abs',
    primaryMuscles: ['Erector Spinae', 'Glutes', 'Core Stability', 'Shoulders'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '10–12 reps',
    defaultType: 'reps',
    defaultReps: 10,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Start on all fours (tabletop) on your hands and knees. Hands under shoulders, knees under hips, spine neutral.',
    instructions: [
      'Engage your abdominal wall.',
      'Exhale and simultaneously reach your right arm straight forward and left leg straight backward until parallel to the floor.',
      'Hold the extended position for 1–2 seconds without tilting hips.',
      'Inhale and return with control back to tabletop, then switch sides.'
    ],
    movementAndBreathing: 'Exhale extending; inhale returning. Keep hips level like a flat tabletop.',
    commonMistakes: [
      'Rotating or tilting hips to the side.',
      'Kicking the leg too high, arching lower back.'
    ],
    easierVariation: 'Lift only one arm or one leg at a time.',
    safetyTips: 'Focus on reaching long rather than kicking high. Great for spine health.',
    animationType: 'bird_dog',
  },
  {
    id: 'core_russian_twists',
    name: 'Russian Twists',
    category: 'Core and abs',
    primaryMuscles: ['Obliques', 'Rectus Abdominis'],
    equipment: 'dumbbells',
    difficulty: 'Beginner',
    recommendedReps: '16–20 twists',
    defaultType: 'reps',
    defaultReps: 16,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Sit on the mat with knees bent and heels planted on the floor. Hold one 3 kg dumbbell with both hands at your chest. Lean your torso back at roughly a 45-degree angle with a flat back.',
    instructions: [
      'Keep your spine straight and chest open.',
      'Exhale and rotate your torso to the right, tapping the dumbbell near your right hip.',
      'Inhale through center, then exhale and rotate smoothly to the left.',
      'Keep movement originating from your ribs/torso, not just arms.'
    ],
    movementAndBreathing: 'Exhale on each twist; inhale as you transition through center.',
    commonMistakes: [
      'Slumping or rounding the lower back.',
      'Moving only the arms while keeping the torso facing forward.'
    ],
    easierVariation: 'Perform with empty hands (bodyweight only).',
    safetyTips: 'Do not twist aggressively. Stop if you feel twisting strain in your lower back.',
    animationType: 'russian_twist',
  },

  // ── LEGS AND GLUTES ──────────────────────────────────────────────────
  {
    id: 'legs_bodyweight_squat',
    name: 'Bodyweight Air Squat',
    category: 'Legs and glutes',
    primaryMuscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Calves'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '12–15 reps',
    defaultType: 'reps',
    defaultReps: 15,
    defaultDurationSec: null,
    defaultRestSec: 45,
    startingPosition: 'Stand tall with feet shoulder-width apart, toes pointed slightly outward (10–15 degrees), arms ready at chest.',
    instructions: [
      'Inhale as you sit your hips back and down, as if sitting into an invisible chair.',
      'Keep your chest lifted, spine neutral, and knees tracking in line with your toes.',
      'Lower until thighs are at least parallel to the floor (or to a comfortable depth).',
      'Exhale and drive through your midfoot and heels to return to standing, gently squeezing glutes at the top.'
    ],
    movementAndBreathing: 'Inhale on the way down; exhale as you stand up tall.',
    commonMistakes: [
      'Knees caving inward (knee valgus).',
      'Lifting heels off the floor.',
      'Rounding the lower back.'
    ],
    easierVariation: 'Box Squat: sit down onto a chair or couch and stand back up.',
    safetyTips: 'Keep knees tracking over second toes. Stop if you experience sharp knee pain.',
    animationType: 'squat',
  },
  {
    id: 'legs_db_goblet_squat',
    name: 'Goblet Squat (3 kg)',
    category: 'Legs and glutes',
    primaryMuscles: ['Quadriceps', 'Gluteus Maximus', 'Core'],
    equipment: 'dumbbells',
    difficulty: 'Beginner',
    recommendedReps: '10–12 reps',
    defaultType: 'reps',
    defaultReps: 12,
    defaultDurationSec: null,
    defaultRestSec: 45,
    startingPosition: 'Stand tall with feet slightly wider than shoulder-width. Hold one 3 kg dumbbell vertically against your sternum with both hands cupping the top head.',
    instructions: [
      'Keep the dumbbell pinned close to your chest throughout.',
      'Inhale, hinge your hips back, and bend knees to sink into a deep squat.',
      'Keep your torso upright with elbows inside knees at the bottom.',
      'Exhale, press through your heels, and stand back up tall.'
    ],
    movementAndBreathing: 'Inhale descending; exhale driving up through your heels.',
    commonMistakes: [
      'Letting the weight pull your torso forward.',
      'Shifting weight onto the balls of your feet.'
    ],
    easierVariation: 'Bodyweight air squat.',
    safetyTips: 'Keep dumbbell snug against your chest so it does not pull your upper spine forward.',
    animationType: 'goblet_squat',
  },
  {
    id: 'legs_glute_bridge',
    name: 'Glute Bridge',
    category: 'Legs and glutes',
    primaryMuscles: ['Gluteus Maximus', 'Hamstrings', 'Core'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '12–16 reps',
    defaultType: 'reps',
    defaultReps: 15,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Lie on your back on a mat, knees bent, feet flat on the floor hip-width apart and roughly 6 inches from your glutes, arms relaxed by your sides.',
    instructions: [
      'Brace your core so your lower back is flat on the floor.',
      'Exhale, push through your heels, and lift your hips until your thighs and torso form a straight line.',
      'Squeeze your glutes tightly at the top for 2 full seconds.',
      'Inhale and lower your hips with control back down to hover above the mat.'
    ],
    movementAndBreathing: 'Exhale driving hips up; inhale lowering down.',
    commonMistakes: [
      'Over-arching lower back at the top instead of squeezing glutes.',
      'Pushing through toes instead of heels.'
    ],
    easierVariation: 'Shorter range of motion or gentle bridge hold.',
    safetyTips: 'Keep neck relaxed on mat; focus entirely on glute squeeze.',
    animationType: 'glute_bridge',
  },
  {
    id: 'legs_db_lunges',
    name: 'Walking or Reverse Lunges',
    category: 'Legs and glutes',
    primaryMuscles: ['Quadriceps', 'Glutes', 'Hamstrings', 'Calves'],
    equipment: 'dumbbells',
    difficulty: 'Intermediate',
    recommendedReps: '10–12 reps per leg',
    defaultType: 'reps',
    defaultReps: 10,
    defaultDurationSec: null,
    defaultRestSec: 45,
    startingPosition: 'Stand tall with feet hip-width, holding a 3 kg dumbbell in each hand at your sides (or bodyweight with hands on hips).',
    instructions: [
      'Step your right foot backward roughly 2 to 3 feet.',
      'Inhale and lower your back knee straight down toward the floor until both knees are bent at roughly 90 degrees.',
      'Keep front knee stacked over front ankle.',
      'Exhale, press through the front heel, and step forward back to the starting stance. Alternate legs.'
    ],
    movementAndBreathing: 'Inhale stepping back and lowering; exhale pressing back up.',
    commonMistakes: [
      'Front knee pushing excessively far beyond toes.',
      'Torso collapsing forward.'
    ],
    easierVariation: 'Bodyweight static split squat (feet stay in place, just move up and down).',
    safetyTips: 'Take a sufficiently wide step back. Never bang back knee onto the floor.',
    animationType: 'lunges',
  },
  {
    id: 'legs_calf_raises',
    name: 'Standing Calf Raises',
    category: 'Legs and glutes',
    primaryMuscles: ['Gastrocnemius', 'Soleus (Calves)'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '15–20 reps',
    defaultType: 'reps',
    defaultReps: 20,
    defaultDurationSec: null,
    defaultRestSec: 30,
    startingPosition: 'Stand tall with feet hip-width apart near a wall or chair for balance, holding dumbbells at your sides or hands on hips.',
    instructions: [
      'Keep knees straight but not hyperextended.',
      'Exhale and push through the balls of both feet to raise your heels as high as possible.',
      'Hold at the peak contraction for 1 second.',
      'Inhale and lower slowly over 2 seconds.'
    ],
    movementAndBreathing: 'Exhale lifting onto tiptoes; inhale lowering heels.',
    commonMistakes: [
      'Bouncing rapidly without pausing at the top.',
      'Rolling ankles outward.'
    ],
    easierVariation: 'Perform seated with dumbbells resting on your knees.',
    safetyTips: 'Perform near a wall for balance if needed.',
    animationType: 'calf_raise',
  },

  // ── FULL BODY ────────────────────────────────────────────────────────
  {
    id: 'full_db_thruster',
    name: 'Dumbbell Thrusters (Squat to Press)',
    category: 'Full body',
    primaryMuscles: ['Quadriceps', 'Glutes', 'Deltoids', 'Triceps', 'Core'],
    equipment: 'dumbbells',
    difficulty: 'Intermediate',
    recommendedReps: '10–12 reps',
    defaultType: 'reps',
    defaultReps: 10,
    defaultDurationSec: null,
    defaultRestSec: 60,
    startingPosition: 'Stand with feet shoulder-width, holding dumbbells at shoulder level with elbows pointing down and forward.',
    instructions: [
      'Inhale and lower into a deep, controlled squat with chest upright.',
      'Exhale and explosively drive up through your heels.',
      'Use the momentum of your legs to press the dumbbells smoothly overhead in one fluid motion.',
      'Inhale as you lower the dumbbells back to shoulders while initiating the next squat.'
    ],
    movementAndBreathing: 'Inhale descending into squat; exhale explosively as you stand and press overhead.',
    commonMistakes: [
      'Pressing before your legs finish standing (pause in power transfer).',
      'Arching lower back overhead.'
    ],
    easierVariation: 'Break movement into two steps: Squat first, stand, then press.',
    safetyTips: 'With 3 kg dumbbells, focus on fluidity and coordination. Stop if breathless or form breaks down.',
    animationType: 'thruster',
  },
  {
    id: 'full_mountain_climbers',
    name: 'Mountain Climbers',
    category: 'Full body',
    primaryMuscles: ['Core', 'Hip Flexors', 'Shoulders', 'Cardio'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '20–30 seconds',
    defaultType: 'time',
    defaultReps: null,
    defaultDurationSec: 30,
    defaultRestSec: 30,
    startingPosition: 'Start in a strong high plank with hands directly beneath shoulders, core engaged, and body in a straight line.',
    instructions: [
      'Keep hands firmly pressed into the floor.',
      'Drive your right knee forward toward your chest without letting hips bounce up.',
      'Quickly step right foot back while driving left knee forward.',
      'Continue alternating knees in a rhythmic, controlled tempo.'
    ],
    movementAndBreathing: 'Breathe rhythmically. Do not hold your breath during fast movements.',
    commonMistakes: [
      'Piking hips high in the air.',
      'Shoulders drifting backward behind wrists.'
    ],
    easierVariation: 'Slow-motion mountain climbers (step one foot at a time, pause, step back).',
    safetyTips: 'Keep wrists under shoulders. Slow down if you lose plank alignment.',
    animationType: 'mountain_climber',
  },
  {
    id: 'full_jumping_jacks',
    name: 'Jumping Jacks / Step Jacks',
    category: 'Full body',
    primaryMuscles: ['Full Body Cardio', 'Calves', 'Shoulders'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '30–45 seconds',
    defaultType: 'time',
    defaultReps: null,
    defaultDurationSec: 30,
    defaultRestSec: 30,
    startingPosition: 'Stand tall with feet together and arms at your sides.',
    instructions: [
      'Jump feet out wider than shoulder-width while sweeping arms overhead until hands touch or meet above head.',
      'Lightly spring on the balls of your feet and return feet together with arms back at sides.',
      'Repeat in a continuous, rhythmic bounce.'
    ],
    movementAndBreathing: 'Breathe naturally throughout.',
    commonMistakes: [
      'Landing heavily with locked knees.',
      'Incomplete arm sweeps.'
    ],
    easierVariation: 'Low-Impact Step Jacks: Step right foot out with arms overhead, step back, then step left foot out (zero jumping).',
    safetyTips: 'Land softly on the balls of your feet with soft knees.',
    animationType: 'jumping_jacks',
  },

  // ── WARM-UP AND STRETCHING ───────────────────────────────────────────
  {
    id: 'warmup_arm_circles',
    name: 'Arm Circles & Shoulder Rolls',
    category: 'Warm-up and stretching',
    primaryMuscles: ['Rotator Cuff', 'Deltoids', 'Upper Back Mobility'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '30 seconds',
    defaultType: 'time',
    defaultReps: null,
    defaultDurationSec: 30,
    defaultRestSec: 15,
    startingPosition: 'Stand tall with feet hip-width apart and arms extended straight out to the sides at shoulder height.',
    instructions: [
      'Make small forward circular motions with your fingertips, gradually increasing to larger circles for 15 seconds.',
      'Reverse the direction and make circles backward for the remaining 15 seconds.',
      'Finish with 5 gentle shoulder rolls back and down.'
    ],
    movementAndBreathing: 'Breathe deeply and smoothly throughout the rotation.',
    commonMistakes: [
      'Shrugging shoulders into ears.',
      'Arching lower back.'
    ],
    easierVariation: 'Keep circles small or perform with hands on shoulders.',
    safetyTips: 'Never force range of motion if you feel a pinch in the shoulder joint.',
    animationType: 'arm_circles',
  },
  {
    id: 'warmup_cat_cow',
    name: 'Cat-Cow Spinal Stretch',
    category: 'Warm-up and stretching',
    primaryMuscles: ['Spine Mobility', 'Back', 'Abdominals', 'Neck'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '8–10 breath cycles',
    defaultType: 'reps',
    defaultReps: 8,
    defaultDurationSec: null,
    defaultRestSec: 15,
    startingPosition: 'Start on your hands and knees in tabletop position. Wrists directly under shoulders, knees directly under hips.',
    instructions: [
      'Cow Pose (Inhale): Drop your belly gently toward the mat, lift your chest and tailbone, and look gently upward.',
      'Cat Pose (Exhale): Press into your hands, round your spine toward the ceiling like an arched cat, and tuck your chin toward your chest.',
      'Flow smoothly between Cow and Cat with each breath.'
    ],
    movementAndBreathing: 'Inhale on Cow (belly drops, chest opens); exhale on Cat (spine arches, core tucks).',
    commonMistakes: [
      'Rushing the movement without breathing.',
      'Hyperextending the neck aggressively.'
    ],
    easierVariation: 'Seated Cat-Cow on a chair.',
    safetyTips: 'Keep movements gentle and fluid. Never force painful spinal angles.',
    animationType: 'cat_cow',
  },
  {
    id: 'warmup_childs_pose',
    name: "Child's Pose",
    category: 'Warm-up and stretching',
    primaryMuscles: ['Lats', 'Lower Back', 'Hips', 'Shoulders'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '30–60 seconds hold',
    defaultType: 'time',
    defaultReps: null,
    defaultDurationSec: 45,
    defaultRestSec: 15,
    startingPosition: 'Kneel on the mat, big toes touching, knees wide (hip-width or mat-width).',
    instructions: [
      'Sit your hips back toward your heels.',
      'Walk your hands forward on the mat, extending your arms long.',
      'Rest your forehead gently on the mat and relax your chest down between your thighs.',
      'Take deep, belly-expanding breaths into your ribcage and lower back.'
    ],
    movementAndBreathing: 'Breathe deeply into your back ribs. Inhale expansion, exhale release.',
    commonMistakes: [
      'Forcing hips onto heels if knees are tight.',
      'Tensing shoulders and neck.'
    ],
    easierVariation: 'Place a rolled towel or pillow between your calves and thighs to ease knee angle.',
    safetyTips: 'A restful, calming stretch. Do not force if knees or hips feel pinched.',
    animationType: 'childs_pose',
  },
  {
    id: 'warmup_standing_quad_stretch',
    name: 'Standing Quad Stretch',
    category: 'Warm-up and stretching',
    primaryMuscles: ['Quadriceps', 'Hip Flexors'],
    equipment: 'bodyweight',
    difficulty: 'Beginner',
    recommendedReps: '30s each side',
    defaultType: 'time',
    defaultReps: null,
    defaultDurationSec: 30,
    defaultRestSec: 15,
    startingPosition: 'Stand tall near a wall or chair for balance support.',
    instructions: [
      'Shift weight onto your left foot.',
      'Bend your right knee and reach back with your right hand to grasp your right ankle or foot.',
      'Gently draw your right heel toward your glute while keeping knees close together.',
      'Stand tall, tuck your pelvis slightly, and hold for 30 seconds before switching legs.'
    ],
    movementAndBreathing: 'Breathe smoothly and maintain an upright posture.',
    commonMistakes: [
      'Letting the stretching knee wing out to the side.',
      'Arching lower back to compensate.'
    ],
    easierVariation: 'Use a strap or towel looped around the foot if ankle is hard to reach, or perform lying on your side.',
    safetyTips: 'Hold a wall for balance. Never twist the knee joint.',
    animationType: 'quad_stretch',
  },
];

// Add field aliases for UI and tests
EXERCISES.forEach((ex) => {
  if (!ex.target && ex.primaryMuscles) {
    ex.target = ex.primaryMuscles.join(', ');
  }
  if (!ex.breathing && ex.movementAndBreathing) {
    ex.breathing = ex.movementAndBreathing;
  }
});

export const EXERCISE_LIBRARY = EXERCISES;
export const EXERCISE_MAP = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

/**
 * Returns an exercise by ID.
 * @param {string} id
 * @returns {Object|null}
 */
export function getExerciseById(id) {
  if (!id) return null;
  return EXERCISE_MAP[id] || null;
}

/**
 * Filters exercises by search query, category, equipment, and difficulty.
 * @param {Object} [filters]
 * @param {string} [filters.query]
 * @param {string} [filters.searchTerm]
 * @param {string} [filters.category]
 * @param {'all'|'bodyweight'|'dumbbells'} [filters.equipment='all']
 * @param {string} [filters.difficulty='all']
 * @returns {Array<Object>}
 */
export function filterExercises({ query = '', searchTerm = '', category = 'All', equipment = 'all', difficulty = 'all' } = {}) {
  const rawQ = query || searchTerm || '';
  const q = rawQ.trim().toLowerCase();

  return EXERCISES.filter((ex) => {
    // Category match
    if (category && category !== 'All' && category !== 'all' && ex.category.toLowerCase() !== category.toLowerCase()) {
      return false;
    }

    // Equipment match
    if (equipment && equipment !== 'all') {
      const eqLow = equipment.toLowerCase();
      const exEqLow = ex.equipment.toLowerCase();
      if (eqLow === 'bodyweight' && !exEqLow.includes('bodyweight')) return false;
      if (eqLow === 'dumbbells' && !exEqLow.includes('dumbbell') && !exEqLow.includes('3 kg')) return false;
    }

    // Difficulty match
    if (difficulty && difficulty !== 'all' && ex.difficulty.toLowerCase() !== difficulty.toLowerCase()) {
      return false;
    }

    // Text query match
    if (q) {
      const nameMatch = ex.name.toLowerCase().includes(q);
      const catMatch = ex.category.toLowerCase().includes(q);
      const muscleMatch = Array.isArray(ex.primaryMuscles) && ex.primaryMuscles.some((m) => m.toLowerCase().includes(q));
      if (!nameMatch && !catMatch && !muscleMatch) return false;
    }

    return true;
  });
}
