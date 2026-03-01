import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api';
import toast from 'react-hot-toast';

interface ComboRuleRow {
  id: string;
  label: string;
  motion_id: string;
  action_type: string;
  trigger_conditions_json: any;
  action_payload_json: any;
  expected_primary_muscles: any;
  expected_not_primary: any;
  notes?: string;
  priority: number;
  sort_order: number;
  is_active: boolean;
}

interface MotionRecord {
  id: string;
  label: string;
  parent_id?: string | null;
  muscle_targets?: Record<string, unknown>;
  [key: string]: unknown;
}

interface MuscleRecord {
  id: string;
  label: string;
  [key: string]: unknown;
}

interface LintIssue {
  severity: string;
  table: string;
  rowId: string;
  field: string;
  message: string;
}

const ACTION_TYPES = ['SWITCH_MOTION', 'REPLACE_DELTA', 'CLAMP_MUSCLE'] as const;
const ACTION_COLORS: Record<string, string> = {
  SWITCH_MOTION: '#DBEAFE',
  REPLACE_DELTA: '#FEF3C7',
  CLAMP_MUSCLE: '#FEE2E2',
};

interface ComboRulesPanelProps {
  motions: MotionRecord[];
  muscles: MuscleRecord[];
}

export default function ComboRulesPanel({ motions, muscles }: ComboRulesPanelProps) {
  const [rules, setRules] = useState<ComboRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMotionId, setFilterMotionId] = useState('');
  const [editingRule, setEditingRule] = useState<ComboRuleRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);
  const [showLint, setShowLint] = useState(false);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTable('comboRules') as ComboRuleRow[];
      setRules(Array.isArray(data) ? data : []);
    } catch { setRules([]); }
    setLoading(false);
  }, []);

  const loadLint = useCallback(async () => {
    try {
      const result = await api.runLinter() as any;
      setLintIssues((result.issues || []).filter((i: LintIssue) => i.table === 'combo_rules'));
    } catch { setLintIssues([]); }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  const filteredRules = filterMotionId
    ? rules.filter(r => r.motion_id === filterMotionId)
    : rules;

  const motionLabel = (id: string) => motions.find(m => m.id === id)?.label ?? id;

  const handleCreate = () => {
    setEditingRule({
      id: '',
      label: '',
      motion_id: filterMotionId || '',
      action_type: 'CLAMP_MUSCLE',
      trigger_conditions_json: [],
      action_payload_json: {},
      expected_primary_muscles: [],
      expected_not_primary: [],
      priority: 0,
      sort_order: 0,
      is_active: true,
    });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editingRule) return;
    try {
      const payload = {
        ...editingRule,
        trigger_conditions_json: typeof editingRule.trigger_conditions_json === 'string'
          ? JSON.parse(editingRule.trigger_conditions_json)
          : editingRule.trigger_conditions_json,
        action_payload_json: typeof editingRule.action_payload_json === 'string'
          ? JSON.parse(editingRule.action_payload_json)
          : editingRule.action_payload_json,
        expected_primary_muscles: typeof editingRule.expected_primary_muscles === 'string'
          ? JSON.parse(editingRule.expected_primary_muscles)
          : editingRule.expected_primary_muscles,
        expected_not_primary: typeof editingRule.expected_not_primary === 'string'
          ? JSON.parse(editingRule.expected_not_primary)
          : editingRule.expected_not_primary,
      };

      if (isNew) {
        const { id, ...rest } = payload;
        await api.addRow('comboRules', rest);
        toast.success('Combo rule created');
      } else {
        await api.updateRow('comboRules', editingRule.id, payload);
        toast.success('Combo rule updated');
      }
      setEditingRule(null);
      setIsNew(false);
      loadRules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this combo rule?')) return;
    try {
      await api.deleteRow('comboRules', id, { hard: true });
      toast.success('Deleted');
      loadRules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleToggleActive = async (rule: ComboRuleRow) => {
    try {
      await api.updateRow('comboRules', rule.id, { ...rule, is_active: !rule.is_active });
      toast.success(rule.is_active ? 'Rule deactivated' : 'Rule activated');
      loadRules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const issuesForRule = (ruleId: string) =>
    lintIssues.filter(i => i.rowId === ruleId);

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow border border-gray-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Combo Rules</h2>
            <span className="text-sm text-gray-500">{filteredRules.length} rules</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterMotionId}
              onChange={e => setFilterMotionId(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All motions</option>
              {motions.filter(m => m.is_active !== false).map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <button
              onClick={() => { setShowLint(!showLint); if (!showLint) loadLint(); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${showLint ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {showLint ? 'Hide Lint' : 'Lint'}
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              + New Rule
            </button>
          </div>
        </div>

        {/* Inline lint summary */}
        {showLint && lintIssues.length > 0 && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm">
            <span className="font-semibold text-amber-800">{lintIssues.length} lint issue{lintIssues.length !== 1 ? 's' : ''}</span>
            <span className="text-amber-600 ml-2">
              ({lintIssues.filter(i => i.severity === 'error').length} errors, {lintIssues.filter(i => i.severity === 'warning').length} warnings)
            </span>
          </div>
        )}

        {/* Rules list */}
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredRules.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No combo rules{filterMotionId ? ` for ${motionLabel(filterMotionId)}` : ''}. Click "+ New Rule" to create one.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRules.map(rule => {
              const issues = issuesForRule(rule.id);
              return (
                <div
                  key={rule.id}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!rule.is_active ? 'opacity-50' : ''}`}
                  onClick={() => { setEditingRule({ ...rule }); setIsNew(false); }}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold"
                      style={{ background: ACTION_COLORS[rule.action_type] || '#F3F4F6' }}
                    >
                      {rule.action_type}
                    </span>
                    <span className="font-medium text-gray-900">{rule.label || '(untitled)'}</span>
                    <span className="text-xs text-gray-500">{motionLabel(rule.motion_id)}</span>
                    <span className="text-xs text-gray-400 ml-auto font-mono">{rule.id.slice(0, 8)}</span>
                    {!rule.is_active && <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">inactive</span>}
                    {showLint && issues.length > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                        {issues.length} issue{issues.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {/* Inline lint per row */}
                  {showLint && issues.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {issues.map((issue, i) => (
                        <div key={i} className="text-xs pl-6" style={{
                          color: issue.severity === 'error' ? '#DC2626' : '#D97706',
                        }}>
                          [{issue.severity.toUpperCase()}] {issue.field}: {issue.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditingRule(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold">{isNew ? 'New Combo Rule' : 'Edit Combo Rule'}</h3>
              <button onClick={() => setEditingRule(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={editingRule.label}
                  onChange={e => setEditingRule({ ...editingRule, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="e.g. Neutral grip press → incline baseline"
                />
              </div>

              {/* Motion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motion</label>
                <select
                  value={editingRule.motion_id}
                  onChange={e => setEditingRule({ ...editingRule, motion_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Select motion...</option>
                  {motions.filter(m => m.is_active !== false).map(m => (
                    <option key={m.id} value={m.id}>{m.label} ({m.id})</option>
                  ))}
                </select>
              </div>

              {/* Action type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                <div className="flex gap-2">
                  {ACTION_TYPES.map(at => (
                    <button
                      key={at}
                      onClick={() => setEditingRule({ ...editingRule, action_type: at })}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${
                        editingRule.action_type === at
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ background: ACTION_COLORS[at] }}
                    >
                      {at}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <input
                    type="number"
                    value={editingRule.priority}
                    onChange={e => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={editingRule.sort_order}
                    onChange={e => setEditingRule({ ...editingRule, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Trigger conditions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger Conditions <span className="text-gray-400 font-normal">(JSON — AND-match against selected modifiers)</span>
                </label>
                <textarea
                  value={typeof editingRule.trigger_conditions_json === 'string'
                    ? editingRule.trigger_conditions_json
                    : JSON.stringify(editingRule.trigger_conditions_json, null, 2)}
                  onChange={e => setEditingRule({ ...editingRule, trigger_conditions_json: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                  placeholder='[{"tableKey":"grips","operator":"eq","value":"NEUTRAL"}]'
                />
              </div>

              {/* Action payload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action Payload <span className="text-gray-400 font-normal">(JSON — shape depends on action type)</span>
                </label>
                <textarea
                  value={typeof editingRule.action_payload_json === 'string'
                    ? editingRule.action_payload_json
                    : JSON.stringify(editingRule.action_payload_json, null, 2)}
                  onChange={e => setEditingRule({ ...editingRule, action_payload_json: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                  placeholder={
                    editingRule.action_type === 'SWITCH_MOTION' ? '{"proxy_motion_id":"PRESS_INCLINE"}'
                    : editingRule.action_type === 'REPLACE_DELTA' ? '{"table_key":"grips","row_id":"NEUTRAL","deltas":{"CHEST_MID":-0.2}}'
                    : '{"clamps":{"TRICEPS":0.5}}'
                  }
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingRule.notes || ''}
                  onChange={e => setEditingRule({ ...editingRule, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Why this rule exists, what it corrects..."
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingRule.is_active}
                  onChange={e => setEditingRule({ ...editingRule, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label className="text-sm text-gray-700">Active (rule fires during scoring)</label>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-200 flex items-center justify-between">
              <div>
                {!isNew && (
                  <button
                    onClick={() => { handleDelete(editingRule.id); setEditingRule(null); }}
                    className="px-3 py-1.5 text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editingRule.label || !editingRule.motion_id}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isNew ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
