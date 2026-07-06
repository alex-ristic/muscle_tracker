import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Dumbbell,
  ExternalLink,
  Home,
  Minus,
  Plus,
  RotateCcw,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type WorkoutName = "Upper #1" | "Lower #1" | "Upper #2" | "Lower #2" | "Arms & Weak Points";
type Units = "kg" | "lb";
type SetLog = { weight: string; reps: string; rpe: string; completed: boolean; notes: string };
type Exercise = {
  id: string;
  name: string;
  category: string;
  technique: string;
  warmupSets: string;
  workingSets: number;
  targetReps: string[];
  targetRpe: string;
  earlySetRpe: string;
  lastSetRpe: string;
  restSeconds: number;
  substitutions: { name: string; category: string }[];
  notes: string;
  phase: string;
  sourcePage: number;
  videoUrl?: string;
};
type Workout = { id: string; week: number; name: WorkoutName; phase: string; sourcePage: number; exercises: Exercise[] };
type SessionExercise = Exercise & { originalName: string; setLogs: SetLog[]; substitution?: string };
type WorkoutSession = {
  id: string;
  workoutId: string;
  week: number;
  name: WorkoutName;
  date: string;
  startedAt: string;
  completedAt?: string;
  status: "active" | "completed";
  exercises: SessionExercise[];
  selectedExerciseIndex: number;
  timers: Record<string, { seconds: number; running: boolean; updatedAt: number }>;
};
type AppData = { activeSession: WorkoutSession | null; history: WorkoutSession[]; units: Units };

const workoutOrder: WorkoutName[] = ["Upper #1", "Lower #1", "Upper #2", "Lower #2", "Arms & Weak Points"];

type Row = {
  name: string;
  technique?: string;
  warmup: string;
  sets: number;
  reps: string;
  early: string;
  last: string;
  rest: string;
  subs: string[];
  notes: string;
  category?: string;
};

const blockOneRows: Record<WorkoutName, Row[]> = {
  "Upper #1": [
    row("Cuffed Behind-The-Back Lateral Raise", "Myo-reps", "1-2", 3, "10-12", "~9-10", "10", "~1-2 min", ["Cross-Body Cable Y-Raise", "DB Lateral Raise"], "Raise the cables up and out in a Y motion. Connect with the middle delt fibers as you sweep the weight up and out.", "Cable · Side delts"),
    row("Cross-Body Lat Pull-Around", "Long-length Partials (on all reps of the last set)", "1", 3, "10-12", "~9", "10", "~2-3 min", ["Half-Kneeling 1-Arm Lat Pulldown", "Neutral-Grip Pullup"], "Keep cable and wrist aligned in a straight line. Feel a deep lat stretch at the top.", "Cable · Lats"),
    row("Low Incline Smith Machine Press", "Pec Static Stretch (30 sec hold)", "2-3", 4, "8-10", "~8-9", "~9-10", "~2-3 min", ["Low Incline Machine Press", "Low Incline DB Press"], "Set bench around a 15 degree incline. Pause 1 second on the chest while maintaining pec tension.", "Smith · Chest"),
    row("Chest-Supported Machine Row", "Long-length Partials (on all reps of the last set)", "1-2", 3, "8-10", "~9", "10", "~2-3 min", ["Chest-Supported T-Bar Row", "Helms Row"], "Flare elbows roughly 45 degrees and squeeze shoulder blades hard at the top.", "Machine · Back"),
    row("Overhead Cable Triceps Extension (Bar)", "Dropset", "1", 2, "8-10", "~9-10", "10", "~2-3 min", ["Overhead Cable Triceps Extension (Rope)", "DB Skull Crusher"], "Feel a deep triceps stretch through the negative. Pause 1 second in the stretched part.", "Cable · Triceps"),
    row("Straight-Bar Lat Prayer", "Long-length Partials (on all reps of the last set)", "1", 3, "12-15", "~9-10", "10", "~1-2 min", ["Machine Lat Pullover", "DB Lat Pullover"], "Lean forward for a big lat stretch at the top, then stand upright as you squeeze at the bottom.", "Cable · Lats"),
    row("Pec Deck (w/ Integrated Partials)", "Integrated Partials (on all sets)", "1", 3, "12-15", "~8-9", "10", "~1-2 min", ["Bent-Over Cable Pec Flye (w/ Integrated Partials)", "DB Flye (w/ Integrated Partials)"], "Alternate full-ROM and half-ROM reps in the stretched/bottom half until target reps and RPE 9-10.", "Machine · Chest"),
  ],
  "Lower #1": [
    row("Seated Leg Curl", "N/A", "1-2", 3, "8-10", "~9", "10", "~2-3 min", ["Lying Leg Curl", "Nordic Ham Curl"], "Lean forward over the machine to get a maximum hamstring stretch.", "Machine · Hamstrings"),
    row("Machine Hip Adduction", "N/A", "1", 3, "10-12", "~9", "10", "~1-2 min", ["Cable Hip Adduction", "Copenhagen Hip Adduction"], "Mind-muscle connection with your inner thighs. Push hard.", "Machine · Adductors"),
    row("Hack Squat", "N/A", "2-4", 3, "4, 6, 8", "~9", "~9", "~3-5 min", ["Machine Squat", "Front Squat"], "Reverse pyramid: heaviest set first, then reduce load 10-15% for 6 reps and again for 8 reps.", "Machine · Quads"),
    row("Leg Extension", "Long-length Partials (on all reps of the last set)", "1-2", 3, "10-12", "~9", "10", "~1-2 min", ["DB Step-Up", "Reverse Nordic"], "Use a 2-3 second negative and feel quads pull apart on the negative.", "Machine · Quads"),
    row("Leg Press Calf Press", "Calf Static Stretch (30 sec)", "1", 3, "12-15", "~9-10", "10", "~1-2 min", ["Donkey Calf Raise", "Seated Calf Raise"], "Pause 1-2 seconds at the bottom. Roll your ankle back and forth on the balls of your feet.", "Machine · Calves"),
  ],
  "Upper #2": [
    row("Super-ROM Overhand Cable Row", "N/A", "1-2", 3, "10-12", "~9", "10", "~1-2 min", ["Overhand Machine Row", "Arm-Out Single-Arm DB Row"], "Use a double overhand grip, lean forward on the negative, then extend torso to upright as you finish.", "Cable · Back"),
    row("Machine Shoulder Press", "Dropset", "2-3", 3, "10-12", "~9", "10", "~1-2 min", ["Cable Shoulder Press", "Seated DB Shoulder Press"], "Elbows break at least 90 degrees. Smooth controlled reps.", "Machine · Delts"),
    row("Assisted Pull-Up", "Long-length Partials (on all reps of the last set)", "1-2", 3, "8-10", "~9", "10", "~2-3 min", ["Lat Pulldown", "Machine Pulldown"], "Slow 2-3 second negative. Drive elbows down and keep form tight.", "Assisted · Lats"),
    row("Paused Assisted Dip", "N/A", "2", 3, "8-10", "~8-9", "10", "~2-3 min", ["Decline Machine Chest Press", "Decline Barbell Press"], "Slow negative, pause at the bottom, explode with control on the way up.", "Assisted · Chest"),
    row("Inverse DB Zottman Curl", "N/A", "1", 2, "10-12", "~9-10", "10", "~1-2 min", ["Slow-Eccentric DB Curl", "Hammer Curl"], "Hammer curl up, turn palms up at the top, lower with palms-up grip.", "Dumbbell · Biceps"),
    row("Super-ROM DB Lateral Raise", "N/A", "1", 3, "12-15", "~9-10", "10", "~0.5-1 min", ["Cable Upright Row", "DB Lateral Raise"], "Raise until hands are overhead, stopping if shoulder pain occurs.", "Dumbbell · Side delts"),
    row("Cable Reverse Flye (Mechanical Dropset)", "Mechanical Dropset (on all sets)", "0", 3, "5,4,3+", "~9-10", "10", "~1-2 min", ["Reverse Pec Deck", "Bent-Over Reverse DB Flye"], "Step back for 5 reps, immediately step forward for 4 reps, then forward again for 3+ reps.", "Cable · Rear delts"),
  ],
  "Lower #2": [
    row("Lying Leg Curl", "Long-length Partials (on all reps of the last set)", "1-2", 3, "8-10", "~9", "10", "~1-2 min", ["Seated Leg Curl", "Nordic Ham Curl"], "Set the machine for the biggest stretch possible, then partial up on the last set.", "Machine · Hamstrings"),
    row("Leg Press", "N/A", "2-4", 3, "8", "~8-9", "~8-9", "~1-2 min", ["Belt Squat", "High-Bar Back Squat"], "Get as deep as possible with controlled tempo. Add a little weight each week at the same rep count.", "Machine · Quads"),
    row("Paused Barbell RDL", "N/A", "2-3", 2, "8", "~6-7", "~7-8", "~3-4 min", ["Paused DB RDL", "Glute-Ham Raise"], "Intentionally lower RPE. One-second pause at the bottom while keeping hamstring tension.", "Barbell · Hamstrings"),
    row("A1: Machine Hip Adduction", "N/A", "1", 3, "10-12", "~9-10", "10", "~0.5-1 min", ["Cable Hip Adduction", "Copenhagen Hip Adduction"], "Mind-muscle connection with inner thighs. Push hard.", "Machine · Adductors"),
    row("A2: Sissy Squat", "N/A", "1", 3, "10-12", "~7-8", "~7-8", "~0.5-1 min", ["Leg Extension", "Goblet Squat"], "Come onto toes and push knees forward past toes. Stop if knee pain occurs.", "Bodyweight · Quads"),
    row("Standing Calf Raise", "Calf Static Stretch (30 sec)", "1", 3, "10-12", "~9-10", "10", "~1-2 min", ["Leg Press Calf Press", "Donkey Calf Raise"], "Pause 1-2 seconds at the bottom and roll the ankle back and forth.", "Machine · Calves"),
  ],
  "Arms & Weak Points": [
    row("Weak Point Exercise 1", "N/A", "1-3", 3, "8-12", "~9", "~9-10", "~1-3 min", ["See Weak Point Table", "See Weak Point Table"], "Choose one exercise from Exercise #1 in the Weak Points Table.", "Weak point"),
    row("Weak Point Exercise 2 (optional)", "N/A", "1-3", 2, "8-12", "~9", "~9-10", "~1-3 min", ["See Weak Point Table", "See Weak Point Table"], "Optional second weak-point movement if recovered.", "Weak point"),
    row("Bayesian Cable Curl", "Long-length Partials (on all reps of the last set)", "1", 3, "10-12", "~9-10", "10", "~1-2 min", ["DB Incline Curl", "DB Scott Curl"], "Do one arm at a time for imbalances, matching reps arm to arm.", "Cable · Biceps"),
    row("Seated DB French Press", "N/A", "1", 3, "10", "~9-10", "10", "~1-2 min", ["EZ-Bar Skull Crusher", "DB Skull Crusher"], "Deep triceps stretch at the bottom. Avoid pausing at the top.", "Dumbbell · Triceps"),
    row("Bottom-2/3 Constant Tension Preacher Curl", "N/A", "1", 2, "12-15", "~9-10", "10", "~1-2 min", ["Bottom-2/3 EZ-Bar Curl", "Spider Curl"], "Stay in the bottom 2/3 of the curl without squeezing to the top.", "Machine · Biceps"),
    row("Cable Triceps Kickback", "N/A", "0", 2, "12-15", "~9-10", "10", "~1-2 min", ["Bench Dip", "DB Triceps Kickback"], "At full squeeze, shoulder should be behind your torso.", "Cable · Triceps"),
    row("Cable Crunch", "N/A", "1", 3, "10-12", "~9-10", "10", "~1-2 min", ["Machine Crunch", "Plate-Weighted Crunch"], "Round the lower back as you crunch and keep a mind-muscle connection with abs.", "Cable · Abs"),
  ],
};

