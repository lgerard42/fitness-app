import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { sp } from '../../styles/sidePanelStyles';
import { filterScorableOnly, isMuscleScorable } from '../../utils/muscleScorable';
import { buildPrimaryMuscleDropdownGroups, buildSecondaryMuscleDropdownGroups } from '../../utils/muscleDropdownGroups';
import MuscleSecondarySelect from './MuscleSecondarySelect';

type MotionTableKey = 'motions';

interface MotionConfigTreeProps {
  tableKey: MotionTableKey;
  currentRecordId: string;
  muscleTargets: Record<string, unknown>;
  onFieldsChange: (fields: Record<string, unknown>) => void;
}

interface MotionRecord {
  id: string;
  label: string;
  parent_id?: string | null;
  muscle_targets?: Record<string, unknown>;
  [key: string]: unknown;
}

interface MuscleOption { id: string; label: string; }

interface FlatTreeNode {
  id: string;
  label: string;
  explicitScore: number;
  sumChildren?: number;
  children: FlatTreeNode[];
}

function parsePids(m: Record<string, unknown>): string[] {
  const raw = m.parent_ids;
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

function asFlat(v: unknown): Record<string, number> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const result: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'number') result[k] = val;
  }
  return result;
}

function buildFlatTree(
  flat: Record<string, number>,
  allMuscles: Record<string, unknown>[]
): FlatTreeNode[] {
  if (Object.keys(flat).length === 0 || allMuscles.length === 0) return [];

  const muscleMap = new Map<string, Record<string, unknown>>();
  const childrenOf = new Map<string, string[]>();
  const rootIds: string[] = [];

  for (const m of allMuscles) {
    const id = m.id as string;
    muscleMap.set(id, m);
    const pids = parsePids(m);
    if (pids.length === 0) rootIds.push(id);
    for (const pid of pids) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(id);
    }
  }

  const flatIds = new Set(Object.keys(flat));
  const neededIds = new Set<string>();
  function ensureAncestors(id: string) {
    if (neededIds.has(id)) return;
    neededIds.add(id);
    const m = muscleMap.get(id);
    if (!m) return;
    for (const pid of parsePids(m)) ensureAncestors(pid);
  }
  for (const id of flatIds) ensureAncestors(id);

  function buildNode(id: string): FlatTreeNode | null {
    if (!neededIds.has(id)) return null;
    const m = muscleMap.get(id);
    const label = m ? (m.label as string) : id;
    const kids = (childrenOf.get(id) || [])
      .map(cid => buildNode(cid))
      .filter((n): n is FlatTreeNode => n !== null);
    const hasKids = kids.length > 0;
    const explicitScore = flat[id] ?? 0;
    const sumChildren = hasKids
      ? Math.round(kids.reduce((s, c) => s + (c.explicitScore + (c.sumChildren ?? 0)), 0) * 100) / 100
      : undefined;
    return { id, label, explicitScore, sumChildren, children: kids };
  }

  const tree: FlatTreeNode[] = [];
  for (const rid of rootIds) { const n = buildNode(rid); if (n) tree.push(n); }
  const reachable = new Set<string>();
  (function collect(nodes: FlatTreeNode[]) { for (const n of nodes) { reachable.add(n.id); collect(n.children); } })(tree);
  for (const id of flatIds) {
    if (!reachable.has(id)) {
      const m = muscleMap.get(id);
      tree.push({ id, label: m ? (m.label as string) : id, explicitScore: flat[id] ?? 0, children: [] });
    }
  }
  return tree;
}

function collectAllScores(
  data: Record<string, unknown>,
  allMuscles: Record<string, unknown>[]
): string {
  const flat = asFlat(data);
  const tree = buildFlatTree(flat, allMuscles);
  if (tree.length === 0) return 'none';
  const lines: string[] = [];
  function fmt(node: FlatTreeNode, prefix: string, isLast: boolean) {
    const total = node.explicitScore + (node.sumChildren ?? 0);
    lines.push(`${prefix}${isLast ? '└' : '├'}─ ${node.label}: ${total}`);
    const cp = prefix + (isLast ? '   ' : '│  ');
    node.children.forEach((c, i) => fmt(c, cp, i === node.children.length - 1));
  }
  tree.forEach((n, i) => fmt(n, '', i === tree.length - 1));
  return lines.join('\n');
}

