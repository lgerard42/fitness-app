import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface MuscleTreeProps {
  tableKey: 'primaryMuscles' | 'secondaryMuscles' | 'tertiaryMuscles';
  currentRecordId: string;
}

interface MuscleRecord {
  id: string;
  label: string;
  primary_muscle_ids?: string[];
  secondary_muscle_ids?: string[];
}

export default function MuscleTree({ tableKey, currentRecordId }: MuscleTreeProps) {
  const [primaryMuscles, setPrimaryMuscles] = useState<MuscleRecord[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleRecord[]>([]);
  const [tertiaryMuscles, setTertiaryMuscles] = useState<MuscleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        const [primaries, secondaries, tertiaries] = await Promise.all([
          api.getTable('primaryMuscles'),
          api.getTable('secondaryMuscles'),
          api.getTable('tertiaryMuscles'),
        ]);
        setPrimaryMuscles((primaries as MuscleRecord[]) || []);
        setSecondaryMuscles((secondaries as MuscleRecord[]) || []);
        setTertiaryMuscles((tertiaries as MuscleRecord[]) || []);
      } catch (err) {
        console.error('Failed to load muscle data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Build tree structure based on table type
  const treeData = useMemo(() => {
    if (loading) return [];

    if (tableKey === 'primaryMuscles') {
      // Primary -> Secondary -> Tertiary (all secondaries collapsible)
      const currentPrimary = primaryMuscles.find((p) => p.id === currentRecordId);
      if (!currentPrimary) return [];

      const relatedSecondaries = secondaryMuscles.filter((s) =>
        s.primary_muscle_ids?.includes(currentRecordId)
      );

      return relatedSecondaries.map((secondary) => {
        const relatedTertiaries = tertiaryMuscles.filter((t) =>
          t.secondary_muscle_ids?.includes(secondary.id)
        );
        return {
          primary: currentPrimary,
          secondary,
          tertiaries: relatedTertiaries,
        };
      });
    } else if (tableKey === 'secondaryMuscles') {
      // Primary -> Secondary -> Tertiary (show primary on same row as secondary)
      // Handle multiple primary muscles if secondary is connected to more than one
      const currentSecondary = secondaryMuscles.find((s) => s.id === currentRecordId);
      if (!currentSecondary || !currentSecondary.primary_muscle_ids?.length) return [];

      const relatedTertiaries = tertiaryMuscles.filter((t) =>
        t.secondary_muscle_ids?.includes(currentRecordId)
      );

      // Create a tree entry for each primary muscle this secondary belongs to
      return currentSecondary.primary_muscle_ids
        .map((primaryId) => {
          const primary = primaryMuscles.find((p) => p.id === primaryId);
          if (!primary) return null;
          return {
            primary,
            secondary: currentSecondary,
            tertiaries: relatedTertiaries,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    } else {
      // Tertiary: Primary -> Secondary -> Tertiary (show primary->secondary on same line, tertiary disabled)
      const currentTertiary = tertiaryMuscles.find((t) => t.id === currentRecordId);
      if (!currentTertiary || !currentTertiary.secondary_muscle_ids?.length) return [];

      const secondaryId = currentTertiary.secondary_muscle_ids[0];
      const secondary = secondaryMuscles.find((s) => s.id === secondaryId);
      if (!secondary || !secondary.primary_muscle_ids?.length) return [];

      const primaryId = secondary.primary_muscle_ids[0];
      const primary = primaryMuscles.find((p) => p.id === primaryId);
      if (!primary) return [];

      return [
        {
          primary,
          secondary,
          tertiaries: [currentTertiary],
        },
      ];
    }
  }, [tableKey, currentRecordId, primaryMuscles, secondaryMuscles, tertiaryMuscles, loading]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return <div className="text-xs text-gray-400 py-2">Loading muscle relationships...</div>;
  }

  if (treeData.length === 0) {
    return (
      <div className="text-xs text-gray-400 py-2 italic">No muscle relationships found.</div>
    );
  }

  return (
    <div className="space-y-1">
      {treeData.map((item, idx) => {
        const secondaryKey = `secondary-${item.secondary.id}`;
        const isExpanded = expanded.has(secondaryKey);

        return (
          <div key={idx} className="bg-white border rounded">
            {/* Secondary row (with Primary for secondary/tertiary tables) */}
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                {tableKey === 'primaryMuscles' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleExpand(secondaryKey)}
                      className="text-xs text-gray-500 w-4 flex-shrink-0 hover:text-gray-700"
                      disabled={item.tertiaries.length === 0}
                    >
                      {item.tertiaries.length > 0 ? (isExpanded ? '▼' : '▶') : '•'}
                    </button>
                    <Link
                      to={`/table/secondaryMuscles`}
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      {item.secondary.label}
                    </Link>
                    <span className="text-xs text-gray-400">{item.secondary.id}</span>
                    {item.tertiaries.length > 0 && (
                      <span className="text-xs text-gray-400 ml-auto">
                        ({item.tertiaries.length} tertiary)
                      </span>
                    )}
                  </>
                ) : tableKey === 'secondaryMuscles' ? (
                  <>
                    <Link
                      to={`/table/primaryMuscles`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {item.primary.label}
                    </Link>
                    <span className="text-xs text-gray-400">→</span>
                    <span className="text-sm text-gray-700 font-medium">
                      {item.secondary.label}
                    </span>
                    <span className="text-xs text-gray-400">{item.secondary.id}</span>
                    {item.tertiaries.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleExpand(secondaryKey)}
                          className="text-xs text-gray-500 ml-auto hover:text-gray-700"
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                        <span className="text-xs text-gray-400">
                          ({item.tertiaries.length} tertiary)
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      to={`/table/primaryMuscles`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {item.primary.label}
                    </Link>
                    <span className="text-xs text-gray-400">→</span>
                    <Link
                      to={`/table/secondaryMuscles`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {item.secondary.label}
                    </Link>
                    <span className="text-xs text-gray-400">→</span>
                    <span className="text-sm text-gray-500 font-medium">
                      {item.tertiaries[0]?.label}
                    </span>
                    <span className="text-xs text-gray-400">{item.tertiaries[0]?.id}</span>
                  </>
                )}
              </div>
            </div>

            {/* Tertiary muscles (indented, collapsible) */}
            {item.tertiaries.length > 0 && isExpanded && (
              <div className="border-t bg-gray-50">
                {item.tertiaries.map((tertiary) => (
                  <div key={tertiary.id} className="px-3 py-1.5 pl-8">
                    <div className="flex items-center gap-2">
                      {tableKey === 'tertiaryMuscles' ? (
                        <>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-sm text-gray-500 font-medium">
                            {tertiary.label}
                          </span>
                          <span className="text-xs text-gray-400">{tertiary.id}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-gray-500">•</span>
                          <Link
                            to={`/table/tertiaryMuscles`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {tertiary.label}
                          </Link>
                          <span className="text-xs text-gray-400">{tertiary.id}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
