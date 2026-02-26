"use client";

import { useMemo } from "react";
import {
  Dumbbell,
  Flame,
  TrendingUp,
  Trophy,
  Target,
} from "lucide-react";
import { useDashboard } from "@/lib/dashboard-context";
import {
  calculateTotalVolume,
  calculateStreak,
  formatNumber,
  formatDate,
  getExercisesFromItems,
} from "@/lib/utils";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "@/components/dashboard/ChartCard";
import {
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "@/components/dashboard/Charts";

export default function DashboardOverview() {
  const { data, isLoading } = useDashboard();

  const totalVolume = useMemo(
    () => (data ? calculateTotalVolume(data.workoutHistory) : 0),
    [data],
  );

  const streak = useMemo(
    () => (data ? calculateStreak(data.workoutHistory) : 0),
    [data],
  );

  const bestPR = useMemo(
    () =>
      data?.personalRecords.reduce(
        (best, pr) => (pr.weight > best.weight ? pr : best),
        data.personalRecords[0],
      ),
    [data],
  );

  const activeGoals = useMemo(
    () => (data ? data.goals.filter((g) => !g.completed).length : 0),
    [data],
  );

  const volumeData = useMemo(() => {
    if (!data) return [];
    return data.workoutHistory
      .slice()
      .reverse()
      .map((w) => {
        let vol = 0;
        const exercises = getExercisesFromItems(w.exercises);
        for (const ex of exercises) {
          for (const set of ex.sets) {
            if (set.completed && !set.isWarmup) {
              vol += (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);
            }
          }
        }
        return {
          date: formatDate(w.finishedAt || w.startedAt),
          volume: vol,
        };
      });
  }, [data]);

  const frequencyData = useMemo(() => {
    if (!data) return [];
    const frequencyByWeek: Record<string, number> = {};
    data.workoutHistory.forEach((w) => {
      const d = new Date(w.finishedAt || w.startedAt);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = formatDate(weekStart.getTime());
      frequencyByWeek[key] = (frequencyByWeek[key] || 0) + 1;
    });
    return Object.entries(frequencyByWeek)
      .map(([week, count]) => ({ week, count }))
      .reverse();
  }, [data]);

  const oneRmData = useMemo(() => {
    if (!data) return [];
    const benchStats = data.exerciseStats["bench-press"];
    if (!benchStats) return [];
    return benchStats.history
      .slice()
      .reverse()
      .map((h) => {
        const topSet = h.sets.reduce((best, s) => {
          const w = parseFloat(s.weight) || 0;
          return w > (parseFloat(best.weight) || 0) ? s : best;
        }, h.sets[0]);
        const weight = parseFloat(topSet.weight) || 0;
        const reps = parseInt(topSet.reps) || 0;
        const estimated1rm = Math.round(weight * (1 + reps / 30));
        return {
          date: formatDate(h.date),
          "1RM": estimated1rm,
        };
      });
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-neutral-dark">
          Dashboard
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Your training overview at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Total Workouts"
          value={data.workoutHistory.length}
          icon={<Dumbbell size={18} className="text-primary" />}
          trend={{ value: "12%", positive: true }}
        />
        <StatCard
          title="Current Streak"
          value={`${streak} days`}
          icon={<Flame size={18} className="text-primary" />}
        />
        <StatCard
          title="Total Volume"
          value={formatNumber(totalVolume) + " lbs"}
          icon={<TrendingUp size={18} className="text-primary" />}
          trend={{ value: "8%", positive: true }}
        />
        <StatCard
          title="Best PR"
          value={bestPR ? `${bestPR.weight} ${bestPR.weightUnit}` : "—"}
          subtitle={bestPR?.exerciseName}
          icon={<Trophy size={18} className="text-primary" />}
        />
        <StatCard
          title="Active Goals"
          value={activeGoals}
          icon={<Target size={18} className="text-primary" />}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Volume Over Time" subtitle="Total volume per workout">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="volume"
                stroke="#FF6B35"
                strokeWidth={2.5}
                dot={{ fill: "#FF6B35", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Workout Frequency" subtitle="Workouts per week">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={frequencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="#FF6B35"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Estimated 1RM Progression"
          subtitle="Bench Press (Epley formula)"
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={oneRmData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="1RM"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ fill: "#10B981", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
