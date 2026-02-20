import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

interface MuscleTreeProps {
  tableKey: 'muscles';
  currentRecordId: string;
}

interface MuscleRecord {
  id: string;
  label: string;
  parent_ids?: string[];
}

type MuscleTier = 'primary' | 'secondary' | 'tertiary';

function parseParentIds(record: MuscleRecord): string[] {
  if (Array.isArray(record.parent_ids)) return record.parent_ids;
  if (typeof record.parent_ids === 'string') {
    try { return JSON.parse(record.parent_ids); } catch { return []; }
  }
  return [];
}

function classifyMuscle(record: MuscleRecord, allMuscles: MuscleRecord[]): MuscleTier {
  const pids = parseParentIds(record);
  if (pids.length === 0) return 'primary';
  const anyParentIsPrimary = pids.some(pid => {
    const parent = allMuscles.find(m => m.id === pid);
    return parent && parseParentIds(parent).length === 0;
  });
  if (anyParentIsPrimary) return 'secondary';
  return 'tertiary';
}

export default function MuscleTree({ tableKey, currentRecordId }: MuscleTreeProps) {
  const [allMuscles, setAllMuscles] = useState<MuscleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await api.getTable('muscles');
        setAllMuscles((data as MuscleRecord[]) || []);
      } catch (err) {
        console.error('Failed to load muscle data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const { primaries, secondaries, tertiaries } = useMemo(() => {
    const p: MuscleRecord[] = [];
    const s: MuscleRecord[] = [];
    const t: MuscleRecord[] = [];
    for (const m of allMuscles) {
      const tier = classifyMuscle(m, allMuscles);
      if (tier === 'primary') p.push(m);
      else if (tier === 'secondary') s.push(m);
      else t.push(m);
    }
    return { primaries: p, secondaries: s, tertiaries: t };
  }, [allMuscles]);

  const currentRecord = useMemo(() => allMuscles.find(m => m.id === currentRecordId), [allMuscles, currentRecordId]);
  const currentTier = useMemo(() => currentRecord ? classifyMuscle(currentRecord, allMuscles) : 'primary', [currentRecord, allMuscles]);

  const treeData = useMemo(() => {
    if (loading || !currentRecord) return [];

    if (currentTier === 'primary') {
      const relatedSecondaries = secondaries.filter(s =>
        parseParentIds(s).includes(currentRecordId)
      );
      return relatedSecondaries.map(secondary => ({
        primary: currentRecord,
        secondary,
        tertiaries: tertiaries.filter(t =>
          parseParentIds(t).includes(secondary.id)
        ),
      }));
    }

    if (currentTier === 'secondary') {
      const parentIds = parseParentIds(currentRecord);
      const relatedTertiaries = tertiaries.filter(t =>
        parseParentIds(t).includes(currentRecordId)
      );
      return parentIds
        .map(primaryId => {
          const primary = primaries.find(p => p.id === primaryId);
          if (!primary) return null;
          return {
            primary,
            secondary: currentRecord,
            tertiaries: relatedTertiaries,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    }

    // Tertiary
    const parentIds = parseParentIds(currentRecord);
    const secondaryId = parentIds[0];
    const secondary = secondaries.find(s => s.id === secondaryId);
    if (!secondary) return [];

    const secParentIds = parseParentIds(secondary);
    const primaryId = secParentIds[0];
    const primary = primaries.find(p => p.id === primaryId);
    if (!primary) return [];

    return [{
      primary,
      secondary,
      tertiaries: [currentRecord],
    }];
  }, [currentTier, currentRecord, currentRecordId, primaries, secondaries, tertiaries, loading]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
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
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                {currentTier === 'primary' ? (
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
                      to="/table/muscles"
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
                ) : currentTier === 'secondary' ? (
                  <>
                    <Link
                      to="/table/muscles"
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
                      to="/table/muscles"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {item.primary.label}
                    </Link>
                    <span className="text-xs text-gray-400">→</span>
                    <Link
                      to="/table/muscles"
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

            {item.tertiaries.length > 0 && isExpanded && (
              <div className="border-t bg-gray-50">
                {item.tertiaries.map(tertiary => (
                  <div key={tertiary.id} className="px-3 py-1.5 pl-8">
                    <div className="flex items-center gap-2">
                      {currentTier === 'tertiary' ? (
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
                            to="/table/muscles"
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
