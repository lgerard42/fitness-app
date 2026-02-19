import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

type MotionTableKey = 'primaryMotions' | 'primaryMotionVariations';

interface MotionHierarchyFieldProps {
  tableKey: MotionTableKey;
  currentRecordId: string;
  onFieldsChange: (fields: Record<string, unknown>) => void;
}

interface MotionRecord {
  id: string;
  label: string;
  primary_motion_key?: string;
  [key: string]: unknown;
}

function getCurrentRecordFields(tableKey: MotionTableKey, record: MotionRecord): Record<string, unknown> {
  if (tableKey === 'primaryMotionVariations') {
    return { primary_motion_key: record.primary_motion_key || '' };
  }
  return {};
}

export default function MotionHierarchyField({ tableKey, currentRecordId, onFieldsChange }: MotionHierarchyFieldProps) {
  const [primaryMotions, setPrimaryMotions] = useState<MotionRecord[]>([]);
  const [variations, setVariations] = useState<MotionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    try {
      const [p, v] = await Promise.all([
        api.getTable('primaryMotions'),
        api.getTable('primaryMotionVariations'),
      ]);
      setPrimaryMotions((p as MotionRecord[]) || []);
      setVariations((v as MotionRecord[]) || []);
    } catch (err) {
      console.error('Failed to load motion data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const syncAfterChange = useCallback(async (
    updatedVariations: MotionRecord[]
  ) => {
    try {
      await api.putTable('primaryMotionVariations', updatedVariations);
    } catch (err) {
      console.error('Failed to sync motion hierarchy:', err);
    }

    setVariations([...updatedVariations]);

    if (tableKey === 'primaryMotionVariations') {
      const current = updatedVariations.find(r => r.id === currentRecordId);
      if (current) onFieldsChange(getCurrentRecordFields(tableKey, current));
    }
  }, [tableKey, currentRecordId, onFieldsChange]);

  const addVariationToPrimary = useCallback(async (_primaryId: string, variationId: string) => {
    const vars = variations.map(v =>
      v.id === variationId ? { ...v, primary_motion_key: _primaryId } : { ...v }
    );
    await syncAfterChange(vars);
  }, [variations, syncAfterChange]);

  const removeVariationFromPrimary = useCallback(async (_primaryId: string, variationId: string) => {
    const vars = variations.map(v =>
      v.id === variationId ? { ...v, primary_motion_key: '' } : { ...v }
    );
    await syncAfterChange(vars);
  }, [variations, syncAfterChange]);

  const setPrimaryForVariation = useCallback(async (variationId: string, primaryId: string) => {
    const vars = variations.map(v =>
      v.id === variationId ? { ...v, primary_motion_key: primaryId } : { ...v }
    );
    await syncAfterChange(vars);
  }, [variations, syncAfterChange]);

  const removePrimaryFromVariation = useCallback(async (variationId: string) => {
    const vars = variations.map(v =>
      v.id === variationId ? { ...v, primary_motion_key: '' } : { ...v }
    );
    await syncAfterChange(vars);
  }, [variations, syncAfterChange]);

  const createVariationForPrimary = useCallback(async (primaryId: string, newData: Record<string, unknown>) => {
    try {
      await api.addRow('primaryMotionVariations', { ...newData, primary_motion_key: primaryId });
      const v = await api.getTable('primaryMotionVariations') as MotionRecord[];
      setVariations(v);
    } catch (err) {
      console.error('Failed to create variation:', err);
      alert('Failed to create variation. Please try again.');
    }
  }, []);

  const hierarchyItems = useMemo(() => {
    if (loading) return [];

    if (tableKey === 'primaryMotions') {
      const relatedVars = variations.filter(v => v.primary_motion_key === currentRecordId);
      return relatedVars.map(v => ({
        type: 'primary-view' as const,
        variation: v,
      }));
    }

    const current = variations.find(v => v.id === currentRecordId);
    if (!current) return [];
    const primary = current.primary_motion_key
      ? primaryMotions.find(p => p.id === current.primary_motion_key)
      : null;
    return [{
      type: 'variation-view' as const,
      primary: primary || null,
      variation: current,
    }];
  }, [tableKey, currentRecordId, primaryMotions, variations, loading]);

  const availableAddOptions = useMemo(() => {
    if (tableKey === 'primaryMotions') {
      const linkedVarIds = variations.filter(v => v.primary_motion_key === currentRecordId).map(v => v.id);
      return { type: 'variations' as const, items: variations.filter(v => !linkedVarIds.includes(v.id) && !v.primary_motion_key) };
    }
    const current = variations.find(v => v.id === currentRecordId);
    return { type: 'primaries' as const, items: primaryMotions.filter(p => p.id !== current?.primary_motion_key) };
  }, [tableKey, currentRecordId, primaryMotions, variations]);

  if (loading) {
    return <div className="text-xs text-gray-400 py-2">Loading motion data...</div>;
  }

  return (
    <div className="space-y-3">
      {tableKey === 'primaryMotions' && hierarchyItems.map((item) => {
        if (item.type !== 'primary-view') return null;
        const { variation } = item;
        return (
          <div key={variation.id} className="bg-white border rounded-lg">
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <Link to={`/table/primaryMotionVariations`} className="text-sm font-medium text-blue-600 hover:underline">{variation.label}</Link>
                <span className="text-xs text-gray-400">{variation.id}</span>
              </div>
              <button type="button" onClick={() => removeVariationFromPrimary(currentRecordId, variation.id)}
                className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded ml-2">Remove</button>
            </div>
          </div>
        );
      })}

      {tableKey === 'primaryMotionVariations' && hierarchyItems.map((item) => {
        if (item.type !== 'variation-view') return null;
        const { primary, variation } = item;
        return (
          <div key={primary?.id || 'no-primary'} className="bg-white border rounded-lg">
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                {primary ? (
                  <Link to={`/table/primaryMotions`} className="text-sm font-medium text-blue-600 hover:underline">{primary.label}</Link>
                ) : (
                  <span className="text-xs text-gray-400 italic">No parent motion</span>
                )}
                {primary && <span className="text-xs text-gray-400">{primary.id}</span>}
                <span className="text-xs text-gray-400">→</span>
                <span className="text-sm font-medium text-gray-700">{variation.label}</span>
                <span className="text-xs text-gray-400">{variation.id}</span>
              </div>
              {primary && (
                <button type="button" onClick={() => removePrimaryFromVariation(currentRecordId)}
                  className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded ml-2">Remove</button>
              )}
            </div>
          </div>
        );
      })}

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

      {tableKey === 'primaryMotionVariations' && !variations.find(v => v.id === currentRecordId)?.primary_motion_key && (
        <select
          value=""
          onChange={async (e) => {
            if (!e.target.value) return;
            await setPrimaryForVariation(currentRecordId, e.target.value);
          }}
          className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Set Parent Motion...</option>
          {(availableAddOptions.type === 'primaries' ? availableAddOptions.items : []).map(opt => (
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
        motion_planes: {},
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