const blockTwoRows: Record<WorkoutName, Row[]> = {
  "Upper #1": [
    row("Cuffed Behind-The-Back Lateral Raise", "Myo-reps", "1-2", 3, "10-12", "~9-10", "10", "~1-2 min", ["Cross-Body Cable Y-Raise", "DB Lateral Raise"], "Raise cables in a Y motion and connect with middle delts.", "Cable · Side delts"),
    row("Lat-Focused Cable Row", "Lat Static Stretch (30 sec hold)", "1", 3, "10-12", "~9", "10", "~2-3 min", ["Half-Kneeling 1-Arm Lat Pulldown", "Elbows-In 1-Arm DB Row"], "Keep torso locked, drive elbows down and back, and keep elbows tucked.", "Cable · Lats"),
    row("Low Incline DB Press", "N/A", "2-3", 3, "8-10", "~9", "10", "~2-3 min", ["Low Incline Machine Press", "Low Incline Barbell Press"], "Slight elbow tuck on the negative, then flare as you press.", "Dumbbell · Chest"),
    row("Chest-Supported T-Bar Row + Kelso Shrug", "N/A", "2", 3, "8-10 + 4-6", "~9", "10", "~2-3 min", ["Machine Chest-Supported Row + Kelso Shrug", "Incline Chest-Supported DB Row + Kelso Shrug"], "Do 8-10 T-bar rows, then 4-6 Kelso shrugs without resting.", "Machine · Back"),
    row("Bent-Over Cable Pec Flye (w/ Integrated Partials)", "Integrated Partials (on all sets)", "1", 3, "12-15", "~8-9", "10", "~1-2 min", ["Pec Deck (w/ Integrated Partials)", "DB Flye (w/ Integrated Partials)"], "Lean forward until torso is parallel with floor. Stretch and squeeze pecs.", "Cable · Chest"),
    row("1-Arm Lat Pull-In", "Long-length Partials (on all reps of the last set)", "1", 2, "12-15", "~9-10", "10", "~1-2 min", ["Wide-Grip Lat Pulldown", "Wide-Grip Band-Assisted Pull-Up"], "Pull cable in from the side and keep a mind-muscle connection with lats.", "Cable · Lats"),
    row("Dual-Cable Triceps Press", "N/A", "1-2", 3, "10-12", "~8-9", "10", "~2-3 min", ["Overhead Cable Triceps Extension (Bar)", "DB Skull Crusher"], "Press forward from chin level, not overhead like a standard extension.", "Cable · Triceps"),
  ],
  "Lower #1": [
    row("Seated Leg Curl", "N/A", "1-2", 3, "8-10", "~9", "10", "~2-3 min", ["Lying Leg Curl", "Nordic Ham Curl"], "Lean forward over the machine to maximize hamstring stretch.", "Machine · Hamstrings"),
    row("Machine Hip Adduction", "N/A", "1", 3, "10-12", "~9", "10", "~1-2 min", ["Cable Hip Adduction", "Copenhagen Hip Adduction"], "Mind-muscle connection with inner thighs.", "Machine · Adductors"),
    row("Smith Machine Squat", "N/A", "2-4", 3, "4, 6, 8", "~9", "~9", "~3-5 min", ["Machine Squat", "DB Bulgarian Split Squat"], "Reverse pyramid: heaviest set first, then reduce load 10-15% for 6 and 8 reps.", "Smith · Quads"),
    row("Leg Extension", "Long-length Partials (on all reps of the last set)", "1-2", 3, "10-12", "~9", "10", "~1-2 min", ["DB Step-Up", "Reverse Nordic"], "Use a 2-3 second negative.", "Machine · Quads"),
    row("DB Calf Jumps", "N/A", "1", 3, "12-15", "~9-10", "10", "~1-2 min", ["Leg Press Calf Jumps", "Standing Calf Raise"], "Drive the jump using mostly calves and ankles without leaving the floor.", "Dumbbell · Calves"),
  ],
  "Upper #2": [
    row("Dual-Handle Lat Pulldown (Mid-back + Lats)", "N/A", "1-2", 3, "10-12", "~9", "10", "~2-3 min", ["Overhand Lat Pulldown", "Pull-Up"], "Lean back around 15 degrees and drive elbows down while squeezing shoulder blades.", "Cable · Back"),
    row("Seated DB Shoulder Press", "N/A", "2-3", 3, "10-12", "~9", "10", "~1-2 min", ["Seated Barbell Shoulder Press", "Standing DB Arnold Press"], "Rotate dumbbells slightly on the negative and flare elbows out as you push.", "Dumbbell · Delts"),
    row("Chest-Supported Machine Row", "Long-length Partials (on all reps of the last set)", "1-2", 3, "8-10", "~9", "10", "~2-3 min", ["Chest-Supported T-Bar Row", "Helms Row"], "Flare elbows around 45 degrees and squeeze shoulder blades hard.", "Machine · Back"),
    row("Decline Machine Chest Press", "N/A", "2", 3, "8-10", "~8-9", "10", "~2-3 min", ["Decline Smith Machine Press", "Decline Barbell Press"], "Feel lower pecs stretching on the negative.", "Machine · Chest"),
    row("Concentration Cable Curl", "N/A", "1", 2, "10-12", "~9-10", "10", "~1-2 min", ["DB Concentration Curl", "DB Preacher Curl"], "Place working elbow against knee and curl strictly.", "Cable · Biceps"),
    row("Cross-Body Cable Y-Raise", "N/A", "1", 3, "10-12", "~9", "10", "~2-3 min", ["Machine Lateral Raise", "DB Lateral Raise"], "Draw a sword on the positive and sweep across your body.", "Cable · Side delts"),
    row("Rear Delt 45 Degree Cable Flye", "N/A", "1", 3, "12-15", "~9-10", "10", "~1-2 min", ["DB Rear Delt Swing", "Bent-Over Reverse DB Flye"], "Pull one arm at a time and align the arm and cable at the bottom.", "Cable · Rear delts"),
  ],
  "Lower #2": [
    row("Lying Leg Curl", "Long-length Partials (on all reps of the last set)", "1-2", 3, "8-10", "~9", "10", "~1-2 min", ["Seated Leg Curl", "Nordic Ham Curl"], "Use the biggest stretch possible and partial up on the last set.", "Machine · Hamstrings"),
    row("Smith Machine Reverse Lunge", "N/A", "2-4", 3, "8", "~8-9", "~8-9", "~1-2 min", ["DB Reverse Lunge", "DB Walking Lunge"], "Set one leg back on the negative and drive up with the front leg.", "Smith · Legs"),
    row("Glute-Ham Raise", "N/A", "2-3", 3, "8", "~8-9", "~9-10", "~3-4 min", ["Nordic Ham Curl", "Seated Leg Curl"], "Cut the top 25% of ROM and control the negative.", "Bodyweight · Hamstrings"),
    row("A1: Machine Hip Adduction", "N/A", "1", 3, "10-12", "~9-10", "10", "N/A", ["Cable Hip Adduction", "Copenhagen Hip Adduction"], "Mind-muscle connection with inner thighs.", "Machine · Adductors"),
    row("A2: Machine Hip Abduction", "N/A", "1", 3, "10-12", "~9-10", "10", "N/A", ["Cable Hip Abduction", "Lateral Band Walk"], "Use pads to increase ROM and stretch glutes further.", "Machine · Glutes"),
    row("Standing Calf Raise", "Calf Static Stretch (30 sec)", "1", 3, "10-12", "~9-10", "10", "~1-2 min", ["Seated Calf Raise", "Leg Press Calf Press"], "Pause 1-2 seconds at the bottom.", "Machine · Calves"),
  ],
  "Arms & Weak Points": [
    row("Weak Point Exercise 1", "N/A", "1-3", 3, "8-12", "~9", "~9-10", "~1-3 min", ["See Weak Point Table", "See Weak Point Table"], "Choose one exercise from Exercise #1 in the Weak Points Table.", "Weak point"),
    row("Weak Point Exercise 2 (optional)", "N/A", "1-3", 2, "8-12", "~9", "~9-10", "~1-3 min", ["See Weak Point Table", "See Weak Point Table"], "Optional second weak-point movement if recovered.", "Weak point"),
    row("Slow-Eccentric EZ-Bar Skull Crusher", "N/A", "1", 3, "10-12", "~9-10", "10", "~1-2 min", ["Slow-Eccentric DB Skull Crusher", "Slow-Eccentric DB French Press"], "Use a 3-4 second negative and comfortable grip.", "Barbell · Triceps"),
    row("Slow-Eccentric Bayesian Curl", "Long-length Partials (on all reps of the last set)", "1", 3, "10-12", "~9-10", "10", "~1-2 min", ["Slow-Eccentric DB Incline Curl", "Slow-Eccentric DB Scott Curl"], "Use a 3-4 second negative and slight pause at the bottom.", "Cable · Biceps"),
    row("Triceps Diverging Pressdown (Long Rope or 2 Ropes)", "N/A", "1", 2, "12-15", "~9-10", "10", "~1-2 min", ["Cable Triceps Kickback", "DB Triceps Kickback"], "Lean forward, flare elbows slightly, and press down for a full squeeze.", "Cable · Triceps"),
    row("Reverse-Grip Cable Curl", "N/A", "0", 2, "12-15", "~9-10", "10", "~1-2 min", ["Reverse-Grip EZ-Bar Curl", "Reverse-Grip DB Curl"], "Palms down curl for forearm, brachialis, and biceps.", "Cable · Biceps"),
    row("Roman Chair Leg Raise", "N/A", "0", 3, "10-20", "~9-10", "10", "~1-2 min", ["Hanging Leg Raise", "Reverse Crunch"], "Curl legs up with controlled form; 10-20 reps is broad, stop 0-1 reps shy of failure.", "Bodyweight · Abs"),
  ],
};

