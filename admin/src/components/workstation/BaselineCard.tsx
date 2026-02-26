import React, { useState } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(true);

  if (!muscleTargets) {
    return (
      <div className="border border-gray-200 rounded bg-white p-4">
        <div className="text-xs text-gray-400">Select a motion to edit baseline muscle targets</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded bg-white">
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 flex-shrink-0 text-xs w-4"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
        <h4 className="text-[11px] font-bold text-gray-900 flex-1 truncate">
          Baseline Muscle Targets
          <span className="font-normal text-gray-500 ml-1">— {motionLabel}</span>
        </h4>
        {dirty && (
          <span className="text-[9px] px-1 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium flex-shrink-0">
            unsaved
          </span>
        )}
        <button
          onClick={onSave}
          disabled={disabled || !dirty}
          className="text-[9px] bg-blue-600 text-white rounded px-2 py-0.5 hover:bg-blue-700 disabled:opacity-50 font-medium flex-shrink-0"
        >
          Save Baseline
        </button>
      </div>
      {isExpanded && (
        <div className="p-1.5 max-h-[320px] overflow-y-auto">
          <MuscleTargetTree
            value={muscleTargets as Record<string, unknown>}
            onChange={(v) => onChange(v as unknown as MuscleTargets)}
            compact
            alwaysExpanded
          />
        </div>
      )}
    </div>
  );
}
