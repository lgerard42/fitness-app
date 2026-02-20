import type { UserGoal } from "@/types";
import ProgressBar from "@/components/ui/ProgressBar";
import Badge from "@/components/ui/Badge";
import { Target, Dumbbell } from "lucide-react";

interface GoalCardProps {
  goal: UserGoal;
}

export default function GoalCard({ goal }: GoalCardProps) {
  const isStrength = goal.type === "strength";
  const progress = goal.currentProgress || 0;
  const target = isStrength
    ? goal.targetWeight || 0
    : goal.targetWorkoutsPerWeek || 0;
  const percent = target > 0 ? Math.round((progress / target) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            {isStrength ? (
              <Dumbbell size={18} className="text-primary" />
            ) : (
              <Target size={18} className="text-primary" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-dark">
              {isStrength ? goal.exerciseName : "Weekly Workouts"}
            </h4>
            <p className="text-xs text-gray-500">
              {isStrength
                ? `Target: ${goal.targetWeight} ${goal.targetWeightUnit}`
                : `Target: ${goal.targetWorkoutsPerWeek}x per week`}
            </p>
          </div>
        </div>
        <Badge variant={goal.completed ? "accent" : "primary"}>
          {goal.completed ? "Complete" : `${percent}%`}
        </Badge>
      </div>

      <ProgressBar value={progress} max={target} />

      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>
          Current: {progress}
          {isStrength ? ` ${goal.targetWeightUnit}` : " workouts"}
        </span>
        <span>
          Target: {target}
          {isStrength ? ` ${goal.targetWeightUnit}` : " workouts"}
        </span>
      </div>
    </div>
  );
}
