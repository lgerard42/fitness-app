import type { ReactNode } from "react";

interface PhoneMockupProps {
  children?: ReactNode;
  variant?: "workout" | "timer" | "library";
  size?: "sm" | "md" | "lg";
}

function WorkoutScreen() {
  return (
    <div className="h-full bg-white flex flex-col">
      <div className="bg-primary px-4 py-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-accent/20 rounded-full -mr-8 -mt-8 blur-xl" />
        <p className="text-white text-xs font-semibold relative z-10">Full Body Workout</p>
        <p className="text-white/90 text-[10px] relative z-10">Today | 45 min</p>
      </div>

      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        <div className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-neutral-dark">Accpete</p>
            <div className="bg-accent/10 text-accent px-2 py-0.5 rounded-full text-[8px] font-medium">
              &lt; 55 min
            </div>
          </div>
        </div>

        {[
          { name: "Squat", pct: "12%", reps: "3x15", color: "bg-primary" },
          { name: "Bench Press", pct: "15%", reps: "3x15", color: "bg-warning" },
          { name: "Pull-Ups", pct: "30%", reps: "3x15", color: "bg-accent" },
        ].map((ex, i) => (
          <div key={i} className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full ${ex.color} flex items-center justify-center`}>
                <span className="text-white text-[7px] font-bold">{i + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-neutral-dark">{ex.name}</p>
                <div className="flex items-center gap-3 text-[8px] text-gray-400 mt-0.5">
                  <span>Track on hips</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-medium text-neutral-dark">{ex.reps}</p>
                <p className="text-[8px] text-gray-400">{ex.pct}</p>
              </div>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-3 gap-1.5 mt-2">
          <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-100 text-center">
            <p className="text-[8px] text-gray-400">Volume</p>
            <p className="text-[10px] font-bold text-neutral-dark">7,200 lbs</p>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-100 text-center">
            <p className="text-[8px] text-gray-400">Calories</p>
            <p className="text-[10px] font-bold text-neutral-dark">320 kcal</p>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-100 text-center">
            <p className="text-[8px] text-gray-400">Rep</p>
            <p className="text-[10px] font-bold text-neutral-dark">—</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-100 mt-2">
          <p className="text-[8px] text-gray-500 mb-1.5">Progress</p>
          <div className="h-10 flex items-end gap-1">
            {[0.3, 0.45, 0.55, 0.65, 0.72, 0.8, 0.75, 0.88].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-accent rounded-t"
                style={{ height: `${h * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimerScreen() {
  return (
    <div className="h-full bg-neutral-dark flex flex-col items-center justify-center">
      <p className="text-gray-400 text-[10px] mb-1">Rest Timer</p>
      <p className="text-white text-4xl font-bold font-mono">1:30</p>
      <p className="text-gray-400 text-[10px] mt-1">Next: Set 3 of 3</p>
      <div className="mt-3 w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className="w-3/5 h-full bg-primary rounded-full" />
      </div>
      <div className="mt-4 flex gap-3">
        <div className="px-3 py-1 bg-gray-700 rounded-full">
          <span className="text-[9px] text-white">Skip</span>
        </div>
        <div className="px-3 py-1 bg-primary rounded-full">
          <span className="text-[9px] text-white">+30s</span>
        </div>
      </div>
    </div>
  );
}

function LibraryScreen() {
  return (
    <div className="h-full bg-neutral-light flex flex-col">
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <div className="bg-gray-100 rounded-lg px-3 py-1.5">
          <p className="text-[10px] text-gray-400">Search exercises...</p>
        </div>
      </div>
      <div className="flex gap-1.5 px-3 pt-2">
        {["All", "Chest", "Back", "Legs"].map((f) => (
          <div
            key={f}
            className={`px-2 py-0.5 rounded-full text-[8px] font-medium ${f === "All" ? "bg-primary text-white" : "bg-gray-200 text-gray-600"}`}
          >
            {f}
          </div>
        ))}
      </div>
      <div className="flex-1 p-3 space-y-1.5">
        {[
          { name: "Bench Press", cat: "Chest" },
          { name: "Barbell Row", cat: "Back" },
          { name: "Squat", cat: "Legs" },
          { name: "Deadlift", cat: "Back" },
          { name: "OHP", cat: "Shoulders" },
        ].map((ex) => (
          <div key={ex.name} className="bg-white rounded-lg p-2 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-[10px] font-semibold text-neutral-dark">{ex.name}</p>
              <p className="text-[8px] text-gray-400">{ex.cat}</p>
            </div>
            <div className="w-4 h-4 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary text-[8px]">+</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const screens = {
  workout: WorkoutScreen,
  timer: TimerScreen,
  library: LibraryScreen,
};

const sizes = {
  sm: { width: 180, height: 360 },
  md: { width: 240, height: 480 },
  lg: { width: 280, height: 560 },
};

export default function PhoneMockup({
  children,
  variant = "workout",
  size = "md",
}: PhoneMockupProps) {
  const Screen = screens[variant];
  const dims = sizes[size];

  return (
    <div className="relative mx-auto" style={{ width: dims.width, height: dims.height }}>
      <div className="absolute inset-0 bg-neutral-dark rounded-[2.5rem] shadow-2xl border-4 border-gray-800 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-neutral-dark rounded-b-2xl z-10" />
        <div className="absolute inset-[3px] top-6 bottom-2 rounded-[2rem] overflow-hidden bg-white">
          {children || <Screen />}
        </div>
      </div>
    </div>
  );
}
