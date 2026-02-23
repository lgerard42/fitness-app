import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { TableSchema } from '../api';
import StringField from './FieldRenderers/StringField';
import NumberField from './FieldRenderers/NumberField';
import BooleanField from './FieldRenderers/BooleanField';
import ArrayField from './FieldRenderers/ArrayField';
import FKDropdown from './FieldRenderers/FKDropdown';
import FKMultiSelect from './FieldRenderers/FKMultiSelect';
import MatrixFieldCheckboxGrid from './FieldRenderers/MatrixFieldCheckboxGrid';
import JsonEditor from './FieldRenderers/JsonEditor';
import MuscleTargetTree from './FieldRenderers/MuscleTargetTree';
import ExerciseInputPermissionsField from './FieldRenderers/ExerciseInputPermissionsField';
import MuscleHierarchyField from './FieldRenderers/MuscleHierarchyField';
import MotionConfigTree from './FieldRenderers/MotionConfigTree';
import MotionPathsField from './FieldRenderers/MotionPathsField';
import DeltaRulesField from './FieldRenderers/DeltaRulesField';
import UpperLowerToggle from './FieldRenderers/UpperLowerToggle';
import UpperLowerToggleSimple from './FieldRenderers/UpperLowerToggleSimple';
import Relationships from './Relationships';

const MATRIX_FIELDS: string[] = [];

const MUSCLE_TABLES = ['muscles'];
const MUSCLE_HIERARCHY_FIELDS: Record<string, string[]> = {
  muscles: ['parent_ids'],
};
const MUSCLE_HIERARCHY_ANCHOR: Record<string, string> = {
  muscles: 'parent_ids',
};

const MOTION_TABLES = ['motions'];
const MOTION_HIERARCHY_FIELDS: Record<string, string[]> = {
  motions: ['parent_id', 'muscle_targets'],
};
const MOTION_HIERARCHY_ANCHOR: Record<string, string> = {
  motions: 'parent_id',
};

interface RowEditorProps {
  schema: TableSchema;
  row: Record<string, unknown>;
  isNew: boolean;
  refData: Record<string, Record<string, unknown>[]>;
  onSave: (row: Record<string, unknown>) => void;
  onCancel: () => void;
  onOpenRow?: (row: Record<string, unknown>) => void;
  hasHistory?: boolean;
}