const programNotes = [
  "General warm-up: 5-10 minutes of light cardio, then arm swings, arm circles, front-to-back leg swings, side-to-side leg swings, and optional cable external rotations.",
  "Exercise-specific warm-up: 1 listed warm-up set uses ~60% working weight for ~5-10 reps; 2 listed sets use ~50% for 6-10 reps then ~70% for 4-6 reps; 3 listed sets use ~45%, ~65%, and ~85%.",
  "Most sets are pushed to RPE 9-10. Early sets are the working sets before the last set and are slightly easier. Last sets are pushed to failure or very close to failure.",
  "The Arms & Weak Points day uses the Weak Points Table: shoulders, lats, quads, glutes, chest, neck, hamstrings, calves, mid-back, traps, abs, biceps, and triceps guidance.",
];

const exerciseVideoLinks: Record<string, string> = {
  "Cuffed Behind-The-Back Lateral Raise": "https://youtu.be/fjiOCmFljDM?si=TxwJmdncu-onLNsF",
  "Cross-Body Lat Pull-Around": "https://youtu.be/8W67lZ5mwTU?si=3jxCmDT77ppXpDvT",
  "Low Incline Smith Machine Press": "https://youtu.be/2ITgeRy2z2s?si=wFlTEbkXoRJkYRvz",
  "Chest-Supported Machine Row": "https://youtu.be/ijsSiWSzYw0?si=JYGaODrjE_2K16Ae",
  "Overhead Cable Triceps Extension (Bar)": "https://youtu.be/9_I1PqZAjdA?si=U0aSdMcGIqZ2j7QO",
  "Straight-Bar Lat Prayer": "https://youtu.be/YrcnBlH8XDA?si=RRwVN8LFK-5vsCty",
  "Pec Deck (w/ Integrated Partials)": "https://youtu.be/NPa8YvUg4CM?si=H2nDPxFyjuYfNYTx",
  "Seated Leg Curl": "https://youtu.be/yv0aAY7M1mk?si=Zhynbb5UeoDeX-LG",
  "Machine Hip Adduction": "https://youtu.be/FMSCZYu1JhE?si=EA5cutQ9dlmS2el7",
  "Hack Squat": "https://youtu.be/TWUnnDK8rck?si=69NgWA8gX5DnxLiD",
  "Leg Extension": "https://youtu.be/uFbNtqP966A?si=tIIycjTli2eLzbpO",
  "Leg Press Calf Press": "https://youtu.be/S6DTPNZ_-F4?si=h7Q-AtmWMjDFKDuk",
  "Super-ROM Overhand Cable Row": "https://youtu.be/a7AH8W7dQIw?si=VkNCW_LmsqEnVpTD",
  "Machine Shoulder Press": "https://youtu.be/SCQVmN1gYsk?si=ttFjHmo_Eqg3aR0p",
  "Assisted Pull-Up": "https://youtu.be/iZQNHZuvfUQ?si=8ebn7wUmQ1vJwZRL",
  "Paused Assisted Dip": "https://youtu.be/RyGOGviYWts?si=nOd_d4vlpKtuHOdV",
  "Inverse DB Zottman Curl": "https://youtu.be/jBIvbpyb99M?si=at2OKKwzY8WzQ4ov",
  "Super-ROM DB Lateral Raise": "https://youtu.be/nW5pGot-Hok?si=ymzx8u6fRDryenZY",
  "Cable Reverse Flye (Mechanical Dropset)": "https://youtu.be/nN5RV1arpfM?si=Kb3zbrqF-p9anZDr",
  "Lying Leg Curl": "https://youtu.be/sX4tGtcc62k?si=E8ALWRgGbpRJ7VfJ",
  "Leg Press": "https://youtu.be/1yKAQLVV_XI?si=TmSt15Xp7Ge9fUGK",
  "Paused Barbell RDL": "https://youtu.be/74uXdbCYZQY?si=CsPmQPOK5PT9YCdu",
  "A1: Machine Hip Adduction": "https://youtu.be/FMSCZYu1JhE?si=98BxUF5_pWTDK_7l",
  "A2: Sissy Squat": "https://youtu.be/eWAjlO4FWPQ?si=lZtfpO-rTmYVlCyL",
  "Standing Calf Raise": "https://youtu.be/6lR2JdxUh7w?si=Q-X0SE64i0esPVnA",
  "Bayesian Cable Curl": "https://youtu.be/CWH5J_7kzjM?si=xwLwl9AHwNzrFY2W",
  "Seated DB French Press": "https://youtu.be/5KX0EjOTMaI?si=OnM6Lvw2QG62y5R1",
  "Bottom-2/3 Constant Tension Preacher Curl": "https://youtu.be/vHBedP8oeCA?si=o8LO4BAkxHqgR47c",
  "Cable Triceps Kickback": "https://youtu.be/oRxTKRtP8RE?si=UdIwF-QNiQFK9eGk",
  "Cable Crunch": "https://youtu.be/epBrpaGHMcg?si=OIvb-8WsC9MloknI",
  "Lat-Focused Cable Row": "https://youtu.be/w11Kqjm-ycE?si=25XDHBFgvsb29m6-",
  "Low Incline DB Press": "https://youtu.be/YmlMsvNGTKA?si=YTJXm9VTpT54WB8d",
  "Chest-Supported T-Bar Row + Kelso Shrug": "https://youtu.be/qsmjaYao9pA?si=Vwhbe8MMIvSHVziK",
  "Bent-Over Cable Pec Flye (w/ Integrated Partials)": "https://youtu.be/DKaKmnB0BO8?si=HvNkPdWjHv7fo8ND",
  "1-Arm Lat Pull-In": "https://youtu.be/RMGuHVQKOms?si=bjqnhBTAiFEe_tgK",
  "Dual-Cable Triceps Press": "https://youtu.be/SNcQJjXWa_E?si=UZiTPf2ghOdJuo32",
  "Smith Machine Squat": "https://youtu.be/lWIEZ6NxPMk?si=9qt1X34pkXcxwY3c",
  "DB Calf Jumps": "https://youtu.be/JkY3nBTbRac?si=fn81GZUF_nBxvn84",
  "Dual-Handle Lat Pulldown (Mid-back + Lats)": "https://youtu.be/NwQ5Ch5t5Vk?si=FhmXZYZWzhc1IuYn",
  "Seated DB Shoulder Press": "https://youtu.be/B8PB5RPhTWQ?si=H8EH5pfC84uzSzuv",
  "Decline Machine Chest Press": "https://youtu.be/AABuMGK9H28?si=XbX55Fu_xy2k222g",
  "Concentration Cable Curl": "https://youtu.be/BFZyW_7ld0c?si=sOwYf49vy1lvYbzH",
  "Cross-Body Cable Y-Raise": "https://youtu.be/64RFJSCJuN8?si=-HcD7PGHydM7IgwG",
  "Rear Delt 45 Degree Cable Flye": "https://youtu.be/8iXorduqXC8?si=mgwrLTuH8m4XQ6e_",
  "Smith Machine Reverse Lunge": "https://youtu.be/D0KZo_gBsw0?si=ZJrzR0w3TLM5RdAL",
  "Glute-Ham Raise": "https://youtu.be/9ksG-O0ZUto?si=ImU7tObBEnLl7_Sk",
  "A2: Machine Hip Abduction": "https://youtu.be/Jq4YWyLSh_o?si=y-kaP29-rvx17CrS",
  "Slow-Eccentric EZ-Bar Skull Crusher": "https://youtu.be/opVMIWzaNFY?si=RFwr1icpEDg3S7tv",
  "Slow-Eccentric Bayesian Curl": "https://youtu.be/Kf2kXBoIgM0?si=FhH84YShLWdt8rBC",
  "Triceps Diverging Pressdown (Long Rope or 2 Ropes)": "https://youtu.be/20tbMlP71Nc?si=72vCy33atyY38NJc",
  "Reverse-Grip Cable Curl": "https://youtu.be/xtZvYrfw2Is?si=GbWOR37CeDBu8Og-",
  "Roman Chair Leg Raise": "https://youtu.be/irOzFVqJ0IE?si=wWBektiC5l27krGr",
};

