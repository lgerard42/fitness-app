import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

type MotionTableKey = 'primaryMotions' | 'primaryMotionVariations' | 'motionPlanes';

interface MotionHierarchyFieldProps {
  tableKey: MotionTableKey;
  currentRecordId: string;
  onFieldsChange: (fields: Record<string, unknown>) => void;
}

interface MotionRecord {
  id: string;
  label: string;
  primary_motion_ids?: string | string[];
  motion_variation_ids?: string[];
  motion_plane_ids?: string[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Recompute helpers
// ---------------------------------------------------------------------------

function recomputeAllDerived(
  primaries: MotionRecord[],
  variations: MotionRecord[],
  planes: MotionRecord[]
) {
  // primaryMotions: motion_variation_ids and motion_plane_ids are derived
  for (const p of primaries) {
    const relVars = variations.filter(v => v.primary_motion_ids === p.id);
    p.motion_variation_ids = relVars.map(v => v.id);
    const planeSet = new Set<string>();
    for (const v of relVars) {
      (v.motion_plane_ids || []).forEach(mp => planeSet.add(mp));
    }
    p.motion_plane_ids = [...planeSet];
  }

  // motionPlanes: motion_variation_ids and primary_motion_ids are derived
  for (const mp of planes) {
    const relVars = variations.filter(v => (v.motion_plane_ids || []).includes(mp.id));
    mp.motion_variation_ids = relVars.map(v => v.id);
    const pmIds: string[] = [];
    for (const v of relVars) {
      const pmId = v.primary_motion_ids;
      if (typeof pmId === 'string' && pmId) {
        pmIds.push(pmId);
      } else if (Array.isArray(pmId)) {
        pmIds.push(...pmId.filter(Boolean));
      }
    }
    mp.primary_motion_ids = [...new Set(pmIds)];
  }
}

function getCurrentRecordFields(tableKey: MotionTableKey, record: MotionRecord): Record<string, unknown> {
  if (tableKey === 'primaryMotions') {
    return { motion_variation_ids: record.motion_variation_ids || [], motion_plane_ids: record.motion_plane_ids || [] };
  } else if (tableKey === 'primaryMotionVariations') {
    return { primary_motion_ids: record.primary_motion_ids || '', motion_plane_ids: record.motion_plane_ids || [] };
  } else {
    return { motion_variation_ids: record.motion_variation_ids || [], primary_motion_ids: record.primary_motion_ids || [] };
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MotionHierarchyField({ tableKey, currentRecordId, onFieldsChange }: MotionHierarchyFieldProps) {
  const [primaryMotions, setPrimaryMotions] = useState<MotionRecord[]>([]);
  const [variations, setVariations] = useState<MotionRecord[]>([]);
  const [motionPlanes, setMotionPlanes] = useState<MotionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadAllData = useCallback(async () => {
    try {
      const [p, v, m] = await Promise.all([
        api.getTable('primaryMotions'),
        api.getTable('primaryMotionVariations'),
        api.getTable('motionPlanes'),
      ]);
      setPrimaryMotions((p as MotionRecord[]) || []);
      setVariations((v as MotionRecord[]) || []);
      setMotionPlanes((m as MotionRecord[]) || []);
    } catch (err) {
      console.error('Failed to load motion data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Sync: after a canonical FK change, recompute everything and save other tables
  // -------------------------------------------------------------------------
  const syncAfterChange = useCallback(async (
    updatedPrimaries: MotionRecord[],
    updatedVariations: MotionRecord[],
    updatedPlanes: MotionRecord[]
  ) => {
    recomputeAllDerived(updatedPrimaries, updatedVariations, updatedPlanes);

    try {
      const saves: Promise<unknown>[] = [];
      if (tableKey !== 'primaryMotions') saves.push(api.putTable('primaryMotions', updatedPrimaries));
      if (tableKey !== 'primaryMotionVariations') saves.push(api.putTable('primaryMotionVariations', updatedVariations));
      if (tableKey !== 'motionPlanes') saves.push(api.putTable('motionPlanes', updatedPlanes));
      await Promise.all(saves);
    } catch (err) {
      console.error('Failed to sync motion hierarchy:', err);
    }

    // Save other records in the current table (not the current record)
    const currentTable = tableKey === 'primaryMotions' ? updatedPrimaries
      : tableKey === 'primaryMotionVariations' ? updatedVariations : updatedPlanes;
    for (const rec of currentTable) {
      if (rec.id !== currentRecordId) {
        try {
          await api.updateRow(tableKey, rec.id, rec);
        } catch { /* skip */ }
      }
    }

    setPrimaryMotions([...updatedPrimaries]);
    setVariations([...updatedVariations]);
    setMotionPlanes([...updatedPlanes]);

    const current = currentTable.find(r => r.id === currentRecordId);
    if (current) {
      onFieldsChange(getCurrentRecordFields(tableKey, current));
    }
  }, [tableKey, currentRecordId, onFieldsChange]);

  // -------------------------------------------------------------------------
  // Link / unlink operations
  // -------------------------------------------------------------------------

  // Primary Motions: add/remove variation
  const addVariationToPrimary = useCallback(async (primaryId: string, variationId: string) => {
    const vars = variations.map(v =>
      v.id === variationId ? { ...v, primary_motion_ids: primaryId } : { ...v }
    );
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vars, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  const removeVariationFromPrimary = useCallback(async (_primaryId: string, variationId: string) => {
    const vars = variations.map(v =>
      v.id === variationId ? { ...v, primary_motion_ids: '' } : { ...v }
    );
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vars, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  // Variations: change primary motion
  const setPrimaryForVariation = useCallback(async (variationId: string, primaryId: string) => {
    const vars = variations.map(v =>
      v.id === variationId ? { ...v, primary_motion_ids: primaryId } : { ...v }
    );
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vars, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  const removePrimaryFromVariation = useCallback(async (variationId: string) => {
    const vars = variations.map(v =>
      v.id === variationId ? { ...v, primary_motion_ids: '' } : { ...v }
    );
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vars, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  // Variations: add/remove motion plane
  const addPlaneToVariation = useCallback(async (variationId: string, planeId: string) => {
    const vars = variations.map(v =>
      v.id === variationId ? { ...v, motion_plane_ids: [...(v.motion_plane_ids || []), planeId] } : { ...v }
    );
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vars, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  const removePlaneFromVariation = useCallback(async (variationId: string, planeId: string) => {
    const vars = variations.map(v =>
      v.id === variationId ? { ...v, motion_plane_ids: (v.motion_plane_ids || []).filter(id => id !== planeId) } : { ...v }
    );
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vars, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  // Motion Planes: add/remove variation link
  const addVariationToPlane = useCallback(async (planeId: string, variationId: string) => {
    const vars = variations.map(v =>
      v.id === variationId ? { ...v, motion_plane_ids: [...(v.motion_plane_ids || []), planeId] } : { ...v }
    );
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vars, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  const removeVariationFromPlane = useCallback(async (planeId: string, variationId: string) => {
    const vars = variations.map(v =>
      v.id === variationId ? { ...v, motion_plane_ids: (v.motion_plane_ids || []).filter(id => id !== planeId) } : { ...v }
    );
    await syncAfterChange(primaryMotions.map(p => ({ ...p })), vars, motionPlanes.map(m => ({ ...m })));
  }, [primaryMotions, variations, motionPlanes, syncAfterChange]);

  // Create a new variation for a primary motion
  const createVariationForPrimary = useCallback(async (primaryId: string, newData: Record<string, unknown>) => {
    try {
      await api.addRow('primaryMotionVariations', { ...newData, primary_motion_ids: primaryId, motion_plane_ids: [] });
      const [p, v, m] = await Promise.all([
        api.getTable('primaryMotions') as Promise<MotionRecord[]>,
        api.getTable('primaryMotionVariations') as Promise<MotionRecord[]>,
        api.getTable('motionPlanes') as Promise<MotionRecord[]>,
      ]);
      await syncAfterChange(p, v, m);
    } catch (err) {
      console.error('Failed to create variation:', err);
      alert('Failed to create variation. Please try again.');
    }
  }, [syncAfterChange]);

  // Create a new motion plane and link it to a variation
  const createPlaneForVariation = useCallback(async (variationId: string, newData: Record<string, unknown>) => {
    try {
      await api.addRow('motionPlanes', { ...newData });
      // After creation, add the new plane to the variation's motion_plane_ids
      const allPlanes = await api.getTable('motionPlanes') as MotionRecord[];
      const newPlane = allPlanes.find(p => p.id === newData.id);
      if (newPlane) {
        const vars = variations.map(v =>
          v.id === variationId ? { ...v, motion_plane_ids: [...(v.motion_plane_ids || []), String(newData.id)] } : { ...v }
        );
        await syncAfterChange(primaryMotions.map(p => ({ ...p })), vars, allPlanes);
      }
    } catch (err) {
      console.error('Failed to create motion plane:', err);
      alert('Failed to create motion plane. Please try again.');
    }
  }, [primaryMotions, variations, syncAfterChange]);

  // -------------------------------------------------------------------------
  // Build hierarchy items for display
  // -------------------------------------------------------------------------

  const hierarchyItems = useMemo(() => {
    if (loading) return [];

    if (tableKey === 'primaryMotions') {
      // Show variations (expandable to show motion planes)
      const current = primaryMotions.find(p => p.id === currentRecordId);
      if (!current) return [];
      const relatedVars = variations.filter(v => v.primary_motion_ids === currentRecordId);
      return relatedVars.map(v => ({
        type: 'primary-view' as const,
        variation: v,
        planes: motionPlanes.filter(mp => (v.motion_plane_ids || []).includes(mp.id)),
      }));
    }

    if (tableKey === 'primaryMotionVariations') {
      // Show parent primary motion with current variation and child motion planes
      const current = variations.find(v => v.id === currentRecordId);
      if (!current) return [];
      const primary = current.primary_motion_ids
        ? primaryMotions.find(p => p.id === current.primary_motion_ids)
        : null;
      const planes = motionPlanes.filter(mp => (current.motion_plane_ids || []).includes(mp.id));
      return [{
        type: 'variation-view' as const,
        primary: primary || null,
        variation: current,
        planes,
      }];
    }

    // motionPlanes: show variations and their primaries that reference this plane
    const current = motionPlanes.find(mp => mp.id === currentRecordId);
    if (!current) return [];
    const relatedVars = variations.filter(v => (v.motion_plane_ids || []).includes(currentRecordId));
    return relatedVars.map(v => {
      const primary = v.primary_motion_ids ? primaryMotions.find(p => p.id === v.primary_motion_ids) : null;
      return {
        type: 'plane-view' as const,
        variation: v,
        primary: primary || null,
        plane: current,
      };
    });
  }, [tableKey, currentRecordId, primaryMotions, variations, motionPlanes, loading]);

  // Available items for "Add" dropdowns
  const availableAddOptions = useMemo(() => {
    if (tableKey === 'primaryMotions') {
      // Can add variations that don't already belong to this primary
      const linkedVarIds = variations.filter(v => v.primary_motion_ids === currentRecordId).map(v => v.id);
      return { type: 'variations' as const, items: variations.filter(v => !linkedVarIds.includes(v.id) && !v.primary_motion_ids) };
    }
    if (tableKey === 'primaryMotionVariations') {
      // Can change primary motion
      const current = variations.find(v => v.id === currentRecordId);
      return { type: 'primaries' as const, items: primaryMotions.filter(p => p.id !== current?.primary_motion_ids) };
    }
    // motionPlanes: can add variations that don't already use this plane
    const linkedVarIds = variations.filter(v => (v.motion_plane_ids || []).includes(currentRecordId)).map(v => v.id);
    return { type: 'variations' as const, items: variations.filter(v => !linkedVarIds.includes(v.id)) };
  }, [tableKey, currentRecordId, primaryMotions, variations, motionPlanes]);

  if (loading) {
    return <div className="text-xs text-gray-400 py-2">Loading motion data...</div>;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-3">
      {/* Primary Motions: list of variations with nested motion planes */}
      {tableKey === 'primaryMotions' && hierarchyItems.map((item) => {
        if (item.type !== 'primary-view') return null;
        const { variation, planes } = item;
        const key = `var-${variation.id}`;
        const isExp = expanded.has(key);
        return (
          <div key={variation.id} className="bg-white border rounded-lg">
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <button type="button" onClick={() => toggleExpand(key)} className="text-xs text-gray-500 w-4 flex-shrink-0 hover:text-gray-700">
                  {isExp ? '▼' : '▶'}
                </button>
                <Link to={`/table/primaryMotionVariations`} className="text-sm font-medium text-blue-600 hover:underline">{variation.label}</Link>
                <span className="text-xs text-gray-400">{variation.id}</span>
                {planes.length > 0 && <span className="text-xs text-gray-400 ml-auto">({planes.length} plane{planes.length !== 1 ? 's' : ''})</span>}
              </div>
              <button type="button" onClick={() => removeVariationFromPrimary(currentRecordId, variation.id)}
                className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded ml-2">Remove</button>
            </div>
            {isExp && (
              <div className="border-t bg-gray-50">
                {planes.map(mp => (
                  <div key={mp.id} className="px-3 py-1.5 pl-8">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">•</span>
                      <Link to={`/table/motionPlanes`} className="text-sm text-blue-600 hover:underline">{mp.label}</Link>
                      <span className="text-xs text-gray-400">{mp.id}</span>
                    </div>
                  </div>
                ))}
                <MotionPlaneAdder
                  currentVariationId={variation.id}
                  existingPlaneIds={planes.map(mp => mp.id)}
                  allMotionPlanes={motionPlanes}
                  onAdd={(planeId) => addPlaneToVariation(variation.id, planeId)}
                  onCreate={(data) => createPlaneForVariation(variation.id, data)}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Variation: show primary motion → current variation → motion planes */}
      {tableKey === 'primaryMotionVariations' && hierarchyItems.map((item) => {
        if (item.type !== 'variation-view') return null;
        const { primary, variation, planes } = item;
        const key = `var-${variation.id}-pri-${primary?.id || 'none'}`;
        const isExp = expanded.has(key);
        return (
          <div key={primary?.id || 'no-primary'} className="bg-white border rounded-lg">
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <button type="button" onClick={() => toggleExpand(key)} className="text-xs text-gray-500 w-4 flex-shrink-0 hover:text-gray-700">
                  {isExp ? '▼' : '▶'}
                </button>
                {primary ? (
                  <Link to={`/table/primaryMotions`} className="text-sm font-medium text-blue-600 hover:underline">{primary.label}</Link>
                ) : (
                  <span className="text-xs text-gray-400 italic">No primary motion</span>
                )}
                {primary && <span className="text-xs text-gray-400">{primary.id}</span>}
                <span className="text-xs text-gray-400">→</span>
                <span className="text-sm font-medium text-gray-700">{variation.label}</span>
                <span className="text-xs text-gray-400">{variation.id}</span>
                {planes.length > 0 && <span className="text-xs text-gray-400 ml-auto">({planes.length} plane{planes.length !== 1 ? 's' : ''})</span>}
              </div>
              {primary && (
                <button type="button" onClick={() => removePrimaryFromVariation(currentRecordId)}
                  className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded ml-2">Remove</button>
              )}
            </div>
            {isExp && (
              <div className="border-t bg-gray-50">
                {planes.map(mp => (
                  <div key={mp.id} className="px-3 py-1.5 pl-8">
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">•</span>
                        <Link to={`/table/motionPlanes`} className="text-sm text-blue-600 hover:underline">{mp.label}</Link>
                        <span className="text-xs text-gray-400">{mp.id}</span>
                      </div>
                      <button type="button" onClick={() => removePlaneFromVariation(currentRecordId, mp.id)}
                        className="text-xs text-red-600 hover:text-red-800 px-1 py-0.5 hover:bg-red-50 rounded">×</button>
                    </div>
                  </div>
                ))}
                <MotionPlaneAdder
                  currentVariationId={variation.id}
                  existingPlaneIds={planes.map(mp => mp.id)}
                  allMotionPlanes={motionPlanes}
                  onAdd={(planeId) => addPlaneToVariation(currentRecordId, planeId)}
                  onCreate={(data) => createPlaneForVariation(currentRecordId, data)}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Motion Planes: list of variations (with their primaries) that use this plane */}
      {tableKey === 'motionPlanes' && hierarchyItems.map((item) => {
        if (item.type !== 'plane-view') return null;
        const { variation, primary, plane } = item;
        return (
          <div key={variation.id} className="bg-white border rounded-lg">
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                {primary ? (
                  <Link to={`/table/primaryMotions`} className="text-sm font-medium text-blue-600 hover:underline">{primary.label}</Link>
                ) : (
                  <span className="text-xs text-gray-400 italic">No primary</span>
                )}
                <span className="text-xs text-gray-400">→</span>
                <Link to={`/table/primaryMotionVariations`} className="text-sm font-medium text-blue-600 hover:underline">{variation.label}</Link>
                <span className="text-xs text-gray-400">→</span>
                <span className="text-sm font-medium text-gray-700">{plane.label}</span>
                <span className="text-xs text-gray-400">{plane.id}</span>
              </div>
              <button type="button" onClick={() => removeVariationFromPlane(currentRecordId, variation.id)}
                className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded ml-2">Remove</button>
            </div>
          </div>
        );
      })}

      {/* Add dropdown */}
      {tableKey === 'primaryMotions' && (
        <div className="flex flex-row gap-2 items-stretch">
          <select
            value=""
            onChange={async (e) => {
              if (!e.target.value) return;
              await addVariationToPrimary(currentRecordId, e.target.value);
            }}
            className="flex-grow min-w-0 px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Add Motion Variation...</option>
            {(availableAddOptions.type === 'variations' ? availableAddOptions.items : []).map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label} ({opt.id})</option>
            ))}
          </select>
          <div className="flex-shrink min-w-fit">
            <VariationCreator
              onCreateVariation={(data) => createVariationForPrimary(currentRecordId, data)}
            />
          </div>
        </div>
      )}

      {tableKey === 'primaryMotionVariations' && !variations.find(v => v.id === currentRecordId)?.primary_motion_ids && (
        <select
          value=""
          onChange={async (e) => {
            if (!e.target.value) return;
            await setPrimaryForVariation(currentRecordId, e.target.value);
          }}
          className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Set Primary Motion...</option>
          {(availableAddOptions.type === 'primaries' ? availableAddOptions.items : []).map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label} ({opt.id})</option>
          ))}
        </select>
      )}

      {tableKey === 'motionPlanes' && (
        <select
          value=""
          onChange={async (e) => {
            if (!e.target.value) return;
            await addVariationToPlane(currentRecordId, e.target.value);
          }}
          className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Add Variation...</option>
          {(availableAddOptions.type === 'variations' ? availableAddOptions.items : []).map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label} ({opt.id})</option>
          ))}
        </select>
      )}

      {hierarchyItems.length === 0 && (
        <div className="text-xs text-gray-400 py-2 italic">
          No motion relationships linked. Use the dropdown above to add one.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MotionPlaneAdder sub-component
// ---------------------------------------------------------------------------

interface MotionPlaneAdderProps {
  currentVariationId: string;
  existingPlaneIds: string[];
  allMotionPlanes: MotionRecord[];
  onAdd: (planeId: string) => Promise<void>;
  onCreate: (data: Record<string, unknown>) => Promise<void>;
}

function MotionPlaneAdder({ currentVariationId, existingPlaneIds, allMotionPlanes, onAdd, onCreate }: MotionPlaneAdderProps) {
  const [selectedPlaneId, setSelectedPlaneId] = useState('');
  const [adding, setAdding] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlane, setNewPlane] = useState({ id: '', label: '', sub_label: '', short_description: '' });
  const [creating, setCreating] = useState(false);

  const availablePlanes = useMemo(() => {
    return allMotionPlanes.filter(mp => !existingPlaneIds.includes(mp.id));
  }, [allMotionPlanes, existingPlaneIds]);

  const handleAdd = async () => {
    if (!selectedPlaneId) return;
    setAdding(true);
    try {
      await onAdd(selectedPlaneId);
      setSelectedPlaneId('');
    } catch (err) {
      console.error('Failed to add motion plane:', err);
      alert('Failed to add motion plane.');
    } finally {
      setAdding(false);
    }
  };

  const handleCreate = async () => {
    if (!newPlane.id || !newPlane.label) {
      alert('ID and Label are required.');
      return;
    }
    setCreating(true);
    try {
      await onCreate({
        id: newPlane.id,
        label: newPlane.label,
        sub_label: newPlane.sub_label,
        common_names: [],
        short_description: newPlane.short_description,
        sort_order: 0,
        is_active: true,
      });
      setNewPlane({ id: '', label: '', sub_label: '', short_description: '' });
      setShowCreateForm(false);
    } catch (err) {
      console.error('Failed to create motion plane:', err);
      alert('Failed to create motion plane.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="px-3 py-2 pl-8 border-t bg-white">
      {!showCreateForm ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">+</span>
          <select
            value={selectedPlaneId}
            onChange={e => setSelectedPlaneId(e.target.value)}
            disabled={adding}
            className="flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
          >
            <option value="">Add Motion Plane...</option>
            {availablePlanes.map(mp => (
              <option key={mp.id} value={mp.id}>{mp.label} ({mp.id})</option>
            ))}
          </select>
          <button type="button" onClick={handleAdd} disabled={!selectedPlaneId || adding}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {adding ? 'Adding...' : 'Add'}
          </button>
          <button type="button" onClick={() => setShowCreateForm(true)}
            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Create</button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">New:</span>
            <input type="text" placeholder="ID (required)" value={newPlane.id}
              onChange={e => setNewPlane({ ...newPlane, id: e.target.value })}
              className="flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            <input type="text" placeholder="Label (required)" value={newPlane.label}
              onChange={e => setNewPlane({ ...newPlane, label: e.target.value })}
              className="flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Sub Label (optional)" value={newPlane.sub_label}
              onChange={e => setNewPlane({ ...newPlane, sub_label: e.target.value })}
              className="flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            <input type="text" placeholder="Short Description (optional)" value={newPlane.short_description}
              onChange={e => setNewPlane({ ...newPlane, short_description: e.target.value })}
              className="flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleCreate} disabled={!newPlane.id || !newPlane.label || creating}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowCreateForm(false); setNewPlane({ id: '', label: '', sub_label: '', short_description: '' }); }}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VariationCreator sub-component (for creating new variations from primary motion view)
// ---------------------------------------------------------------------------

interface VariationCreatorProps {
  onCreateVariation: (data: Record<string, unknown>) => Promise<void>;
}

function VariationCreator({ onCreateVariation }: VariationCreatorProps) {
  const [showForm, setShowForm] = useState(false);
  const [newVar, setNewVar] = useState({ id: '', label: '', short_description: '' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newVar.id || !newVar.label) {
      alert('ID and Label are required.');
      return;
    }
    setCreating(true);
    try {
      await onCreateVariation({
        id: newVar.id,
        label: newVar.label,
        common_names: [],
        short_description: newVar.short_description,
        muscle_targets: {},
        sort_order: 0,
        is_active: true,
      });
      setNewVar({ id: '', label: '', short_description: '' });
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create variation:', err);
      alert('Failed to create variation.');
    } finally {
      setCreating(false);
    }
  };

  if (!showForm) {
    return (
      <button type="button" onClick={() => setShowForm(true)}
        className="whitespace-nowrap px-3 py-2 text-xs bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100">
        + Create New Variation
      </button>
    );
  }

  return (
    <div className="border rounded p-3 space-y-2 bg-green-50">
      <div className="flex items-center gap-2">
        <input type="text" placeholder="ID (required)" value={newVar.id}
          onChange={e => setNewVar({ ...newVar, id: e.target.value })}
          className="flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-green-500 focus:outline-none" />
        <input type="text" placeholder="Label (required)" value={newVar.label}
          onChange={e => setNewVar({ ...newVar, label: e.target.value })}
          className="flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-green-500 focus:outline-none" />
      </div>
      <input type="text" placeholder="Short Description (optional)" value={newVar.short_description}
        onChange={e => setNewVar({ ...newVar, short_description: e.target.value })}
        className="w-full px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-green-500 focus:outline-none" />
      <div className="flex items-center gap-2">
        <button type="button" onClick={handleCreate} disabled={!newVar.id || !newVar.label || creating}
          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {creating ? 'Creating...' : 'Create'}
        </button>
        <button type="button" onClick={() => { setShowForm(false); setNewVar({ id: '', label: '', short_description: '' }); }}
          className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Cancel</button>
      </div>
    </div>
  );
}
