"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Calendar, Trophy } from "lucide-react";
import { getUserData } from "@/lib/mockData";
import { formatDate, getExercisesFromItems } from "@/lib/utils";
import type { DashboardData, Workout } from "@/types";
import Badge from "@/components/ui/Badge";

export default function HistoryPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d" | "90d">(
    "all"
  );

  useEffect(() => {
    getUserData().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const now = Date.now();
  const filterMs = {
    all: Infinity,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
  };

  const filteredWorkouts = data.workoutHistory.filter(
    (w) => now - (w.finishedAt || w.startedAt) <= filterMs[dateFilter]
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-neutral-dark">
          Workout History
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Review your past training sessions.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {(["all", "7d", "30d", "90d"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              dateFilter === f
                ? "bg-primary text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f === "all" ? "All Time" : `Last ${f.replace("d", " days")}`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredWorkouts.map((workout) => (
          <WorkoutRow
            key={workout.id}
            workout={workout}
            expanded={expandedId === workout.id}
            onToggle={() =>
              setExpandedId(expandedId === workout.id ? null : workout.id)
            }
            personalRecords={data.personalRecords}
          />
        ))}
        {filteredWorkouts.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No workouts found for the selected period.
          </div>
        )}
      </div>
    </div>
  );
}

function WorkoutRow({
  workout,
  expanded,
  onToggle,
  personalRecords,
}: {
  workout: Workout;
  expanded: boolean;
  onToggle: () => void;
  personalRecords: DashboardData["personalRecords"];
}) {
  const exercises = getExercisesFromItems(workout.exercises);
  const prExerciseIds = new Set(personalRecords.map((pr) => pr.exerciseId));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Calendar size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-dark">
              {workout.name}
            </h3>
            {exercises.some((e) => prExerciseIds.has(e.exerciseId)) && (
              <Badge variant="warning">PR</Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {formatDate(workout.finishedAt || workout.startedAt)} &middot;{" "}
            {workout.duration || "—"} &middot; {exercises.length} exercises
          </p>
        </div>
        {expanded ? (
          <ChevronDown size={18} className="text-gray-400" />
        ) : (
          <ChevronRight size={18} className="text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3">
          {exercises.map((ex) => {
            const hasPR = prExerciseIds.has(ex.exerciseId);
            return (
              <div key={ex.instanceId}>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-sm font-medium text-neutral-dark">
                    {ex.name}
                  </p>
                  {hasPR && (
                    <Trophy size={12} className="text-warning" />
                  )}
                </div>
                <div className="bg-neutral-light rounded-xl p-3">
                  <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-400 mb-1.5">
                    <span>Set</span>
                    <span>Weight</span>
                    <span>Reps</span>
                    <span>Type</span>
                  </div>
                  {ex.sets.map((set, i) => (
                    <div
                      key={set.id}
                      className="grid grid-cols-4 gap-2 text-xs text-neutral-dark py-0.5"
                    >
                      <span>{i + 1}</span>
                      <span>{set.weight || "—"} lbs</span>
                      <span>{set.reps || "—"}</span>
                      <span className="text-gray-500">
                        {set.isWarmup
                          ? "Warmup"
                          : set.isDropset
                          ? "Dropset"
                          : "Working"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {workout.sessionNotes && workout.sessionNotes.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
              {workout.sessionNotes.map((note) => (
                <p key={note.id} className="text-xs text-gray-600">
                  {note.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