function row(name: string, technique: string, warmup: string, sets: number, reps: string, early: string, last: string, rest: string, subs: string[], notes: string, category = "Bodybuilding") {
  return { name, technique, warmup, sets, reps, early, last, rest, subs, notes, category };
}

function makeExercise(source: Row, week: number, workoutName: WorkoutName, index: number, phase: string, sourcePage: number): Exercise {
  const deload = week === 9;
  const earlySetRpe = deload ? lowerRpe(source.early) : source.early;
  const lastSetRpe = deload ? (source.last === "N/A" ? "N/A" : "~8") : source.last;
  return {
    id: `w${week}-${workoutName}-${index}`,
    name: source.name,
    category: source.category ?? "Bodybuilding",
    technique: deload && source.technique !== "N/A" ? "N/A" : source.technique ?? "N/A",
    warmupSets: source.warmup,
    workingSets: source.sets,
    targetReps: splitReps(source.reps, source.sets),
    targetRpe: `${earlySetRpe} early / ${lastSetRpe} last`,
    earlySetRpe,
    lastSetRpe,
    restSeconds: restToSeconds(source.rest),
    substitutions: source.subs.map((s) => ({ name: s, category: source.category ?? "Bodybuilding" })),
    notes: source.notes,
    phase,
    sourcePage,
    videoUrl: exerciseVideoLinks[source.name],
  };
}

