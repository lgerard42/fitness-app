import React, { useState, useMemo } from 'react';
import type { TableField, TableSchema } from '../api';

export interface FilterRule {
  field: string;
  operator: 'equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_null' | 'is_not_null' | 'in' | 'not_in';
  value: string | number | boolean | string[];
}

interface FilterBarProps {
  schema: TableSchema;
  filters: FilterRule[];
  onChange: (filters: FilterRule[]) => void;
  refData?: Record<string, Record<string, unknown>[]>;
  showButtonOnly?: boolean;
  onToggleForm?: (show: boolean) => void;
  isFormOpen?: boolean;
}

const OPERATORS_BY_TYPE: Record<string, FilterRule['operator'][]> = {
  string: ['equals', 'contains', 'not_contains', 'is_null', 'is_not_null'],
  number: ['equals', 'greater_than', 'less_than', 'is_null', 'is_not_null'],
  boolean: ['equals', 'is_null', 'is_not_null'],
  'string[]': ['contains', 'not_contains', 'is_null', 'is_not_null', 'in', 'not_in'],
  'fk[]': ['in', 'not_in', 'is_null', 'is_not_null'],
  fk: ['equals', 'is_null', 'is_not_null'],
};

export default function FilterBar({ schema, filters, onChange, refData = {}, onToggleForm }: FilterBarProps) {
  const [showAddFilter, setShowAddFilter] = useState(true);
  const [newFilter, setNewFilter] = useState<Partial<FilterRule>>({
    field: '',
    operator: 'equals',
    value: '',
  });

  const availableFields = useMemo(() => {
    return schema.fields.filter((f) => {
      if (f.type === 'json' && f.jsonShape === 'muscle_targets') return false;
      return true;
    });
  }, [schema]);

  const getOperatorsForField = (fieldName: string): FilterRule['operator'][] => {
    const field = availableFields.find((f) => f.name === fieldName);
    if (!field) return ['equals'];
    return OPERATORS_BY_TYPE[field.type] || ['equals'];
  };

  const addFilter = () => {
    if (!newFilter.field || !newFilter.operator) return;

    const field = availableFields.find((f) => f.name === newFilter.field);
    if (!field) return;

    let value: string | number | boolean | string[] = '';
    if (newFilter.operator === 'is_null' || newFilter.operator === 'is_not_null') {
      value = '';
    } else if (field.type === 'boolean') {
      value = newFilter.value === 'true' || newFilter.value === true;
    } else if (field.type === 'number') {
      value = Number(newFilter.value) || 0;
    } else if (newFilter.operator === 'in' || newFilter.operator === 'not_in') {
      value = Array.isArray(newFilter.value) ? newFilter.value : [];
    } else {
      value = String(newFilter.value || '');
    }

    onChange([...filters, { field: newFilter.field!, operator: newFilter.operator!, value }]);
    setNewFilter({ field: '', operator: 'equals', value: '' });
    setShowAddFilter(false);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<FilterRule>) => {
    const updated = [...filters];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const getFieldDisplayValue = (fieldName: string, value: unknown): string => {
    const field = availableFields.find((f) => f.name === fieldName);
    if (!field) return String(value);

    if (field.type === 'fk' && field.refTable && refData[field.refTable]) {
      const ref = refData[field.refTable].find((r) => r.id === value);
      return ref ? String(ref[field.refLabelField || 'label'] || value) : String(value);
    }

    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    return String(value);
  };

  const renderValueInput = () => {
    if (!newFilter.field || newFilter.operator === 'is_null' || newFilter.operator === 'is_not_null') {
      return null;
    }

    const field = availableFields.find((f) => f.name === newFilter.field);
    if (!field) return null;

    if (newFilter.operator === 'in' || newFilter.operator === 'not_in') {
      // Multi-select for arrays/FKs
      if (field.type === 'fk[]' && field.refTable && refData[field.refTable]) {
        return (
          <select
            multiple
            value={Array.isArray(newFilter.value) ? newFilter.value : []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
              setNewFilter({ ...newFilter, value: selected });
            }}
            className="px-2 py-1.5 border rounded text-sm bg-white min-w-[200px]"
            size={4}
          >
            {refData[field.refTable].map((opt) => (
              <option key={String(opt.id)} value={String(opt.id)}>
                {String(opt[field.refLabelField || 'label'] || opt.id)}
              </option>
            ))}
          </select>
        );
      }
      return (
        <input
          type="text"
          placeholder="Comma-separated values"
          value={Array.isArray(newFilter.value) ? newFilter.value.join(', ') : String(newFilter.value || '')}
          onChange={(e) => {
            const values = e.target.value.split(',').map((v) => v.trim()).filter(Boolean);
            setNewFilter({ ...newFilter, value: values });
          }}
          className="px-2 py-1.5 border rounded text-sm bg-white"
        />
      );
    }

    if (field.type === 'boolean') {
      return (
        <select
          value={String(newFilter.value)}
          onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value === 'true' })}
          className="px-2 py-1.5 border rounded text-sm bg-white"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (field.type === 'fk' && field.refTable && refData[field.refTable]) {
      return (
        <select
          value={String(newFilter.value || '')}
          onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
          className="px-2 py-1.5 border rounded text-sm bg-white min-w-[200px]"
        >
          <option value="">Select...</option>
          {refData[field.refTable].map((opt) => (
            <option key={String(opt.id)} value={String(opt.id)}>
              {String(opt[field.refLabelField || 'label'] || opt.id)}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={String(newFilter.value || '')}
        onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
        placeholder="Enter value..."
        className="px-2 py-1.5 border rounded text-sm bg-white"
      />
    );
  };

  return (
    <div>
      {/* Add filter */}
      {showAddFilter && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border rounded">
          <select
            value={newFilter.field || ''}
            onChange={(e) => {
              const field = availableFields.find((f) => f.name === e.target.value);
              const operators = getOperatorsForField(e.target.value);
              setNewFilter({
                field: e.target.value,
                operator: operators[0],
                value: '',
              });
            }}
            className="px-2 py-1.5 border rounded text-sm bg-white"
          >
            <option value="">Select field...</option>
            {availableFields.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name} ({f.type})
              </option>
            ))}
          </select>

          {newFilter.field && (
            <select
              value={newFilter.operator || 'equals'}
              onChange={(e) => setNewFilter({ ...newFilter, operator: e.target.value as FilterRule['operator'] })}
              className="px-2 py-1.5 border rounded text-sm bg-white"
            >
              {getOperatorsForField(newFilter.field).map((op) => (
                <option key={op} value={op}>
                  {op.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          )}

          {renderValueInput()}

          <button
            type="button"
            onClick={addFilter}
            disabled={!newFilter.field || !newFilter.operator}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddFilter(false);
              setNewFilter({ field: '', operator: 'equals', value: '' });
              if (onToggleForm) onToggleForm(false);
            }}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
