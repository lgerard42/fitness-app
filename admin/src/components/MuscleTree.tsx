import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { getChildrenOf, getPathFromRootToMuscle } from '../shared/utils/muscleTree';

interface MuscleTreeProps {
  tableKey: 'muscles';
  currentRecordId: string;
}

interface MuscleRecord {
  id: string;
  label: string;
  parent_ids?: string[];
  [key: string]: unknown;
}

type MuscleTier = 'primary' | 'secondary' | 'tertiary' | 'child';

/** Depth under root (0 = root, 1 = child of root, etc.). */
function getDepth(recordId: string, muscleMap: Map<string, MuscleRecord>): number {
  const path = getPathFromRootToMuscle(recordId, muscleMap);
  return Math.max(0, path.length - 1);
}

function classifyMuscle(record: MuscleRecord, muscleMap: Map<string, MuscleRecord>): MuscleTier {
  const d = getDepth(record.id, muscleMap);
  if (d === 0) return 'primary';
  if (d === 1) return 'secondary';
  if (d === 2) return 'tertiary';
  return 'child';
}

interface TreeNodeDisplay {
  record: MuscleRecord;
  children: TreeNodeDisplay[];
}

function buildNode(record: MuscleRecord, allMuscles: MuscleRecord[]): TreeNodeDisplay {
  const children = getChildrenOf(record.id, allMuscles);
  return {
    record,
    children: children.map(c => buildNode(c, allMuscles)),
  };
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

  const muscleMap = useMemo(() => new Map(allMuscles.map(m => [m.id, m])), [allMuscles]);
  const currentRecord = useMemo(() => allMuscles.find(m => m.id === currentRecordId), [allMuscles, currentRecordId]);
  const currentTier = useMemo(() => currentRecord ? classifyMuscle(currentRecord, muscleMap) : 'primary', [currentRecord, muscleMap]);

  /** Branches to show: path from root to parent of listed children, then recursive children. */
  const treeData = useMemo((): { path: MuscleRecord[]; children: TreeNodeDisplay[] }[] => {
    if (loading || !currentRecord) return [];
    const pathIds = getPathFromRootToMuscle(currentRecordId, muscleMap);
    const path = pathIds.map(id => allMuscles.find(m => m.id === id)).filter((x): x is MuscleRecord => !!x);
    const childNodes = getChildrenOf(currentRecordId, allMuscles).map(c => buildNode(c, allMuscles));
    return [{ path, children: childNodes }];
  }, [loading, currentRecord, currentRecordId, allMuscles, muscleMap]);

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

  function renderNode(node: TreeNodeDisplay, depth: number, parentKey: string): React.ReactNode {
    const key = `${parentKey}-${node.record.id}`;
    const isExpanded = expanded.has(key);
    const hasChildren = node.children.length > 0;
    const depthStyle = depth === 0 ? 'font-medium text-gray-800' : depth === 1 ? 'text-gray-700' : depth === 2 ? 'text-gray-600' : 'text-gray-500';
    const pl = 8 + depth * 12;

    return (
      <div key={node.record.id}>
        <div className="px-3 py-1.5 flex items-center gap-2" style={{ paddingLeft: pl }}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpand(key)}
              className="text-xs text-gray-500 w-4 flex-shrink-0 hover:text-gray-700"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="text-xs text-gray-400 w-4 flex-shrink-0">•</span>
          )}
          <Link
            to="/table/muscles"
            className={`text-sm hover:underline ${depthStyle}`}
          >
            {node.record.label}
          </Link>
          <span className="text-xs text-gray-400">{node.record.id}</span>
          {hasChildren && !isExpanded && (
            <span className="text-xs text-gray-400">({node.children.length})</span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="border-t border-gray-100">
            {node.children.map(c => renderNode(c, depth + 1, key))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {treeData.map((branch, idx) => (
        <div key={idx} className="bg-white border rounded">
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              {branch.path.map((p, i) => (
                <React.Fragment key={p.id}>
                  {i > 0 && <span className="text-xs text-gray-400">→</span>}
                  {i === branch.path.length - 1 ? (
                    <span className="text-sm font-medium text-gray-700">{p.label}</span>
                  ) : (
                    <Link to="/table/muscles" className="text-sm text-blue-600 hover:underline">{p.label}</Link>
                  )}
                  <span className="text-xs text-gray-400">{p.id}</span>
                </React.Fragment>
              ))}
              {branch.children.length > 0 && (
                <span className="text-xs text-gray-400 ml-1">({branch.children.length} child)</span>
              )}
            </div>
          </div>
          {branch.children.length > 0 && (
            <div className="py-1">
              {branch.children.map(node => renderNode(node, 0, `branch-${idx}`))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
