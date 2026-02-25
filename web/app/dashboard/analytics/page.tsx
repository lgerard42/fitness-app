"use client";

import { useState, useMemo } from "react";
import { Trophy } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-context";
import { formatDate } from "@/lib/utils";
import type { ExerciseStats } from "@/types";
import ChartCard from "@/components/dashboard/ChartCard";
import Badge from "@/components/ui/Badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "@/components/dashboard/Charts";

const exerciseOptions: { id: string; label: string }[] = [
  { id: "bench-press", label: "Bench Press" },
  { id: "squat", label: "Barbell Squat" },
  { id: "deadlift", label: "Deadlift" },
  { id: "ohp", label: "Overhead Press" },
  { id: "barbell-row", label: "Barbell Row" },
  { id: "pullup", label: "Pull-ups" },
  { id: "rdl", label: "Romanian Deadlift" },
  { id: "leg-press", label: "Leg Press" },
];

export default function AnalyticsPage() {
  const { data } = useDashboard();
  const [selectedExercise, setSelectedExercise] = useState("bench-press");

  const stats: ExerciseStats | null = data?.exerciseStats[selectedExercise] || null;

  const weightData = useMemo(() => {
    if (!stats) return [];
    return stats.history
      .slice()
      .reverse()
      .map((h) => {
        const maxWeight = Math.max(
          ...h.sets.map((s) => parseFloat(s.weight) || 0)
        );
        return { date: formatDate(h.date), weight: maxWeight };
      });
  }, [stats]);

  const repData = useMemo(() => {
    if (!stats) return [];
    return stats.history
      .slice()
      .reverse()
      .map((h) => {
        const maxReps = Math.max(
          ...h.sets.map((s) => parseInt(s.reps) || 0)
        );
        return { date: formatDate(h.date), reps: maxReps };
      });
  }, [stats]);

  const prTimeline = useMemo(() => {
    if (!data) return [];
    return data.personalRecords
      .filter((pr) => pr.exerciseId === selectedExercise)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data, selectedExercise]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const label =
    exerciseOptions.find((e) => e.id === selectedExercise)?.label ||
    selectedExercise;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-neutral-dark">
          Exercise Analytics
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Deep dive into your exercise performance.
        </p>
      </div>

      <div className="mb-6">
        <label
          htmlFor="exercise-select"
          className="block text-sm font-medium text-neutral-dark mb-2"
        >
          Select Exercise
        </label>
        <select
          id="exercise-select"
          value={selectedExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
          className="w-full max-w-xs px-4 py-3 rounded-xl border border-gray-200 bg-white text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary"
        >
          {exerciseOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {stats && (
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <Trophy size={18} className="text-warning" />
            <div>
              <p className="text-xs text-gray-500">Personal Record</p>
              <p className="text-lg font-extrabold text-neutral-dark">
                {stats.pr} lbs
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">Last Performed</p>
            <p className="text-sm font-semibold text-neutral-dark">
              {stats.lastPerformed ? formatDate(stats.lastPerformed) : "—"}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">Sessions Tracked</p>
            <p className="text-sm font-semibold text-neutral-dark">
              {stats.history.length}
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Weight Progression" subtitle={label}>
          {weightData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#FF6B35"
                  strokeWidth={2.5}
                  dot={{ fill: "#FF6B35", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              No data available
            </div>
          )}
        </ChartCard>

        <ChartCard title="Rep Progression" subtitle={label}>
          {repData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={repData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="reps"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ fill: "#10B981", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              No data available
            </div>
          )}
        </ChartCard>
      </div>

      {prTimeline.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="text-sm font-semibold text-neutral-dark mb-4">
            PR Timeline
          </h3>
          <div className="space-y-3">
            {prTimeline.map((pr) => (
              <div
                key={pr.date}
                className="flex items-center gap-4"
              >
                <div className="w-2 h-2 bg-warning rounded-full flex-shrink-0" />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-neutral-dark">
                    {formatDate(pr.date)}
                  </span>
                  <Badge variant="warning">
                    {pr.weight} {pr.weightUnit}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && stats.history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-neutral-dark mb-4">
            Historical Sets
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-left py-2 pr-4">Set</th>
                  <th className="text-left py-2 pr-4">Weight</th>
                  <th className="text-left py-2 pr-4">Reps</th>
                  <th className="text-left py-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {stats.history
                  .slice()
                  .reverse()
                  .flatMap((h, hi) =>
                    h.sets.map((s, si) => (
                      <tr
                        key={`${hi}-${si}`}
                        className="border-b border-gray-50"
                      >
                        <td className="py-2 pr-4 text-gray-500">
                          {si === 0 ? formatDate(h.date) : ""}
                        </td>
                        <td className="py-2 pr-4">{si + 1}</td>
                        <td className="py-2 pr-4 font-medium">
                          {s.weight} lbs
                        </td>
                        <td className="py-2 pr-4">{s.reps}</td>
                        <td className="py-2">
                          {s.isWarmup ? (
                            <Badge variant="neutral">Warmup</Badge>
                          ) : s.isFailure ? (
                            <Badge variant="warning">Failure</Badge>
                          ) : (
                            <Badge variant="accent">Working</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