const program: Workout[] = Array.from({ length: 9 }, (_, i) => i + 1).flatMap((week) => {
  const sourceWeek = week <= 4 ? week : week + 1;
  const blockRows = week <= 4 ? blockOneRows : blockTwoRows;
  const phase = week <= 4 ? "Block 1: Build Phase" : week <= 8 ? "Block 2: Novelty Phase" : "Semi-Deload Week";
  const firstPdfPage = 6 + (sourceWeek - 1) * workoutOrder.length;
  return workoutOrder.map((name, workoutIndex) => ({
    id: `w${week}-${name.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and").replaceAll("#", "")}`,
    week,
    name,
    phase,
    sourcePage: firstPdfPage + workoutIndex,
    exercises: blockRows[name].map((exercise, index) => makeExercise(exercise, week, name, index, phase, firstPdfPage + workoutIndex)),
  }));
});

const blankData: AppData = { activeSession: null, history: [], units: "kg" };

export default function App() {
  const [data, setData] = useState<AppData>(blankData);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [tab, setTab] = useState<"today" | "workout" | "history" | "settings">("today");
  const [sheet, setSheet] = useState<"start" | "change" | null>(null);
  const [completeSession, setCompleteSession] = useState<WorkoutSession | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [historyMonth, setHistoryMonth] = useState(() => new Date());

  useEffect(() => {
    let alive = true;
    loadData()
      .then((serverData) => {
        if (!alive) return;
        setData(serverData);
        setDataLoaded(true);
        setSyncError("");
      })
      .catch(() => {
        if (!alive) return;
        setDataLoaded(true);
        setSyncError("Could not load VPS data.");
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!dataLoaded) return;
    const timeout = window.setTimeout(() => {
      saveData(data)
        .then(() => setSyncError(""))
        .catch(() => setSyncError("Could not save to VPS."));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [data, dataLoaded]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setData((current) => {
        if (!current.activeSession) return current;
        let changed = false;
        const timers = { ...current.activeSession.timers };
        for (const [id, timer] of Object.entries(timers)) {
          if (timer.running && timer.seconds > 0) {
            const elapsed = Math.floor((Date.now() - timer.updatedAt) / 1000);
            if (elapsed > 0) {
              timers[id] = { ...timer, seconds: Math.max(0, timer.seconds - elapsed), running: timer.seconds - elapsed > 0, updatedAt: Date.now() };
              changed = true;
            }
          }
        }
        return changed ? { ...current, activeSession: { ...current.activeSession, timers } } : current;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const recommendation = useMemo(() => getRecommendation(data.history), [data.history]);
  const active = data.activeSession;

  if (!dataLoaded) {
    return <Shell><main className="screen center"><Dumbbell size={42} /><h1>Loading Tracker</h1><p className="empty">Loading saved data from the VPS.</p></main></Shell>;
  }

  function startWorkout(workout: Workout, date: string) {
    if (data.activeSession) {
      setTab("workout");
      setSheet(null);
      return;
    }
    const session = createSession(workout, date);
    setData((d) => ({ ...d, activeSession: session }));
    setTab("workout");
    setSheet(null);
  }

  function updateActive(updater: (session: WorkoutSession) => WorkoutSession) {
    setData((d) => (d.activeSession ? { ...d, activeSession: updater(d.activeSession) } : d));
  }

  function updateSet(exerciseIndex: number, setIndex: number, patch: Partial<SetLog>) {
    updateActive((session) => {
      const exercises = session.exercises.map((exercise, i) =>
        i === exerciseIndex ? { ...exercise, setLogs: exercise.setLogs.map((set, j) => (j === setIndex ? { ...set, ...patch } : set)) } : exercise,
      );
      return { ...session, exercises };
    });
  }

  function completeWorkout() {
    if (!active) return;
    const completed = { ...active, status: "completed" as const, completedAt: new Date().toISOString() };
    setData((d) => ({ ...d, activeSession: null, history: [completed, ...d.history.filter((s) => s.id !== completed.id)] }));
    setCompleteSession(completed);
  }

  if (completeSession) {
    return <Shell><CompleteScreen session={completeSession} next={getRecommendation([...data.history, completeSession])} onFinish={() => { setCompleteSession(null); setTab("today"); }} onEdit={() => { setData((d) => ({ ...d, activeSession: { ...completeSession, status: "active", completedAt: undefined }, history: d.history.filter((s) => s.id !== completeSession.id) })); setCompleteSession(null); setTab("workout"); }} /></Shell>;
  }

  return (
    <Shell>
      {syncError && <div className="sync-error">{syncError}</div>}
      {tab === "today" && <TodayScreen recommendation={recommendation} history={data.history} onStart={() => setSheet("start")} onChoose={() => setSheet("start")} />}
      {tab === "workout" && (active ? <WorkoutScreen session={active} units={data.units} history={data.history} onUpdateSet={updateSet} onSelect={(i) => updateActive((s) => ({ ...s, selectedExerciseIndex: i }))} onTimer={(id, patch) => updateActive((s) => ({ ...s, timers: { ...s.timers, [id]: { ...s.timers[id], ...patch, updatedAt: Date.now() } } }))} onChange={() => setSheet("change")} onComplete={completeWorkout} onExit={() => setTab("today")} /> : <EmptyWorkout onStart={() => setSheet("start")} />)}
      {tab === "history" && <HistoryScreen history={data.history} selectedDate={selectedDate} setSelectedDate={setSelectedDate} month={historyMonth} setMonth={setHistoryMonth} />}
      {tab === "settings" && <SettingsScreen data={data} setData={setData} />}
      <BottomNav tab={tab} setTab={setTab} hasActive={!!active} />
      {sheet === "start" && <StartSheet recommendation={recommendation} active={active} onClose={() => setSheet(null)} onStart={startWorkout} />}
      {sheet === "change" && active && <ChangeSheet session={active} onClose={() => setSheet(null)} onReplace={(choice) => { replaceExercise(choice, updateActive); setSheet(null); }} />}
    </Shell>
  );
}

function TodayScreen({ recommendation, history, onStart, onChoose }: { recommendation: Workout; history: WorkoutSession[]; onStart: () => void; onChoose: () => void }) {
  const recent = history.slice().sort(byCompleteDesc).slice(0, 3);
  return (
    <main className="screen">
      <Header title="Today" subtitle={longDate(new Date())} />
      <WeekStrip history={history} />
      <section className="hero-card">
        <Kicker label="Next Workout" />
        <div>
          <h2>Week {recommendation.week} · {recommendation.name}</h2>
          <p>{recommendationReason(history)}</p>
        </div>
        <div className="meta-row"><SmallMeta icon={<Dumbbell />} text={`${recommendation.exercises.length} exercises`} /><SmallMeta icon={<Clock3 />} text="~50 min" /></div>
        <button className="primary" onClick={onStart}>Start Workout <ChevronRight size={18} /></button>
        <button className="secondary" onClick={onChoose}>Choose Different Workout</button>
      </section>
      <section className="section">
        <Label>Recent</Label>
        {recent.length ? recent.map((s) => <SessionRow key={s.id} session={s} />) : <p className="empty">No workouts saved yet.</p>}
      </section>
    </main>
  );
}

function StartSheet({ recommendation, active, onClose, onStart }: { recommendation: Workout; active: WorkoutSession | null; onClose: () => void; onStart: (w: Workout, date: string) => void }) {
  const [week, setWeek] = useState(recommendation.week);
  const [name, setName] = useState<WorkoutName>(recommendation.name);
  const [date, setDate] = useState(todayKey());
  const chosen = program.find((w) => w.week === week && w.name === name) ?? recommendation;
  return (
    <Sheet dimTitle="Today" dimSubtitle={longDate(new Date())}>
      <h2 className="sheet-title">Start Workout</h2>
      <button className="recommend-card" onClick={() => { setWeek(recommendation.week); setName(recommendation.name); }}>
        <div className="between"><Kicker label="Recommended" /><span className="check"><Check size={14} /></span></div>
        <h3>Week {recommendation.week} · {recommendation.name}</h3>
        <SmallMeta icon={<Dumbbell />} text={`${recommendation.exercises.length} exercises · ~50 min · ${countSets(recommendation)} sets`} />
      </button>
      <Label>Or choose different</Label>
      <div className="field"><span>Week</span><div className="stepper"><button onClick={() => setWeek(Math.max(1, week - 1))}><ChevronLeft /></button><b>Week {week}</b><button onClick={() => setWeek(Math.min(9, week + 1))}><ChevronRight /></button></div></div>
      <div className="field"><span>Workout</span><div className="chips">{workoutOrder.map((w) => <button key={w} className={w === name ? "chip active" : "chip"} onClick={() => setName(w)}>{w}</button>)}</div></div>
      <div className="field"><span>Date</span><input className="date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="sheet-actions">
        <button className="primary" onClick={() => active ? onStart(chosen, date) : onStart(chosen, date)}>{active ? "Continue Workout" : chosen.id === recommendation.id ? "Start Recommended Workout" : "Start Workout"} <ChevronRight size={18} /></button>
        <button className="secondary" onClick={onClose}>Cancel</button>
      </div>
    </Sheet>
  );
}

function WorkoutScreen(props: { session: WorkoutSession; units: Units; history: WorkoutSession[]; onUpdateSet: (e: number, s: number, p: Partial<SetLog>) => void; onSelect: (i: number) => void; onTimer: (id: string, p: Partial<{ seconds: number; running: boolean }>) => void; onChange: () => void; onComplete: () => void; onExit: () => void }) {
  const { session, units, history, onUpdateSet, onSelect, onTimer, onChange, onComplete, onExit } = props;
  const exercise = session.exercises[session.selectedExerciseIndex];
  const timer = session.timers[exercise.id] ?? { seconds: exercise.restSeconds, running: false, updatedAt: Date.now() };
  const prev = previousPerformance(exercise.name, session.id, history);
  const done = exercise.setLogs.filter((s) => s.completed).length;
  return (
    <main className="screen workout-screen">
      <div className="workout-head"><div><h1>Week {session.week} · {session.name}</h1><p>Exercise {session.selectedExerciseIndex + 1} of {session.exercises.length}</p></div><button className="icon-btn" onClick={onExit}><X size={18} /></button></div>
      <div className="carousel">{session.exercises.map((e, i) => <button key={e.id} onClick={() => onSelect(i)} className={`exercise-tile ${i === session.selectedExerciseIndex ? "active" : ""} ${e.setLogs.every((s) => s.completed) ? "done" : ""}`}><Dumbbell /><span>{i + 1}</span>{e.setLogs.every((s) => s.completed) && <i><Check size={11} /></i>}</button>)}</div>
      <section className="exercise-title"><div><h2>{exercise.name}</h2><p>{exercise.category}</p></div><button className="round-blue" onClick={onChange}><RotateCcw size={18} /></button></section>
      <div className="exercise-meta"><div className="pill warm"><span />{exercise.warmupSets} warm-up · {exercise.technique}</div><div className="timer"><button onClick={() => onTimer(exercise.id, { seconds: Math.max(0, timer.seconds - 15) })}><Minus size={15} /></button><button className="timer-face" onClick={() => onTimer(exercise.id, { running: !timer.running })}><small>Rest</small><b>{formatTimer(timer.seconds)}</b></button><button onClick={() => onTimer(exercise.id, { seconds: timer.seconds + 15 })}><Plus size={15} /></button></div></div>
      <section className="section">
        <div className="between"><Label>Working Sets</Label><span className="done-text">{done} / {exercise.workingSets} done</span></div>
        {exercise.setLogs.map((set, i) => <SetCard key={i} set={set} index={i} exercise={exercise} units={units} current={i === done && !set.completed} onChange={(patch) => onUpdateSet(session.selectedExerciseIndex, i, patch)} />)}
        <div className="set-actions"><button onClick={() => copyPrevious(history, exercise.name, (sets) => sets.forEach((set, i) => onUpdateSet(session.selectedExerciseIndex, i, set)))}>Copy Last</button><button onClick={() => iCopy(session.selectedExerciseIndex, exercise, onUpdateSet)}>Copy Prev Set</button><button onClick={() => { const note = window.prompt("Set note"); if (note !== null) onUpdateSet(session.selectedExerciseIndex, Math.max(0, done - 1), { notes: note }); }}>Add Note</button></div>
      </section>
      <section className="section">
        <div className="between"><Label>Previous Performance</Label>{prev && <span className="source">Week {prev.week} · {prev.name} · {shortDate(prev.date)}</span>}</div>
        <div className="previous-box">{prev ? prev.exercise.setLogs.map((s, i) => <div className="prev-row" key={i}><span>{i + 1}</span><b>{s.weight || "-"} {units} × {s.reps || "-"}</b><em>RPE {s.rpe || "-"}</em></div>) : <p className="empty">No previous data yet.</p>}</div>
      </section>
      <section className="section">
        <Label>Exercise Notes</Label>
        <div className="notes-box">
          <p>{exercise.notes}</p>
          <div><b>Technique</b><span>{exercise.technique}</span></div>
          <VideoLinkRow url={exercise.videoUrl ?? exerciseVideoLinks[exercise.name] ?? exerciseVideoLinks[exercise.originalName]} />
        </div>
      </section>
      <div className="workout-footer"><button className="secondary icon-only" onClick={() => onSelect(Math.max(0, session.selectedExerciseIndex - 1))}><ChevronLeft /></button><button className="primary" onClick={() => session.selectedExerciseIndex === session.exercises.length - 1 ? onComplete() : onSelect(session.selectedExerciseIndex + 1)}>{session.selectedExerciseIndex === session.exercises.length - 1 ? "Complete Workout" : "Next Exercise"} <ChevronRight size={18} /></button></div>
    </main>
  );
}

function SetCard({ set, index, exercise, units, current, onChange }: { set: SetLog; index: number; exercise: SessionExercise; units: Units; current: boolean; onChange: (p: Partial<SetLog>) => void }) {
  const isLastSet = index === exercise.workingSets - 1;
  const setRpe = isLastSet ? exercise.lastSetRpe : exercise.earlySetRpe;
  const setKind = isLastSet ? "last" : "early";
  return (
    <div className={`set-card ${set.completed ? "complete" : ""} ${current ? "current" : ""}`}>
      <div className="between"><div className="set-target"><span>{index + 1}</span>Target: {exercise.targetReps[index] ?? exercise.targetReps.at(-1)} reps @ RPE {setRpe} {setKind}</div></div>
      <div className="set-grid">
        <InputBox value={set.weight} label={units.toUpperCase()} onChange={(v) => onChange({ weight: v })} />
        <InputBox value={set.reps} label="REPS" onChange={(v) => onChange({ reps: v })} />
        <InputBox value={set.rpe} label="RPE" onChange={(v) => onChange({ rpe: v })} />
        <button className={set.completed ? "done-button on" : "done-button"} onClick={() => onChange({ completed: !set.completed })}><Check /></button>
      </div>
      {set.notes && <p className="note">{set.notes}</p>}
    </div>
  );
}

function InputBox({ value, label, onChange }: { value: string; label: string; onChange: (v: string) => void }) {
  return <label className="input-box"><input value={value} inputMode="decimal" onChange={(e) => onChange(e.target.value)} placeholder="-" /><span>{label}</span></label>;
}

function VideoLinkRow({ url }: { url?: string }) {
  const [showCopy, setShowCopy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [longPressed, setLongPressed] = useState(false);
  const [pressTimer, setPressTimer] = useState<number | null>(null);

  function revealCopy() {
    setLongPressed(true);
    setShowCopy(true);
  }

  function clearPressTimer() {
    if (pressTimer !== null) window.clearTimeout(pressTimer);
    setPressTimer(null);
  }

  function openLink() {
    if (!url || longPressed) {
      setLongPressed(false);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="video-link-row">
      <b>Video</b>
      {url ? (
        <span className="video-link-wrap">
          <button
            className="video-link"
            onClick={openLink}
            onContextMenu={(event) => {
              event.preventDefault();
              setShowCopy(true);
            }}
            onPointerDown={() => {
              clearPressTimer();
              setLongPressed(false);
              setPressTimer(window.setTimeout(revealCopy, 550));
            }}
            onPointerUp={clearPressTimer}
            onPointerLeave={clearPressTimer}
            onPointerCancel={clearPressTimer}
          >
            Watch demo <ExternalLink size={15} />
          </button>
          {showCopy && <button className="copy-link" onClick={copyLink}><Copy size={14} />{copied ? "Copied" : "Copy"}</button>}
        </span>
      ) : (
        <span>No video link</span>
      )}
    </div>
  );
}

function ChangeSheet({ session, onClose, onReplace }: { session: WorkoutSession; onClose: () => void; onReplace: (choice: { name: string; category: string; clear: boolean }) => void }) {
  const exercise = session.exercises[session.selectedExerciseIndex];
  const [choice, setChoice] = useState(exercise.substitutions[0]);
  const hasLogs = exercise.setLogs.some((s) => s.weight || s.reps || s.rpe || s.completed || s.notes);
  return (
    <Sheet dimTitle={exercise.name} dimSubtitle={exercise.category}>
      <h2 className="sheet-title">Change Exercise</h2>
      <p className="sheet-copy">Keeps the same sets, reps, RPE targets, rest & notes.</p>
      <div className="current-ex"><Dumbbell /><div><small>Current</small><b>{exercise.name}</b></div><RotateCcw /></div>
      <Label>Substitutions</Label>
      {exercise.substitutions.map((s) => <button key={s.name} className={choice.name === s.name ? "sub-row active" : "sub-row"} onClick={() => setChoice(s)}><Dumbbell /><div><b>{s.name}</b><span>{s.category}</span></div><i>{choice.name === s.name && <Check size={14} />}</i></button>)}
      <button className="primary" onClick={() => onReplace({ ...choice, clear: hasLogs && window.confirm("Clear already logged set data for this exercise? Press Cancel to keep it.") })}>Change to {choice.name}</button>
      <button className="secondary" onClick={onClose}>Cancel</button>
    </Sheet>
  );
}

function HistoryScreen({ history, selectedDate, setSelectedDate, month, setMonth }: { history: WorkoutSession[]; selectedDate: string; setSelectedDate: (d: string) => void; month: Date; setMonth: (d: Date) => void }) {
  const monthSessions = history.filter((s) => sameMonth(parseLocalDate(s.date), month));
  const selectedSessions = history.filter((s) => s.date === selectedDate);
  return (
    <main className="screen">
      <Header title="History" subtitle={`${monthSessions.length} sessions this month`} />
      <div className="month-nav"><button onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft /></button><b>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</b><button onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></button></div>
      <CalendarGrid month={month} history={history} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
      <div className="legend"><span><i className="green" />Completed</span><span><i className="yellow" />Partial</span><span><i />Rest</span></div>
      <section className="section">
        <div className="between"><h3>{longDate(parseLocalDate(selectedDate))}</h3><span className="source">{selectedSessions.length} session{selectedSessions.length === 1 ? "" : "s"}</span></div>
        {selectedSessions.length ? selectedSessions.map((s) => <SessionRow key={s.id} session={s} />) : <p className="empty">No workouts on this date.</p>}
      </section>
    </main>
  );
}

function SettingsScreen({ data, setData }: { data: AppData; setData: (updater: AppData | ((d: AppData) => AppData)) => void }) {
  return (
    <main className="screen">
      <Header title="Settings" subtitle="Program and local data" />
      <section className="settings-card"><Label>Units</Label><div className="segmented"><button className={data.units === "kg" ? "active" : ""} onClick={() => setData((d) => ({ ...d, units: "kg" }))}>kg</button><button className={data.units === "lb" ? "active" : ""} onClick={() => setData((d) => ({ ...d, units: "lb" }))}>lb</button></div></section>
      <section className="settings-card"><Label>Data</Label><button className="secondary" onClick={() => downloadJson(data)}>Export JSON</button><label className="secondary import">Import JSON<input type="file" accept="application/json" onChange={(e) => importJson(e.currentTarget.files?.[0], setData)} /></label><button className="danger" onClick={() => window.confirm("Reset all Muscle Tracker data?") && setData(blankData)}>Reset Data</button></section>
      <section className="settings-card"><Label>Program</Label><p className="program-copy">The Pure Bodybuilding Program · Upper/Lower · 9 weeks · {workoutOrder.length} workouts per week.</p>{programNotes.map((note) => <p className="program-copy" key={note}>{note}</p>)}{program.map((w) => <div className="program-row" key={w.id}>Week {w.week} · {w.name}<span>{w.phase} · PDF p.{w.sourcePage}</span></div>)}</section>
    </main>
  );
}

function CompleteScreen({ session, next, onFinish, onEdit }: { session: WorkoutSession; next: Workout; onFinish: () => void; onEdit: () => void }) {
  const completedSets = session.exercises.flatMap((e) => e.setLogs).filter((s) => s.completed).length;
  const totalSets = session.exercises.reduce((sum, e) => sum + e.workingSets, 0);
  return (
    <main className="screen complete-screen">
      <div className="complete-hero"><div className="big-check"><Check /></div><h1>Workout Complete</h1><p>Week {session.week} · {session.name}</p></div>
      <div className="stat-grid"><Stat icon={<Clock3 />} label="Duration" value={`${durationMin(session)} min`} /><Stat icon={<Check />} label="Sets" value={`${completedSets} / ${totalSets}`} /><Stat icon={<Dumbbell />} label="Exercises" value={`${session.exercises.length}`} /></div>
      <section className="section"><Label>Performance Notes</Label><div className="previous-box">{session.exercises.slice(0, 3).map((e) => <div className="prev-row" key={e.id}><b>{e.name}</b><em>{e.setLogs.filter((s) => s.completed).length}/{e.workingSets} sets</em></div>)}</div><div className="next-card"><Dumbbell /><div><small>Next Recommended</small><b>Week {next.week} · {next.name}</b></div><ChevronRight /></div></section>
      <button className="primary" onClick={onFinish}>Finish</button><button className="secondary" onClick={onEdit}>Edit Workout</button>
    </main>
  );
}

function BottomNav({ tab, setTab, hasActive }: { tab: string; setTab: (t: "today" | "workout" | "history" | "settings") => void; hasActive: boolean }) {
  const items = [["today", Home, "Today"], ["workout", Dumbbell, hasActive ? "Workout" : "Workout"], ["history", CalendarDays, "History"], ["settings", Settings, "Settings"]] as const;
  return <nav className="bottom-nav">{items.map(([id, Icon, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={23} /><span>{label}</span></button>)}</nav>;
}

function Shell({ children }: { children: React.ReactNode }) { return <div className="app-shell">{children}</div>; }
function Header({ title, subtitle }: { title: string; subtitle: string }) { return <header className="header"><h1>{title}</h1><p>{subtitle}</p></header>; }
function Label({ children }: { children: React.ReactNode }) { return <div className="label">{children}</div>; }
function Kicker({ label }: { label: string }) { return <div className="kicker"><span />{label}</div>; }
function SmallMeta({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="small-meta">{icon}<span>{text}</span></div>; }
function Sheet({ children, dimTitle, dimSubtitle }: { children: React.ReactNode; dimTitle: string; dimSubtitle: string }) { return <div className="sheet-wrap"><div className="sheet-dim"><h1>{dimTitle}</h1><p>{dimSubtitle}</p></div><div className="sheet"><div className="grabber" />{children}</div></div>; }
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="stat">{icon}<span>{label}</span><b>{value}</b></div>; }
function EmptyWorkout({ onStart }: { onStart: () => void }) { return <main className="screen center"><Dumbbell size={42} /><h1>No Active Workout</h1><button className="primary" onClick={onStart}>Start Workout</button></main>; }

function SessionRow({ session }: { session: WorkoutSession }) {
  const completed = session.status === "completed";
  const completedSets = session.exercises.flatMap((e) => e.setLogs).filter((s) => s.completed).length;
  return <div className="session-row"><i className={completed ? "green" : "yellow"} /><div><b>Week {session.week} · {session.name}</b><span>{completed ? "Completed" : "Partial"} · {completedSets} sets</span></div><em>{completed ? "Completed" : "Partial"}</em></div>;
}

function WeekStrip({ history }: { history: WorkoutSession[] }) {
  const now = new Date();
  return <div className="week-strip">{Array.from({ length: 7 }, (_, i) => addDays(now, i - 4)).map((date) => { const key = dateKey(date); const has = history.some((s) => s.date === key); const today = key === todayKey(); return <div className={today ? "day active" : "day"} key={key}><span>{date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</span><b>{date.getDate()}</b><i className={has ? "green" : ""} /></div>; })}</div>;
}

function CalendarGrid({ month, history, selectedDate, setSelectedDate }: { month: Date; history: WorkoutSession[]; selectedDate: string; setSelectedDate: (d: string) => void }) {
  const cells = monthCells(month);
  return <div className="calendar"><div className="weekdays">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <b key={d}>{d}</b>)}</div>{cells.map((d, i) => d ? <button key={dateKey(d)} className={selectedDate === dateKey(d) ? "cal-day active" : "cal-day"} onClick={() => setSelectedDate(dateKey(d))}><span>{d.getDate()}</span><i className={history.some((s) => s.date === dateKey(d) && s.status === "completed") ? "green" : ""} /></button> : <div key={`empty-${i}`} className="cal-day empty-cell" />)}</div>;
}

function createSession(workout: Workout, date: string): WorkoutSession {
  const exercises = workout.exercises.map((e) => ({ ...e, originalName: e.name, setLogs: Array.from({ length: e.workingSets }, (_, i) => ({ weight: "", reps: e.targetReps[i] ?? e.targetReps.at(-1) ?? "", rpe: i === e.workingSets - 1 ? e.lastSetRpe.replaceAll("~", "") : e.earlySetRpe.replaceAll("~", ""), completed: false, notes: "" })) }));
  return { id: crypto.randomUUID(), workoutId: workout.id, week: workout.week, name: workout.name, date, startedAt: new Date().toISOString(), status: "active", selectedExerciseIndex: 0, exercises, timers: Object.fromEntries(exercises.map((e) => [e.id, { seconds: e.restSeconds, running: false, updatedAt: Date.now() }])) };
}

function replaceExercise(choice: { name: string; category: string; clear: boolean }, update: (u: (s: WorkoutSession) => WorkoutSession) => void) {
  update((session) => {
    const i = session.selectedExerciseIndex;
    const exercises = session.exercises.map((e, index) => index === i ? { ...e, name: choice.name, category: choice.category, substitution: choice.name, setLogs: choice.clear ? e.setLogs.map(() => ({ weight: "", reps: "", rpe: "", completed: false, notes: "" })) : e.setLogs } : e);
    return { ...session, exercises };
  });
}

function getRecommendation(history: WorkoutSession[]) {
  const completed = history.filter((s) => s.status === "completed").sort(byCompleteDesc)[0];
  if (!completed) return program[0];
  const nextIndex = workoutOrder.indexOf(completed.name) + 1;
  const week = nextIndex >= workoutOrder.length ? (completed.week % 9) + 1 : completed.week;
  const name = workoutOrder[nextIndex % workoutOrder.length];
  return program.find((w) => w.week === week && w.name === name) ?? program[0];
}

function previousPerformance(exerciseName: string, currentId: string, history: WorkoutSession[]) {
  for (const session of history.filter((s) => s.id !== currentId && s.status === "completed").sort(byCompleteDesc)) {
    const exercise = session.exercises.find((e) => e.name === exerciseName || e.originalName === exerciseName);
    if (exercise) return { ...session, exercise };
  }
  return null;
}

function copyPrevious(history: WorkoutSession[], exerciseName: string, apply: (sets: Partial<SetLog>[]) => void) {
  const prev = previousPerformance(exerciseName, "", history);
  if (prev) apply(prev.exercise.setLogs.map(({ weight, reps, rpe }) => ({ weight, reps, rpe })));
}

function iCopy(exerciseIndex: number, exercise: SessionExercise, update: (e: number, s: number, p: Partial<SetLog>) => void) {
  const firstEmpty = exercise.setLogs.findIndex((s) => !s.weight && !s.reps && !s.rpe);
  const target = firstEmpty > 0 ? firstEmpty : 1;
  const previous = exercise.setLogs[target - 1];
  if (previous) update(exerciseIndex, target, { weight: previous.weight, reps: previous.reps, rpe: previous.rpe });
}

async function loadData(): Promise<AppData> {
  const response = await fetch("/api/data", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load data");
  return { ...blankData, ...(await response.json()) };
}

async function saveData(data: AppData) {
  const response = await fetch("/api/data", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to save data");
}

function downloadJson(data: AppData) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "muscle-tracker-export.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importJson(file: File | undefined, setData: (d: AppData) => void) {
  if (!file) return;
  file.text().then((text) => setData({ ...blankData, ...JSON.parse(text) }));
}

function splitReps(reps: string, sets: number) {
  const clean = reps.replaceAll(" ", "");
  const commaParts = clean.split(",").filter(Boolean);
  if (commaParts.length > 1) return Array.from({ length: sets }, (_, i) => commaParts[i] ?? commaParts.at(-1) ?? reps);
  return Array.from({ length: sets }, () => reps);
}

function restToSeconds(rest: string) {
  if (rest === "N/A") return 90;
  if (rest.includes("3-5")) return 240;
  if (rest.includes("3-4")) return 210;
  if (rest.includes("2-3")) return 150;
  if (rest.includes("1-3")) return 120;
  if (rest.includes("1-2")) return 90;
  if (rest.includes("0.5-1")) return 45;
  return 90;
}

function lowerRpe(rpe: string) {
  if (rpe === "N/A") return "N/A";
  if (rpe.includes("6-7")) return "~6";
  if (rpe.includes("7-8")) return "~7";
  if (rpe.includes("8-9")) return "~6-7";
  if (rpe.includes("9-10")) return "~7-8";
  if (rpe.includes("9")) return "~7";
  return "~7-8";
}

function countSets(w: Workout) { return w.exercises.reduce((sum, e) => sum + e.workingSets, 0); }
function durationMin(s: WorkoutSession) { return Math.max(1, Math.round((new Date(s.completedAt ?? new Date()).getTime() - new Date(s.startedAt).getTime()) / 60000)); }
function byCompleteDesc(a: WorkoutSession, b: WorkoutSession) { return new Date(b.completedAt ?? b.startedAt).getTime() - new Date(a.completedAt ?? a.startedAt).getTime(); }
function recommendationReason(history: WorkoutSession[]) { const last = history.filter((s) => s.status === "completed").sort(byCompleteDesc)[0]; return last ? `Because you completed Week ${last.week} · ${last.name} last.` : "Start with the first workout in the program."; }
function formatTimer(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`; }
function todayKey() { return dateKey(new Date()); }
function dateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function parseLocalDate(key: string) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); }
function longDate(d: Date) { return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }); }
function shortDate(key: string) { return parseLocalDate(key).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function addDays(d: Date, days: number) { const copy = new Date(d); copy.setDate(copy.getDate() + days); return copy; }
function addMonths(d: Date, months: number) { const copy = new Date(d); copy.setMonth(copy.getMonth() + months); return copy; }
function sameMonth(a: Date, b: Date) { return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear(); }
function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const blanks = (first.getDay() + 6) % 7;
  return [...Array(blanks).fill(null), ...Array.from({ length: last.getDate() }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
}
