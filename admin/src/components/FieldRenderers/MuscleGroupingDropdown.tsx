import React, { useMemo } from 'react';
import {
  asFlatMuscleTargets,
  getSelectableMuscleIds,
  getMuscleIdWithMaxCalculatedScore,
  buildMuscleOptionGroups,
  type MuscleRecord,
} from '../../../../shared/utils/muscleGrouping';

interface MuscleGroupingDropdownProps {
  muscleTargets: Record<string, unknown>;
  muscles: Record<string, unknown>[];
  value: string | null | undefined;
  onChange: (muscleId: string) => void;
  className?: string;
}

export default function MuscleGroupingDropdown({
  muscleTargets,
  muscles,
  value,
  onChange,
  className = 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none',
}: MuscleGroupingDropdownProps) {
  const flatTargets = useMemo(() => asFlatMuscleTargets(muscleTargets), [muscleTargets]);
  const muscleList = useMemo(() => muscles as MuscleRecord[], [muscles]);
  const muscleMap = useMemo(() => {
    const m = new Map<string, MuscleRecord>();
    muscleList.forEach((muscle) => m.set(String(muscle.id), muscle));
    return m;
  }, [muscleList]);

  const selectableIds = useMemo(
    () => getSelectableMuscleIds(flatTargets, muscleMap, 0.5),
    [flatTargets, muscleMap]
  );

  const groups = useMemo(
    () => buildMuscleOptionGroups(selectableIds, muscleMap, muscleList),
    [selectableIds, muscleMap, muscleList]
  );

  const defaultMuscleId = useMemo(
    () => getMuscleIdWithMaxCalculatedScore(flatTargets, muscleMap, selectableIds),
    [flatTargets, muscleMap, selectableIds]
  );
  const displayValue = value ?? defaultMuscleId ?? '';

  return (
    <select
      value={displayValue}
      onChange={(e) => onChange(e.target.value || '')}
      className={className}
    >
      <option value="">(none)</option>
      {groups.map(({ primary, options }) => (
        <optgroup key={primary.id} label={String(primary.label ?? primary.id)}>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.path}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