export default function RowEditor({ schema, row, isNew, refData, onSave, onCancel, onOpenRow, hasHistory = false }: RowEditorProps) {
  const [data, setData] = useState<Record<string, unknown>>({ ...row });
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData({ ...row });
  }, [row]);

  const update = (field: string, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateMultiple = (fields: Record<string, unknown>) => {
    setData((prev) => ({ ...prev, ...fields }));
  };

  const isMuscleTable = MUSCLE_TABLES.includes(schema.key);
  const isMotionTable = MOTION_TABLES.includes(schema.key);
  const hiddenHierarchyFields = isMuscleTable
    ? MUSCLE_HIERARCHY_FIELDS[schema.key] || []
    : isMotionTable
      ? MOTION_HIERARCHY_FIELDS[schema.key] || []
      : [];
  const hierarchyAnchor = isMuscleTable
    ? MUSCLE_HIERARCHY_ANCHOR[schema.key]
    : isMotionTable
      ? MOTION_HIERARCHY_ANCHOR[schema.key]
      : '';

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(row);
  }, [data, row]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(data);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      onCancel();
    }
  };

  const handleDiscard = () => {
    setShowUnsavedDialog(false);
    onCancel();
  };

  const handleSaveAndClose = () => {
    setShowUnsavedDialog(false);
    onSave(data);
  };

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (hasUnsavedChanges) {
          setShowUnsavedDialog(true);
        } else {
          onCancel();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [hasUnsavedChanges, onCancel]);

  const recordId = String(data[schema.idField] ?? '');
  const recordLabel = String(data[schema.labelField] ?? data[schema.idField] ?? '');

  // Get unique grip categories and non-child grips for GRIPS table
  const gripCategories = useMemo(() => {
    if (schema.key !== 'grips') return [];
    const allGrips = refData['grips'] || [];
    const categories = new Set<string>();
    allGrips.forEach((grip: Record<string, unknown>) => {
      const cat = grip.grip_category;
      if (cat && typeof cat === 'string') {
        categories.add(cat);
      }
    });
    return Array.from(categories).sort();
  }, [schema.key, refData]);

  const nonChildGrips = useMemo(() => {
    if (schema.key !== 'grips') return [];
    const allGrips = refData['grips'] || [];
    return allGrips.filter((grip: Record<string, unknown>) => {
      const parentId = grip.parent_id;
      return !parentId || parentId === null || parentId === '';
    }).map((grip: Record<string, unknown>) => ({
      id: String(grip.id ?? ''),
      label: String(grip.label ?? grip.id ?? ''),
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [schema.key, refData]);

  // Helper function to render a field
  const renderField = (field: typeof schema.fields[0]) => {
    const value = data[field.name];
    const displayLabel = field.label ?? field.name;
    const label = (
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {displayLabel}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
        <span className="text-xs text-gray-400 ml-2">{field.type}</span>
        {field.refTable && <span className="text-xs text-blue-400 ml-1">&rarr; {field.refTable}</span>}
      </label>
    );

    if (field.name === 'id' || field.name === schema.idField) {
      return (
        <div key={field.name}>
          {label}
          <input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => update(field.name, e.target.value)}
            disabled={!isNew}
            className={`w-full px-3 py-2 border rounded text-sm ${!isNew ? 'bg-gray-100 text-gray-500' : 'focus:ring-2 focus:ring-blue-500'
              } focus:outline-none`}
          />
        </div>
      );
    }

    // Special handling for upper_lower on MUSCLES table (use toggle)
    if (schema.key === 'muscles' && field.name === 'upper_lower') {
      const upperLowerValue = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div key={field.name}>
          {label}
          <UpperLowerToggle
            value={upperLowerValue}
            onChange={(v) => update(field.name, v)}
          />
        </div>
      );
    }

    // Special handling for upper_lower on MOTIONS table (use simple toggle)
    if (schema.key === 'motions' && field.name === 'upper_lower') {
      const upperLowerValue = String(value ?? '');
      return (
        <div key={field.name}>
          {label}
          <UpperLowerToggleSimple
            value={upperLowerValue}
            onChange={(v) => update(field.name, v)}
          />
        </div>
      );
    }

    switch (field.type) {
      case 'string':
        // Special handling for grip_category on GRIPS table (dropdown with unique categories)
        if (schema.key === 'grips' && field.name === 'grip_category') {
          return (
            <div key={field.name}>
              {label}
              <select
                value={String(value ?? '')}
                onChange={(e) => update(field.name, e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">(none)</option>
                {gripCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          );
        }
        return (
          <div key={field.name}>
            {label}
            <StringField value={String(value ?? '')} onChange={(v) => update(field.name, v)} />
          </div>
        );

      case 'number':
        return (
          <div key={field.name}>
            {label}
            <NumberField value={value as number} onChange={(v) => update(field.name, v)} />
          </div>
        );

      case 'boolean':
        return (
          <div key={field.name}>
            {label}
            <BooleanField value={!!value} onChange={(v) => update(field.name, v)} />
          </div>
        );

      case 'string[]':
        return (
          <div key={field.name}>
            {label}
            <ArrayField
              value={Array.isArray(value) ? (value as string[]) : []}
              onChange={(v) => update(field.name, v)}
            />
          </div>
        );

      case 'fk':
        // Use MotionConfigTree for the anchor field on motion tables
        if (isMotionTable && field.name === hierarchyAnchor) {
          const fieldNames = MOTION_HIERARCHY_FIELDS[schema.key] || [];
          const motionConfigLabel = (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motion & Muscle Config
              <span className="text-xs text-gray-400 ml-2">{fieldNames.join(' + ')}</span>
            </label>
          );
          return (
            <div key={field.name}>
              {motionConfigLabel}
              <MotionConfigTree
                tableKey={schema.key as 'motions'}
                currentRecordId={recordId}
                muscleTargets={(data.muscle_targets as Record<string, unknown>) || {}}
                onFieldsChange={(fields) => {
                  updateMultiple(fields);
                }}
              />
            </div>
          );
        }
        // Hide the blue card for parent_id on GRIPS table
        const hideCard = schema.key === 'grips' && field.name === 'parent_id';
        return (
          <div key={field.name}>
            {label}
            <FKDropdown
              value={String(value ?? '')}
              options={refData[field.refTable!] || []}
              labelField={field.refLabelField || 'label'}
              onChange={(v) => update(field.name, v)}
              refTable={field.refTable}
              hideSelectedCard={hideCard}
            />
          </div>
        );

      case 'fk[]':
        // Use MuscleHierarchyField for the anchor field on any muscle table
        if (isMuscleTable && field.name === hierarchyAnchor) {
          const fieldNames = MUSCLE_HIERARCHY_FIELDS[schema.key] || [];
          const muscleHierarchyLabel = (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Muscle Hierarchy
              <span className="text-xs text-gray-400 ml-2">{fieldNames.join(' + ')}</span>
            </label>
          );
          return (
            <div key={field.name}>
              {muscleHierarchyLabel}
              <MuscleHierarchyField
                tableKey="muscles"
                currentRecordId={recordId}
                onFieldsChange={(fields) => {
                  updateMultiple(fields);
                }}
                onOpenRow={onOpenRow}
              />
            </div>
          );
        }
        // Use MotionConfigTree for the anchor field on motion tables
        if (isMotionTable && field.name === hierarchyAnchor) {
          const fieldNames = MOTION_HIERARCHY_FIELDS[schema.key] || [];
          const motionConfigLabel = (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motion & Muscle Config
              <span className="text-xs text-gray-400 ml-2">{fieldNames.join(' + ')}</span>
            </label>
          );
          return (
            <div key={field.name}>
              {motionConfigLabel}
              <MotionConfigTree
                tableKey={schema.key as 'motions'}
                currentRecordId={recordId}
                muscleTargets={(data.muscle_targets as Record<string, unknown>) || {}}
                onFieldsChange={(fields) => {
                  updateMultiple(fields);
                }}
              />
            </div>
          );
        }
        // Use checkbox grid for matrix editor fields
        if (MATRIX_FIELDS.includes(field.name)) {
          return (
            <div key={field.name}>
              {label}
              <MatrixFieldCheckboxGrid
                value={Array.isArray(value) ? (value as string[]) : value == null ? null : []}
                options={refData[field.refTable!] || []}
                labelField={field.refLabelField || 'label'}
                onChange={(v) => update(field.name, v)}
                nullable
                fieldName={field.name}
              />
            </div>
          );
        }
        // Use dropdown for other fk[] fields
        return (
          <div key={field.name}>
            {label}
            <FKMultiSelect
              value={Array.isArray(value) ? (value as string[]) : value == null ? null : []}
              options={refData[field.refTable!] || []}
              labelField={field.refLabelField || 'label'}
              onChange={(v) => update(field.name, v)}
              nullable
              refTable={field.refTable}
            />
          </div>
        );

      case 'json':
        // Special handling for rotation_path on GRIPS table (two dropdowns: start and end)
        if (schema.key === 'grips' && field.name === 'rotation_path') {
          const rotationPath = value && typeof value === 'object' && !Array.isArray(value)
            ? (value as { start?: string; end?: string })
            : { start: '', end: '' };
          
          const handleRotationPathChange = (key: 'start' | 'end', newValue: string) => {
            const updated = { ...rotationPath, [key]: newValue };
            // If start changes and end equals the new start, clear end
            if (key === 'start' && updated.end === newValue) {
              updated.end = '';
            }
            // If end is set to equal start, clear end (shouldn't happen due to filtering, but safety check)
            if (key === 'end' && updated.start === newValue && updated.start !== '') {
              updated.end = '';
            }
            update(field.name, updated);
          };
          
          // Filter end options to exclude the selected start value
          const endOptions = nonChildGrips.filter(g => g.id !== rotationPath.start);
          
          return (
            <div key={field.name}>
              {label}
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start</label>
                  <select
                    value={rotationPath.start ?? ''}
                    onChange={(e) => handleRotationPathChange('start', e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">(none)</option>
                    {nonChildGrips.map(grip => (
                      <option key={grip.id} value={grip.id}>{grip.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Finish</label>
                  <select
                    value={rotationPath.end ?? ''}
                    onChange={(e) => handleRotationPathChange('end', e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    disabled={!rotationPath.start}
                  >
                    <option value="">(none)</option>
                    {endOptions.map(grip => (
                      <option key={grip.id} value={grip.id}>{grip.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        }
        if (field.jsonShape === 'muscle_targets') {
          return (
            <div key={field.name}>
              {label}
              <MuscleTargetTree
                value={(value as Record<string, unknown>) ?? {}}
                onChange={(v) => update(field.name, v)}
              />
            </div>
          );
        }
        if (field.jsonShape === 'exercise_input_permissions') {
          return (
            <div key={field.name}>
              {label}
              <ExerciseInputPermissionsField
                value={(value as Record<string, string>) ?? undefined}
                onChange={(v) => update(field.name, v)}
              />
            </div>
          );
        }
        if (field.jsonShape === 'default_delta_configs') {
          return (
            <div key={field.name}>
              {label}
              <MotionPathsField
                value={value as Record<string, unknown> | null | undefined}
                onChange={(v) => update(field.name, v)}
                motionId={recordId}
                onOpenRow={onOpenRow}
              />
            </div>
          );
        }
        if (field.jsonShape === 'delta_rules') {
          return (
            <div key={field.name}>
              {label}
              <DeltaRulesField
                value={value as Record<string, Record<string, number>> | null | undefined}
                onChange={(v) => update(field.name, v)}
              />
            </div>
          );
        }
        return (
          <div key={field.name}>
            {label}
            <JsonEditor
              value={value}
              onChange={(v) => update(field.name, v)}
              jsonShape={field.jsonShape}
            />
          </div>
        );

      default:
        return (
          <div key={field.name}>
            {label}
            <StringField value={String(value ?? '')} onChange={(v) => update(field.name, v)} />
          </div>
        );
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-start justify-end z-50">
        <div ref={panelRef} className="bg-white h-full w-full max-w-2xl shadow-xl overflow-y-auto">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                {hasHistory && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="Back to previous"
                  >
                    ← Back
                  </button>
                )}
                <h2 className="font-bold text-gray-800">
                  {isNew ? 'Add Row' : `Edit: ${recordLabel}`}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {isNew ? 'Create' : 'Save'}
                </button>
              </div>
            </div>

            {/* Fields */}
            <div className="p-6 space-y-4">
              {(() => {
                // Custom field ordering logic
                const allFields = schema.fields.filter((field) => {
                  if (hiddenHierarchyFields.includes(field.name) && field.name !== hierarchyAnchor) return false;
                  return true;
                }) as typeof schema.fields;

                // For MUSCLES table: reorder fields (label + upper_lower on same row, then common_names, then rest)
                if (schema.key === 'muscles') {
                  const orderedFields: typeof schema.fields = [];
                  const labelField = allFields.find(f => f.name === 'label');
                  const upperLowerField = allFields.find(f => f.name === 'upper_lower');
                  const commonNamesField = allFields.find(f => f.name === 'common_names');
                  const otherFields = allFields.filter(f => 
                    f.name !== 'id' &&
                    f.name !== schema.idField &&
                    f.name !== 'label' && 
                    f.name !== 'upper_lower' && 
                    f.name !== 'common_names' &&
                    f.name !== hierarchyAnchor
                  );
                  
                  // Add id field first if it exists
                  const idField = allFields.find(f => f.name === 'id' || f.name === schema.idField);
                  if (idField) orderedFields.push(idField);
                  
                  // Add label + upper_lower row (will be rendered together)
                  if (labelField && upperLowerField) {
                    // Render label + upper_lower together, then add other fields
                    const result: React.ReactElement[] = [];
                    
                    // Add id field first if it exists
                    const idField = allFields.find(f => f.name === 'id' || f.name === schema.idField);
                    if (idField) {
                      const fieldElement = renderField(idField);
                      if (fieldElement) {
                        result.push(fieldElement);
                      }
                    }
                    
                    const upperLowerValue = Array.isArray(data[upperLowerField.name]) 
                      ? (data[upperLowerField.name] as string[]) 
                      : [];
                    const displayLabel = labelField.label ?? labelField.name;
                    result.push(
                      <div key="label-upper_lower-row" className="flex items-start gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {displayLabel}
                            {labelField.required && <span className="text-red-500 ml-0.5">*</span>}
                            <span className="text-xs text-gray-400 ml-2">{labelField.type}</span>
                          </label>
                          <StringField value={String(data[labelField.name] ?? '')} onChange={(v) => update(labelField.name, v)} />
                        </div>
                        <div className="w-48 flex-shrink-0">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {upperLowerField.label ?? upperLowerField.name}
                            {upperLowerField.required && <span className="text-red-500 ml-0.5">*</span>}
                            <span className="text-xs text-gray-400 ml-2">{upperLowerField.type}</span>
                          </label>
                          <UpperLowerToggle
                            value={upperLowerValue}
                            onChange={(v) => update(upperLowerField.name, v)}
                          />
                        </div>
                      </div>
                    );
                    
                    // Add common_names after label
                    if (commonNamesField) {
                      const fieldElement = renderField(commonNamesField);
                      if (fieldElement) {
                        result.push(fieldElement);
                      }
                    }
                    
                    // Add hierarchy anchor if it exists
                    const anchorField = allFields.find(f => f.name === hierarchyAnchor);
                    if (anchorField) {
                      const fieldElement = renderField(anchorField);
                      if (fieldElement) {
                        result.push(fieldElement);
                      }
                    }
                    
                    // Add rest of fields
                    otherFields.forEach(field => {
                      const fieldElement = renderField(field);
                      if (fieldElement) {
                        result.push(fieldElement);
                      }
                    });
                    
                    return result;
                  }
                  
                  // Fallback: if no upper_lower field, render normally
                  if (labelField) orderedFields.push(labelField);
                  if (upperLowerField) orderedFields.push(upperLowerField);
                  if (commonNamesField) orderedFields.push(commonNamesField);
                  const anchorField = allFields.find(f => f.name === hierarchyAnchor);
                  if (anchorField) orderedFields.push(anchorField);
                  orderedFields.push(...otherFields);
                  
                  return orderedFields.map((field) => renderField(field)).filter((item) => item !== null) as React.ReactElement[];
                }
                
                // For MOTIONS table: reorder fields (label + upper_lower on same row, then common_names, short_description, then rest)
                if (schema.key === 'motions') {
                  const orderedFields: typeof schema.fields = [];
                  const labelField = allFields.find(f => f.name === 'label');
                  const upperLowerField = allFields.find(f => f.name === 'upper_lower');
                  const commonNamesField = allFields.find(f => f.name === 'common_names');
                  const shortDescField = allFields.find(f => f.name === 'short_description');
                  const otherFields = allFields.filter(f => 
                    f.name !== 'id' &&
                    f.name !== schema.idField &&
                    f.name !== 'label' && 
                    f.name !== 'upper_lower' && 
                    f.name !== 'common_names' &&
                    f.name !== 'short_description' &&
                    f.name !== hierarchyAnchor
                  );
                  
                  // Add label + upper_lower row (will be rendered together)
                  if (labelField && upperLowerField) {
                    // Render label + upper_lower together, then add other fields
                    const result: React.ReactElement[] = [];
                    
                    // Add id field first if it exists
                    const idField = allFields.find(f => f.name === 'id' || f.name === schema.idField);
                    if (idField) {
                      const fieldElement = renderField(idField);
                      if (fieldElement) {
                        result.push(fieldElement);
                      }
                    }
                    
                    const upperLowerValue = String(data[upperLowerField.name] ?? '');
                    const displayLabel = labelField.label ?? labelField.name;
                    result.push(
                      <div key="label-upper_lower-row" className="flex items-start gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {displayLabel}
                            {labelField.required && <span className="text-red-500 ml-0.5">*</span>}
                            <span className="text-xs text-gray-400 ml-2">{labelField.type}</span>
                          </label>
                          <StringField value={String(data[labelField.name] ?? '')} onChange={(v) => update(labelField.name, v)} />
                        </div>
                        <div className="w-48 flex-shrink-0">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {upperLowerField.label ?? upperLowerField.name}
                            {upperLowerField.required && <span className="text-red-500 ml-0.5">*</span>}
                            <span className="text-xs text-gray-400 ml-2">{upperLowerField.type}</span>
                          </label>
                          <UpperLowerToggleSimple
                            value={upperLowerValue}
                            onChange={(v) => update(upperLowerField.name, v)}
                          />
                        </div>
                      </div>
                    );
                    
                    // Add common_names and short_description after label/upper_lower
                    if (commonNamesField) {
                      const fieldElement = renderField(commonNamesField);
                      if (fieldElement) {
                        result.push(fieldElement);
                      }
                    }
                    if (shortDescField) {
                      const fieldElement = renderField(shortDescField);
                      if (fieldElement) {
                        result.push(fieldElement);
                      }
                    }
                    
                    // Add hierarchy anchor if it exists
                    const anchorField = allFields.find(f => f.name === hierarchyAnchor);
                    if (anchorField) {
                      const fieldElement = renderField(anchorField);
                      if (fieldElement) {
                        result.push(fieldElement);
                      }
                    }
                    
                    // Add rest of fields
                    otherFields.forEach(field => {
                      const fieldElement = renderField(field);
                      if (fieldElement) {
                        result.push(fieldElement);
                      }
                    });
                    
                    return result;
                  }
                  
                  // Fallback: if no upper_lower field, render normally
                  if (labelField) orderedFields.push(labelField);
                  if (upperLowerField) orderedFields.push(upperLowerField);
                  if (commonNamesField) orderedFields.push(commonNamesField);
                  if (shortDescField) orderedFields.push(shortDescField);
                  const anchorField = allFields.find(f => f.name === hierarchyAnchor);
                  if (anchorField) orderedFields.push(anchorField);
                  orderedFields.push(...otherFields);
                  
                  return orderedFields.map((field) => renderField(field)).filter((item) => item !== null) as React.ReactElement[];
                }
                
                // For MOTION PLANES table: reorder fields (short_description after common_names)
                if (schema.key === 'motionPaths') {
                  const orderedFields: typeof schema.fields = [];
                  const idField = allFields.find(f => f.name === 'id' || f.name === schema.idField);
                  const commonNamesField = allFields.find(f => f.name === 'common_names');
                  const shortDescField = allFields.find(f => f.name === 'short_description');
                  const otherFields = allFields.filter(f => 
                    f.name !== 'id' && 
                    f.name !== schema.idField &&
                    f.name !== 'common_names' && 
                    f.name !== 'short_description'
                  );
                  
                  // Add id field first
                  if (idField) orderedFields.push(idField);
                  
                  // Add common_names
                  if (commonNamesField) orderedFields.push(commonNamesField);
                  
                  // Add short_description after common_names
                  if (shortDescField) orderedFields.push(shortDescField);
                  
                  // Add rest of fields
                  orderedFields.push(...otherFields);
                  
                  return orderedFields.map((field) => renderField(field)).filter((item) => item !== null) as React.ReactElement[];
                }
                
                // Default ordering for other tables
                const sortedFields = allFields.sort((a, b) => {
                  // id field always comes first
                  if (a.name === 'id' || a.name === schema.idField) return -1;
                  if (b.name === 'id' || b.name === schema.idField) return 1;
                  // label comes second
                  if (a.name === 'label' && b.name !== 'id' && b.name !== schema.idField) return -1;
                  if (b.name === 'label' && a.name !== 'id' && a.name !== schema.idField) return 1;
                  // hierarchy anchor and sort_order ordering
                  if (a.name === hierarchyAnchor && b.name === 'sort_order') return -1;
                  if (a.name === 'sort_order' && b.name === hierarchyAnchor) return 1;
                  return 0;
                });
                
                return sortedFields
                  .map((field) => renderField(field))
                  .filter((item) => item !== null) as React.ReactElement[];
              })()}

              {/* Muscle Hierarchy for muscles table (standalone view when not already rendered via anchor field) */}
              {!isNew && recordId && schema.key === 'muscles' && !hierarchyAnchor && (
                <div className="pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Muscle Hierarchy
                    <span className="text-xs text-gray-400 ml-2">Parent & child muscles linked to this muscle</span>
                  </label>
                  <MuscleHierarchyField
                    tableKey="muscles"
                    currentRecordId={recordId}
                    onFieldsChange={() => {}}
                    onOpenRow={onOpenRow}
                  />
                </div>
              )}

              {/* Relationships Section */}
              {!isNew && recordId && (
                <div className="pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationships
                    <span className="text-xs text-gray-400 ml-2">Incoming and outgoing references</span>
                  </label>
                  <Relationships
                    tableKey={schema.key}
                    recordId={recordId}
                    recordLabel={recordLabel}
                    schema={schema}
                    recordData={data}
                    refData={refData}
                  />
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="font-bold text-gray-800 mb-2">Unsaved Changes</h3>
            <p className="text-sm text-gray-600 mb-4">
              You have unsaved changes. What would you like to do?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowUnsavedDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscard}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSaveAndClose}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
