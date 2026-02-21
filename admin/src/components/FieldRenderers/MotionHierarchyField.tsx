import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { sp } from '../../styles/sidePanelStyles';

type MotionTableKey = 'motions';

interface MotionHierarchyFieldProps {
  tableKey: MotionTableKey;
  currentRecordId: string;
  onFieldsChange: (fields: Record<string, unknown>) => void;
}

interface MotionRecord {
  id: string;
  label: string;
  parent_id?: string | null;
  [key: string]: unknown;
}

export default function MotionHierarchyField({ tableKey: _tableKey, currentRecordId, onFieldsChange }: MotionHierarchyFieldProps) {
  const [allMotions, setAllMotions] = useState<MotionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    try {
      const motions = await api.getTable('motions');
      setAllMotions((motions as MotionRecord[]) || []);
    } catch (err) {
      console.error('Failed to load motion data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const parentMotions = useMemo(() => allMotions.filter(m => !m.parent_id), [allMotions]);
  const childMotions = useMemo(() => allMotions.filter(m => !!m.parent_id), [allMotions]);

  const currentMotion = useMemo(() => allMotions.find(m => m.id === currentRecordId), [allMotions, currentRecordId]);
  const isCurrentParent = !currentMotion?.parent_id;

  const addVariationToPrimary = useCallback(async (_primaryId: string, variationId: string) => {
    try {
      await api.updateRow('motions', variationId, { parent_id: _primaryId });
      await loadAllData();
    } catch (err) {
      console.error('Failed to link variation:', err);
    }
  }, [loadAllData]);

  const removeVariationFromPrimary = useCallback(async (_primaryId: string, variationId: string) => {
    try {
      await api.updateRow('motions', variationId, { parent_id: null });
      if (variationId === currentRecordId) {
        onFieldsChange({ parent_id: null });
      }
      await loadAllData();
    } catch (err) {
      console.error('Failed to unlink variation:', err);
    }
  }, [loadAllData, currentRecordId, onFieldsChange]);

  const setPrimaryForVariation = useCallback(async (variationId: string, primaryId: string) => {
    try {
      await api.updateRow('motions', variationId, { parent_id: primaryId });
      if (variationId === currentRecordId) {
        onFieldsChange({ parent_id: primaryId });
      }
      await loadAllData();
    } catch (err) {
      console.error('Failed to set parent:', err);
    }
  }, [loadAllData, currentRecordId, onFieldsChange]);

  const removePrimaryFromVariation = useCallback(async (variationId: string) => {
    try {
      await api.updateRow('motions', variationId, { parent_id: null });
      if (variationId === currentRecordId) {
        onFieldsChange({ parent_id: null });
      }
      await loadAllData();
    } catch (err) {
      console.error('Failed to remove parent:', err);
    }
  }, [loadAllData, currentRecordId, onFieldsChange]);

  const createVariationForPrimary = useCallback(async (primaryId: string, newData: Record<string, unknown>) => {
    try {
      await api.addRow('motions', { ...newData, parent_id: primaryId });
      await loadAllData();
    } catch (err) {
      console.error('Failed to create variation:', err);
      alert('Failed to create variation. Please try again.');
    }
  }, [loadAllData]);

  const hierarchyItems = useMemo(() => {
    if (loading || !currentMotion) return [];

    if (isCurrentParent) {
      const relatedVars = childMotions.filter(v => v.parent_id === currentRecordId);
      return relatedVars.map(v => ({
        type: 'primary-view' as const,
        variation: v,
      }));
    }

    const primary = currentMotion.parent_id
      ? parentMotions.find(p => p.id === currentMotion.parent_id)
      : null;
    return [{
      type: 'variation-view' as const,
      primary: primary || null,
      variation: currentMotion,
    }];
  }, [isCurrentParent, currentRecordId, parentMotions, childMotions, currentMotion, loading]);

  const availableAddOptions = useMemo(() => {
    if (!currentMotion) return { type: 'variations' as const, items: [] as MotionRecord[] };

    if (isCurrentParent) {
      const linkedVarIds = childMotions.filter(v => v.parent_id === currentRecordId).map(v => v.id);
      const unlinked = allMotions.filter(m =>
        !m.parent_id &&
        m.id !== currentRecordId &&
        !linkedVarIds.includes(m.id) &&
        !allMotions.some(c => c.parent_id === m.id)
      );
      return { type: 'variations' as const, items: unlinked };
    }

    return { type: 'primaries' as const, items: parentMotions.filter(p => p.id !== currentMotion?.parent_id) };
  }, [isCurrentParent, currentRecordId, parentMotions, childMotions, allMotions, currentMotion]);

  if (loading) {
    return <div className={sp.loading}>Loading motion data...</div>;
  }

  return (
    <div className="space-y-3">
      {isCurrentParent && hierarchyItems.map((item) => {
        if (item.type !== 'primary-view') return null;
        const { variation } = item;
        return (
          <div key={variation.id} className={sp.card.list}>
            <div className={sp.header.base}>
              <div className="flex items-center gap-2 flex-1">
                <Link to="/table/motions" className={sp.link.primary}>{variation.label}</Link>
                <span className={sp.meta.id}>{variation.id}</span>
              </div>
              <button type="button" onClick={() => removeVariationFromPrimary(currentRecordId, variation.id)}
                className={sp.removeBtn.textMl}>Remove</button>
            </div>
          </div>
        );
      })}

      {!isCurrentParent && hierarchyItems.map((item) => {
        if (item.type !== 'variation-view') return null;
        const { primary, variation } = item;
        return (
          <div key={primary?.id || 'no-primary'} className={sp.card.list}>
            <div className={sp.header.base}>
              <div className="flex items-center gap-2 flex-1">
                {primary ? (
                  <Link to="/table/motions" className={sp.link.primary}>{primary.label}</Link>
                ) : (
                  <span className={`${sp.meta.id} italic`}>No parent motion</span>
                )}
                {primary && <span className={sp.meta.id}>{primary.id}</span>}
                <span className={sp.meta.arrow}>→</span>
                <span className="text-sm font-medium text-gray-700">{variation.label}</span>
                <span className={sp.meta.id}>{variation.id}</span>
              </div>
              {primary && (
                <button type="button" onClick={() => removePrimaryFromVariation(currentRecordId)}
                  className={sp.removeBtn.textMl}>Remove</button>
              )}
            </div>
          </div>
        );
      })}

      {isCurrentParent && (
        <div className="flex flex-row gap-2 items-stretch">
          <select
            value=""
            onChange={async (e) => {
              if (!e.target.value) return;
              await addVariationToPrimary(currentRecordId, e.target.value);
            }}
            className={`flex-grow min-w-0 ${sp.addDropdown.blockForm}`}
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

      {!isCurrentParent && !currentMotion?.parent_id && (
        <select
          value=""
          onChange={async (e) => {
            if (!e.target.value) return;
            await setPrimaryForVariation(currentRecordId, e.target.value);
          }}
          className={sp.addDropdown.blockForm}
        >
          <option value="">Set Parent Motion...</option>
          {(availableAddOptions.type === 'primaries' ? availableAddOptions.items : []).map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label} ({opt.id})</option>
          ))}
        </select>
      )}

      {hierarchyItems.length === 0 && (
        <div className={sp.emptyState.text}>
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
