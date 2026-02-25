"use client";

import { useDashboard } from "@/lib/dashboard-context";
import GoalCard from "@/components/dashboard/GoalCard";

export default function GoalsPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeGoals = data.goals.filter((g) => !g.completed);
  const completedGoals = data.goals.filter((g) => g.completed);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-neutral-dark">Goals</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track your strength and consistency targets.
        </p>
      </div>

      {activeGoals.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Active Goals
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {activeGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}

      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Completed Goals
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {completedGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}

      {data.goals.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No goals set yet. Create your first goal to start tracking progress.
        </div>
      )}
    </div>
  );
}