function MuscleTargetsSubtree({
  targets,
  onChange,
  readOnly,
  depth: _depth,
  expanded,
  toggleExpanded,
  allMuscles,
  variationTargets,
}: {
  targets: Record<string, unknown>;
  onChange?: (v: Record<string, unknown>) => void;
  readOnly?: boolean;
  depth: number;
  expanded: Set<string>;
  toggleExpanded: (key: string) => void;
  allMuscles: Record<string, unknown>[];
  variationTargets?: Record<string, unknown>;
}) {
  const flat = asFlat(targets);
  const varFlat = variationTargets ? asFlat(variationTargets) : null;

  const { muscleMap, childrenOf, rootIds } = useMemo(() => {
    const mMap = new Map<string, Record<string, unknown>>();
    const cOf = new Map<string, string[]>();
    const rIds: string[] = [];
    for (const m of allMuscles) {
      const id = m.id as string;
      mMap.set(id, m);
      const pids = parsePids(m);
      if (pids.length === 0) rIds.push(id);
      for (const pid of pids) {
        if (!cOf.has(pid)) cOf.set(pid, []);
        cOf.get(pid)!.push(id);
      }
    }
    return { muscleMap: mMap, childrenOf: cOf, rootIds: rIds };
  }, [allMuscles]);

  const displayFlat = useMemo(() => {
    if (!readOnly || !varFlat) return flat;
    const merged = { ...flat };
    for (const id of Object.keys(varFlat)) {
      if (!(id in merged)) merged[id] = 0;
    }
    return merged;
  }, [flat, varFlat, readOnly]);

  const displayTree = useMemo(() =>
    buildFlatTree(displayFlat, allMuscles),
    [displayFlat, allMuscles]
  );

  const setScore = (muscleId: string, score: number) => {
    if (readOnly || !onChange || isNaN(score) || !isMuscleScorable(allMuscles, muscleId)) return;
    onChange(filterScorableOnly({ ...flat, [muscleId]: score }, allMuscles) as unknown as Record<string, unknown>);
  };

  const removeMuscle = (id: string) => {
    if (readOnly || !onChange) return;
    const nf = { ...flat };
    function removeRec(mid: string) {
      delete nf[mid];
      for (const kid of childrenOf.get(mid) || []) { if (kid in nf) removeRec(kid); }
    }
    removeRec(id);
    onChange(filterScorableOnly(nf, allMuscles) as unknown as Record<string, unknown>);
  };

  const addMuscle = (id: string) => {
    if (readOnly || !onChange || id in flat || !isMuscleScorable(allMuscles, id)) return;
    onChange(filterScorableOnly({ ...flat, [id]: 0 }, allMuscles) as unknown as Record<string, unknown>);
  };

  const usedIds = useMemo(() => new Set(Object.keys(flat)), [flat]);

  const musclesForDropdown = useMemo(
    () =>
      allMuscles.map(m => ({
        id: m.id as string,
        label: m.label as string,
        parent_ids: parsePids(m),
        is_scorable: m.is_scorable as boolean | undefined,
      })),
    [allMuscles]
  );

  const getAvailableChildren = (parentId: string): MuscleOption[] =>
    (childrenOf.get(parentId) || [])
      .map(cid => muscleMap.get(cid))
      .filter((m): m is Record<string, unknown> => !!m && !(m.id as string in flat) && m.is_scorable !== false)
      .map(m => ({ id: m.id as string, label: m.label as string }));

  const primaryDropdownGroups = useMemo(
    () => buildPrimaryMuscleDropdownGroups(musclesForDropdown, usedIds),
    [musclesForDropdown, usedIds]
  );
  const hasPrimaryOptions = primaryDropdownGroups.some(g => g.options.length > 0);

  const ScoreInput = ({ muscleId, explicitScore, sumChildren }: { muscleId: string; explicitScore: number; sumChildren?: number }) => {
    const [localValue, setLocalValue] = useState(String(explicitScore));
    const [isFocused, setIsFocused] = useState(false);
    const scorable = isMuscleScorable(allMuscles, muscleId);
    const total = sumChildren !== undefined ? Math.round((explicitScore + sumChildren) * 100) / 100 : undefined;

    useEffect(() => { if (!isFocused) setLocalValue(String(explicitScore)); }, [explicitScore, isFocused]);

    if (readOnly) {
      if (varFlat) {
        const baseScore = muscleId in flat ? flat[muscleId] : null;
        const variationScore = muscleId in (varFlat ?? {}) ? (varFlat ?? {})[muscleId] : null;
        const isNew = baseScore === null && variationScore !== null;
        const isChanged = baseScore !== null && variationScore !== null && baseScore !== variationScore;

        if (isNew) {
          return (
            <>
              <span className={sp.deltaRules.addBadge}>Add</span>
              <span className={sp.scoreInput.readOnly}>{variationScore}</span>
            </>
          );
        } else if (isChanged) {
          return (
            <>
              <span className={sp.scoreInput.readOnly}>{baseScore}</span>
              <span className={sp.deltaRules.arrowSeparator}>→</span>
              <span className={sp.scoreInput.changed}>{variationScore}</span>
            </>
          );
        }
        return (
          <span className={sp.scoreInput.readOnly}>
            {baseScore ?? explicitScore}
            {total !== undefined && ` ${total}`}
          </span>
        );
      }
      return (
        <span className={sp.scoreInput.readOnly}>
          {total !== undefined ? `${explicitScore} ${total}` : explicitScore}
        </span>
      );
    }

    if (!scorable) {
      return (
        <span className={sp.scoreInput.readOnly} title="Not scorable">
          {total !== undefined ? `${explicitScore} ${total}` : explicitScore}
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1">
        <input
          type="number"
          step="0.1"
          value={localValue}
          onFocus={() => setIsFocused(true)}
          onChange={e => setLocalValue(e.target.value)}
          onBlur={e => {
            setIsFocused(false);
            const n = parseFloat(e.target.value);
            if (isNaN(n) || e.target.value === '') setLocalValue(String(explicitScore));
            else setScore(muscleId, n);
          }}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className={sp.scoreInput.editable}
        />
        {total !== undefined && (
          <span className={sp.scoreInput.computed} title="Parent + children total">{total}</span>
        )}
      </span>
    );
  };

  const treeStyles = readOnly ? {
    item: sp.deltaRules.treeItemReadOnly,
    itemFlat: sp.deltaRules.treeItemFlatReadOnly,
    rowPrimary: sp.deltaRules.treeRowPrimaryReadOnly,
    rowSecondary: sp.deltaRules.treeRowSecondaryReadOnly,
    rowTertiary: sp.deltaRules.treeRowTertiaryReadOnly,
    nestSecondaries: sp.deltaRules.treeNestSecondariesReadOnly,
    nestTertiaries: sp.deltaRules.treeNestTertiariesReadOnly,
  } : {
    item: sp.deltaRules.treeItem,
    itemFlat: sp.deltaRules.treeItemFlat,
    rowPrimary: sp.deltaRules.treeRowPrimary,
    rowSecondary: sp.deltaRules.treeRowSecondary,
    rowTertiary: sp.deltaRules.treeRowTertiary,
    nestSecondaries: sp.deltaRules.treeNestSecondaries,
    nestTertiaries: sp.deltaRules.treeNestTertiaries,
  };

  const renderNode = (node: FlatTreeNode, pathKey: string, depth: number) => {
    const available = getAvailableChildren(node.id);
    const secondaryGroups = depth === 0 ? buildSecondaryMuscleDropdownGroups(musclesForDropdown, node.id, usedIds) : [];
    const hasSecondaryOptions = secondaryGroups.some(g => g.options.length > 0);
    const showAddDropdown = depth === 0 ? hasSecondaryOptions : available.length > 0;
    const hasKids = node.children.length > 0;

    const rowStyle = depth === 0 ? treeStyles.rowPrimary : depth === 1 ? treeStyles.rowSecondary : treeStyles.rowTertiary;
    const labelStyle = depth === 0 ? sp.treeRow.primaryLabel : depth === 1 ? sp.treeRow.secondaryLabel : sp.treeRow.tertiaryLabel;
    const wrapperStyle = depth === 0 ? treeStyles.item : treeStyles.itemFlat;
    const nestStyle = depth === 0 ? treeStyles.nestSecondaries : treeStyles.nestTertiaries;

    return (
      <div key={pathKey} className={wrapperStyle}>
        <div className={rowStyle}>
          <span className={labelStyle}>{node.label}</span>
          <ScoreInput muscleId={node.id} explicitScore={node.explicitScore} sumChildren={node.sumChildren} />
          {!readOnly && (
            <button type="button" onClick={() => removeMuscle(node.id)} className={sp.removeBtn.small}>×</button>
          )}
        </div>
        {(hasKids || (!readOnly && showAddDropdown)) && (
          <div className={nestStyle}>
            {node.children.map(child => renderNode(child, `${pathKey}.${child.id}`, depth + 1))}
            {!readOnly && showAddDropdown && (
              depth === 0 ? (
                <MuscleSecondarySelect
                  options={secondaryGroups[0].options}
                  onChange={v => addMuscle(v)}
                  className={sp.deltaRules.treeAddDropdown}
                  placeholder="+ child..."
                />
              ) : (
                <select onChange={e => { if (e.target.value) addMuscle(e.target.value); e.target.value = ''; }}
                  className={sp.deltaRules.treeAddDropdown} defaultValue="">
                  <option value="">+ child...</option>
                  {available.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              )
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={sp.deltaRules.treeContainer}>
      {displayTree.map(node => renderNode(node, node.id, 0))}
      {!readOnly && hasPrimaryOptions && (
        <select onChange={e => { if (e.target.value) addMuscle(e.target.value); e.target.value = ''; }}
          className={sp.deltaRules.treeAddDropdown} defaultValue="">
          <option value="">+ muscle group...</option>
          {primaryDropdownGroups.map(grp => (
            <optgroup key={grp.groupLabel} label={grp.groupLabel}>
              {grp.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          ))}
        </select>
      )}
    </div>
  );
}

function MuscleTargetsToggle({
  mtKey, targets, allMuscles, expanded, toggle,
}: {
  mtKey: string;
  targets: Record<string, unknown>;
  allMuscles: Record<string, unknown>[];
  expanded: Set<string>;
  toggle: (key: string) => void;
}) {
  const isExp = expanded.has(mtKey);
  const tooltipText = collectAllScores(targets, allMuscles);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (tooltipText === 'none') return;
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setTooltipPosition({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    setShowTooltip(true);
  };

  return (
    <>
      <div ref={wrapperRef}
        className={sp.motionConfig.muscleToggleBadge}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className={sp.motionConfig.muscleToggleLabel}>Muscles</span>
      </div>
      {showTooltip && tooltipText !== 'none' && createPortal(
        <div className={`${sp.tooltip.container} ${sp.motionConfig.tooltipContainerPreLine}`}
          style={{ top: `${tooltipPosition.top}px`, left: `${tooltipPosition.left}px`, width: '320px' }}>
          <div className={`${sp.tooltip.header} ${sp.motionConfig.tooltipHeaderRed}`}>Muscle Scores:</div>
          <div className={sp.motionConfig.tooltipText}>{tooltipText}</div>
        </div>,
        document.body
      )}
    </>
  );
}


export default function MotionConfigTree({ tableKey: _tableKey, currentRecordId, muscleTargets, onFieldsChange }: MotionConfigTreeProps) {
  const [allMotions, setAllMotions] = useState<MotionRecord[]>([]);
  const [allMuscles, setAllMuscles] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [motions, muscles] = await Promise.all([
        api.getTable('motions'),
        api.getTable('muscles'),
      ]);
      setAllMotions((motions as MotionRecord[]) || []);
      setAllMuscles((muscles as Record<string, unknown>[]) || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const parentMotions = useMemo(() => allMotions.filter(m => !m.parent_id), [allMotions]);
  const childMotions = useMemo(() => allMotions.filter(m => !!m.parent_id), [allMotions]);

  const toggle = useCallback((key: string) => {
    setExpanded(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }, []);

  const addVariationToPrimary = useCallback(async (primaryId: string, variationId: string) => {
    try {
      await api.updateRow('motions', variationId, { parent_id: primaryId });
      await loadAll();
    } catch (err) { console.error('Failed to link variation:', err); }
  }, [loadAll]);

  const removeVariationFromPrimary = useCallback(async (variationId: string) => {
    try {
      await api.updateRow('motions', variationId, { parent_id: null });
      if (variationId === currentRecordId) {
        onFieldsChange({ parent_id: null });
      }
      await loadAll();
    } catch (err) { console.error('Failed to unlink variation:', err); }
  }, [loadAll, currentRecordId, onFieldsChange]);

  const setPrimaryForVariation = useCallback(async (variationId: string, primaryId: string) => {
    try {
      await api.updateRow('motions', variationId, { parent_id: primaryId });
      if (variationId === currentRecordId) {
        onFieldsChange({ parent_id: primaryId });
      }
      await loadAll();
    } catch (err) { console.error('Failed to set parent:', err); }
  }, [loadAll, currentRecordId, onFieldsChange]);

  const saveChildMuscleTargets = useCallback(async (recordId: string, newTargets: Record<string, unknown>) => {
    try {
      await api.updateRow('motions', recordId, { muscle_targets: newTargets });
      setAllMotions(prev => prev.map(r => r.id === recordId ? { ...r, muscle_targets: newTargets } : r));
    } catch (err) {
      console.error('Failed to save muscle_targets:', err);
    }
  }, []);

  const createVariation = useCallback(async (primaryId: string, newData: Record<string, unknown>) => {
    try {
      await api.addRow('motions', { ...newData, parent_id: primaryId, muscle_targets: {} });
      await loadAll();
    } catch (err) { console.error('Failed to create variation:', err); alert('Failed to create variation.'); }
  }, [loadAll]);

  const mtProps = useMemo(() => ({
    expanded, toggleExpanded: toggle, allMuscles,
  }), [expanded, toggle, allMuscles]);

  const getPrimaryMusclesFromMotion = useCallback((motion: MotionRecord): string[] => {
    const targets = motion.muscle_targets as Record<string, unknown> | undefined;
    if (!targets || typeof targets !== 'object') return [];
    return Object.keys(targets);
  }, []);

  const currentMotion = allMotions.find(m => m.id === currentRecordId);
  const isCurrentParent = currentMotion ? !currentMotion.parent_id : false;
  const computedFocusVariationId = currentMotion && !isCurrentParent ? currentRecordId : null;

  const groupedMotions = useMemo(() => {
    if (!currentMotion || !allMuscles || allMuscles.length === 0 || !allMotions || allMotions.length === 0) return [];

    const addToPrimaryOptions = computedFocusVariationId
      ? parentMotions.filter(pm => pm.id !== currentMotion.parent_id)
      : [];

    if (addToPrimaryOptions.length === 0) return [];

    const groups: Record<string, Array<{ motion: MotionRecord; isPrimary: boolean }>> = {};
    const primaryMuscles = allMuscles.filter((m: Record<string, unknown>) => {
      const pids = m.parent_ids;
      return !pids || (Array.isArray(pids) && pids.length === 0);
    });
    const primaryMuscleMap = new Map(primaryMuscles.map((m: Record<string, unknown>) => [m.id as string, m]));

    const primaryMotionsList = addToPrimaryOptions.filter(m => !m.parent_id);
    const variationsList = addToPrimaryOptions.filter(m => !!m.parent_id);

    primaryMotionsList.forEach(motion => {
      const primaryMuscleIds = getPrimaryMusclesFromMotion(motion);
      if (primaryMuscleIds.length === 0) {
        if (!groups['OTHER']) groups['OTHER'] = [];
        groups['OTHER'].push({ motion, isPrimary: true });
      } else {
        const primaryId = primaryMuscleIds[0];
        if (!groups[primaryId]) groups[primaryId] = [];
        groups[primaryId].push({ motion, isPrimary: true });
      }
    });

    variationsList.forEach(variation => {
      const parentMotion = allMotions.find(m => m.id === variation.parent_id);
      if (parentMotion) {
        const primaryMuscleIds = getPrimaryMusclesFromMotion(parentMotion);
        const groupKey = primaryMuscleIds.length > 0 ? primaryMuscleIds[0] : 'OTHER';
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push({ motion: variation, isPrimary: false });
      }
    });

    Object.keys(groups).forEach(key => {
      const items = groups[key];
      const primaries = items.filter(item => item.isPrimary).sort((a, b) => a.motion.label.localeCompare(b.motion.label));
      const variations = items.filter(item => !item.isPrimary);

      variations.sort((a, b) => {
        const aParentId = a.motion.parent_id;
        const bParentId = b.motion.parent_id;
        if (aParentId !== bParentId) {
          const aParent = primaries.find(p => p.motion.id === aParentId);
          const bParent = primaries.find(p => p.motion.id === bParentId);
          if (aParent && bParent) {
            const parentCompare = aParent.motion.label.localeCompare(bParent.motion.label);
            if (parentCompare !== 0) return parentCompare;
          }
        }
        return a.motion.label.localeCompare(b.motion.label);
      });

      const sorted: Array<{ motion: MotionRecord; isPrimary: boolean }> = [];
      primaries.forEach(primary => {
        sorted.push(primary);
        variations.filter(v => v.motion.parent_id === primary.motion.id).forEach(v => sorted.push(v));
      });
      variations.filter(v => !primaries.some(p => p.motion.id === v.motion.parent_id)).forEach(v => sorted.push(v));

      groups[key] = sorted;
    });

    const sortedGroups: Array<{ primaryId: string; primaryLabel: string; motions: Array<{ motion: MotionRecord; isPrimary: boolean }> }> = [];
    Object.keys(groups).forEach(primaryId => {
      const primary = primaryMuscleMap.get(primaryId);
      const primaryLabel = primary && typeof primary === 'object' && 'label' in primary ? String(primary.label) : primaryId;
      sortedGroups.push({ primaryId, primaryLabel, motions: groups[primaryId] });
    });
    sortedGroups.sort((a, b) => {
      if (a.primaryId === 'OTHER') return 1;
      if (b.primaryId === 'OTHER') return -1;
      return a.primaryLabel.localeCompare(b.primaryLabel);
    });

    return sortedGroups;
  }, [computedFocusVariationId, currentMotion, parentMotions, allMuscles, allMotions, getPrimaryMusclesFromMotion]);

  if (loading) return <div className={sp.motionConfig.loading}>Loading...</div>;
  if (error) return <div className={sp.motionConfig.emptyState}>Error: {error}</div>;
  if (!currentMotion) return <div className={sp.motionConfig.emptyState}>Record not found.</div>;

  const isCurrent = (id: string) => id === currentRecordId;

  const getTargetsAndOnChange = (id: string, record: MotionRecord) => {
    const targets = isCurrent(id) ? muscleTargets : (record.muscle_targets || {}) as Record<string, unknown>;
    return {
      targets,
      onChange: (newTargets: Record<string, unknown>) => {
        if (isCurrent(id)) {
          onFieldsChange({ muscle_targets: newTargets });
        } else {
          saveChildMuscleTargets(id, newTargets);
        }
      },
    };
  };

  const renderVariation = (v: MotionRecord, _keyPrefix: string, parentTargets?: Record<string, unknown>) => {
    const current = isCurrent(v.id);
    const { targets, onChange } = getTargetsAndOnChange(v.id, v);
    const varMtKey = `mt-var-${v.id}`;

    return (
      <div key={v.id} className={`${sp.motionConfig.variationCard} ${current ? sp.motionConfig.variationCardCurrent : ''}`}>
        <div className={`${sp.motionConfig.variationHeader} ${current ? sp.motionConfig.variationHeaderCurrent : ''}`}>
          <button type="button" onClick={() => toggle(varMtKey)} className={sp.toggle.base}>{expanded.has(varMtKey) ? '▼' : '▶'}</button>
          <div className={sp.motionConfig.variationLabelContainer}>
            {current ? (
              <span className={sp.motionConfig.variationLabelCurrent}>{v.label}</span>
            ) : (
              <Link to="/table/motions" className={sp.motionConfig.variationLabel}>{v.label}</Link>
            )}
            <span className={sp.meta.id}>{v.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={varMtKey} targets={targets} allMuscles={allMuscles} expanded={expanded} toggle={toggle} />
          <button type="button" onClick={() => removeVariationFromPrimary(v.id)}
            className={sp.motionConfig.removeVariationBtn}>Remove</button>
        </div>
        {expanded.has(varMtKey) && (
          <div className={sp.deltaRules.expandedContent}>
            <div className={sp.deltaRules.scoresRow}>
              <div className={sp.deltaRules.scoresColumnEditable}>
                <div className={sp.deltaRules.sectionLabel}>Variation Scores</div>
                <MuscleTargetsSubtree targets={targets} depth={0} onChange={onChange} {...mtProps} />
              </div>
              {parentTargets && Object.keys(parentTargets).length > 0 && (
                <div className={sp.deltaRules.scoresColumnReadOnly}>
                  <div className={sp.deltaRules.sectionLabel}>Parent Scores</div>
                  <MuscleTargetsSubtree targets={parentTargets} depth={0} readOnly variationTargets={targets} {...mtProps} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  let rootPrimaries: MotionRecord[] = [];
  let orphanVariation: MotionRecord | null = null;

  if (isCurrentParent) {
    rootPrimaries = [currentMotion];
  } else {
    const pm = parentMotions.find(p => p.id === currentMotion.parent_id);
    if (pm) {
      rootPrimaries = [pm];
    } else {
      orphanVariation = currentMotion;
    }
  }

  const renderPrimaryMotionTree = (pm: MotionRecord) => {
    const rootKey = `pm-${pm.id}`;
    const isRootExp = expanded.has(rootKey);
    const current = isCurrent(pm.id);
    const { targets, onChange } = getTargetsAndOnChange(pm.id, pm);
    const relVars = childMotions.filter(v => v.parent_id === pm.id);
    const displayVars = computedFocusVariationId ? relVars.filter(v => v.id === computedFocusVariationId) : relVars;
    const unlinkedVars = allMotions.filter(v =>
      !v.parent_id &&
      v.id !== pm.id &&
      !allMotions.some(c => c.parent_id === v.id)
    );
    const pmMtKey = `mt-pm-${pm.id}`;

    if (computedFocusVariationId && displayVars.length === 1) {
      const variation = displayVars[0];
      const varMtKey = `mt-var-${variation.id}`;
      return (
        <div key={pm.id} className={sp.motionConfig.primaryCard}>
          <div className={`${sp.motionConfig.primaryHeader} ${isCurrent(variation.id) ? sp.motionConfig.primaryHeaderCurrent : ''}`}>
            <button type="button" onClick={() => toggle(varMtKey)} className={sp.toggle.base}>{expanded.has(varMtKey) ? '▼' : '▶'}</button>
            <div className={sp.motionConfig.parentVariationRow}>
              {current ? (
                <span className={sp.motionConfig.primaryLabelCurrent}>{pm.label}</span>
              ) : (
                <Link to="/table/motions" className={sp.link.primary}>{pm.label}</Link>
              )}
              <span className={sp.meta.id}>{pm.id}</span>
              <span className={sp.meta.arrow}>→</span>
              {isCurrent(variation.id) ? (
                <span className={sp.motionConfig.primaryLabelCurrent}>{variation.label}</span>
              ) : (
                <Link to="/table/motions" className={sp.link.primary}>{variation.label}</Link>
              )}
              <span className={sp.meta.id}>{variation.id}</span>
            </div>
            <MuscleTargetsToggle mtKey={varMtKey} targets={getTargetsAndOnChange(variation.id, variation).targets} allMuscles={allMuscles} expanded={expanded} toggle={toggle} />
            <button type="button" onClick={() => removeVariationFromPrimary(variation.id)}
              className={sp.motionConfig.removeVariationBtn}>Remove</button>
          </div>
          {expanded.has(`mt-var-${variation.id}`) && (
            <div className={sp.deltaRules.expandedContent}>
              <div className={sp.deltaRules.scoresRow}>
                <div className={sp.deltaRules.scoresColumnEditable}>
                  <div className={sp.deltaRules.sectionLabel}>Variation Scores</div>
                  <MuscleTargetsSubtree targets={getTargetsAndOnChange(variation.id, variation).targets} depth={0} onChange={getTargetsAndOnChange(variation.id, variation).onChange} {...mtProps} />
                </div>
                {Object.keys(targets).length > 0 && (
                  <div className={sp.deltaRules.scoresColumnReadOnly}>
                    <div className={sp.deltaRules.sectionLabel}>Parent Scores</div>
                    <MuscleTargetsSubtree targets={targets} depth={0} readOnly variationTargets={getTargetsAndOnChange(variation.id, variation).targets} {...mtProps} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    const shouldShowVariationsToggle = !current;

    return (
      <div key={pm.id} className={sp.motionConfig.primaryCard}>
        <div className={`${sp.motionConfig.primaryHeader} ${current ? sp.motionConfig.primaryHeaderCurrent : ''}`}>
          <button type="button" onClick={() => toggle(pmMtKey)} className={sp.toggle.base}>{expanded.has(pmMtKey) ? '▼' : '▶'}</button>
          {shouldShowVariationsToggle && (
            <button type="button" onClick={() => toggle(rootKey)} className={sp.toggle.base}>{isRootExp ? '▼' : '▶'}</button>
          )}
          <div className={sp.motionConfig.primaryLabelContainer}>
            {current ? (
              <span className={sp.motionConfig.primaryLabelCurrent}>{pm.label}</span>
            ) : (
              <Link to="/table/motions" className={sp.link.primary}>{pm.label}</Link>
            )}
            <span className={sp.meta.id}>{pm.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={pmMtKey} targets={targets} allMuscles={allMuscles} expanded={expanded} toggle={toggle} />
        </div>
        {expanded.has(pmMtKey) && (
          <div className={sp.deltaRules.expandedContent}>
            <MuscleTargetsSubtree targets={targets} depth={0} onChange={onChange} {...mtProps} />
          </div>
        )}
        {(current ? true : isRootExp) && (
          <div className={sp.motionConfig.variationsNest}>
            {displayVars.map(v => renderVariation(v, `pm-${pm.id}`, targets))}
            {!computedFocusVariationId && (
              <div className={sp.motionConfig.addVariationSection}>
                <select value="" onChange={async e => { if (e.target.value) await addVariationToPrimary(pm.id, e.target.value); }}
                  className={sp.motionConfig.addVariationDropdown}>
                  <option value="">Add Motion Variation...</option>
                  {unlinkedVars.map(v => <option key={v.id} value={v.id}>{v.label} ({v.id})</option>)}
                </select>
                <div className={sp.motionConfig.inlineCreatorButtonWrapper}>
                  <InlineVariationCreator onCreate={data => createVariation(pm.id, data)} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderOrphanVariation = (v: MotionRecord) => {
    const rootKey = `orphan-var-${v.id}`;
    const isRootExp = expanded.has(rootKey);
    const { targets, onChange } = getTargetsAndOnChange(v.id, v);
    const orphanVarMtKey = `mt-orphan-var-${v.id}`;

    return (
      <div className={sp.motionConfig.orphanCard}>
        <div className={sp.motionConfig.orphanHeader}>
          <button type="button" onClick={() => toggle(orphanVarMtKey)} className={sp.toggle.base}>{expanded.has(orphanVarMtKey) ? '▼' : '▶'}</button>
          <button type="button" onClick={() => toggle(rootKey)} className={sp.toggle.base}>{isRootExp ? '▼' : '▶'}</button>
          <div className={sp.motionConfig.orphanLabelContainer}>
            <span className={sp.motionConfig.orphanLabel}>No Parent Motion</span>
            <span className={sp.meta.arrow}>→</span>
            <span className={sp.motionConfig.orphanLabelCurrent}>{v.label}</span>
            <span className={sp.meta.id}>{v.id}</span>
          </div>
          <MuscleTargetsToggle mtKey={orphanVarMtKey} targets={targets} allMuscles={allMuscles} expanded={expanded} toggle={toggle} />
        </div>
        {expanded.has(orphanVarMtKey) && (
          <div className={sp.deltaRules.expandedContent}>
            <MuscleTargetsSubtree targets={targets} depth={0} onChange={onChange} {...mtProps} />
          </div>
        )}
        {isRootExp && (
          <div className={sp.motionConfig.variationsNest}>
            <select value="" onChange={async e => { if (e.target.value) await setPrimaryForVariation(v.id, e.target.value); }}
              className={sp.motionConfig.setParentDropdown}>
              <option value="">Set Parent Motion...</option>
              {parentMotions.map(p => <option key={p.id} value={p.id}>{p.label} ({p.id})</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={sp.motionConfig.container}>
      {rootPrimaries.map(pm => renderPrimaryMotionTree(pm))}
      {orphanVariation && renderOrphanVariation(orphanVariation)}

      {computedFocusVariationId && groupedMotions.length > 0 && (
        <select value="" onChange={async e => {
          if (e.target.value) await setPrimaryForVariation(computedFocusVariationId!, e.target.value);
        }}
          className={sp.motionConfig.setParentDropdown}>
          <option value="">{rootPrimaries.length > 0 ? 'Move to another Motion...' : 'Set Parent Motion...'}</option>
          {groupedMotions.map(group => (
            <optgroup key={group.primaryId} label={group.primaryLabel} className={sp.deltaRules.addMotionOptgroup}>
              {group.motions.map(({ motion, isPrimary }) => (
                <option key={motion.id} value={motion.id} className={isPrimary ? sp.deltaRules.addMotionOption : sp.deltaRules.addMotionOptionIndented}>
                  {motion.label} ({motion.id})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}
    </div>
  );
}

function InlineVariationCreator({ onCreate }: { onCreate: (data: Record<string, unknown>) => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [newVar, setNewVar] = useState({ id: '', label: '', short_description: '' });
  const [creating, setCreating] = useState(false);

  if (!showForm) {
    return (
      <button type="button" onClick={() => setShowForm(true)}
        className={sp.motionConfig.inlineCreatorButton}>
        + Create New Variation
      </button>
    );
  }

  return (
    <div className={sp.motionConfig.inlineCreatorForm}>
      <div className={sp.motionConfig.inlineCreatorRow}>
        <input type="text" placeholder="ID" value={newVar.id} onChange={e => setNewVar({ ...newVar, id: e.target.value })}
          className={`${sp.motionConfig.inlineCreatorInput} ${sp.motionConfig.inlineCreatorInputFlex1}`} />
        <input type="text" placeholder="Label" value={newVar.label} onChange={e => setNewVar({ ...newVar, label: e.target.value })}
          className={`${sp.motionConfig.inlineCreatorInput} ${sp.motionConfig.inlineCreatorInputFlex1}`} />
      </div>
      <input type="text" placeholder="Short Description" value={newVar.short_description}
        onChange={e => setNewVar({ ...newVar, short_description: e.target.value })}
        className={`${sp.motionConfig.inlineCreatorInput} ${sp.motionConfig.inlineCreatorInputFull}`} />
      <div className={sp.motionConfig.inlineCreatorRow}>
        <button type="button" disabled={!newVar.id || !newVar.label || creating}
          onClick={async () => {
            setCreating(true);
            await onCreate({ id: newVar.id, label: newVar.label, common_names: [], short_description: newVar.short_description, muscle_targets: {}, sort_order: 0, is_active: true });
            setNewVar({ id: '', label: '', short_description: '' }); setShowForm(false); setCreating(false);
          }}
          className={sp.motionConfig.inlineCreatorCreateBtn}>{creating ? '...' : 'Create'}</button>
        <button type="button" onClick={() => setShowForm(false)} className={sp.motionConfig.inlineCreatorCancelBtn}>Cancel</button>
      </div>
    </div>
  );
}
