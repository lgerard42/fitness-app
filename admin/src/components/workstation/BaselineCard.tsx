import React from 'react';
import MuscleTargetTree from '../FieldRenderers/MuscleTargetTree';
import type { MuscleTargets } from '../../../../shared/types';

interface BaselineCardProps {
  motionId: string;
  motionLabel: string;
  muscleTargets: MuscleTargets | null;
  dirty: boolean;
  disabled: boolean;
  onChange: (mt: MuscleTargets) => void;
  onSave: () => Promise<boolean>;
}

export default function BaselineCard({
  motionId,
  motionLabel,
  muscleTargets,
  dirty,
  disabled,
  onChange,
  onSave,
}: BaselineCardProps) {
  if (!muscleTargets) {
    return (
      <div className="border border-gray-200 rounded bg-white p-4">
        <div className="text-xs text-gray-400">Select a motion to edit baseline muscle targets</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded bg-white">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
        <h4 className="text-xs font-bold text-gray-900 flex-1">
          Baseline Muscle Targets
          <span className="font-normal text-gray-500 ml-1">-- {motionLabel}</span>
        </h4>
        {dirty && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">
            unsaved
          </span>
        )}
        <button
          onClick={onSave}
          disabled={disabled || !dirty}
          className="text-[10px] bg-blue-600 text-white rounded px-2.5 py-1 hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          Save Baseline
        </button>
      </div>
      <div className="p-3 max-h-[400px] overflow-y-auto">
        <MuscleTargetTree
          value={muscleTargets as Record<string, unknown>}
          onChange={(v) => onChange(v as unknown as MuscleTargets)}
        />
      </div>
    </div>
  );
}
