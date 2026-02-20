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
import MotionPlanesField from './FieldRenderers/MotionPlanesField';
import DeltaRulesField from './FieldRenderers/DeltaRulesField';
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
              {schema.fields
                .filter((field) => {
                  if (hiddenHierarchyFields.includes(field.name) && field.name !== hierarchyAnchor) return false;
                  return true;
                })
                .sort((a, b) => {
                  if (a.name === hierarchyAnchor && b.name === 'sort_order') return -1;
                  if (a.name === 'sort_order' && b.name === hierarchyAnchor) return 1;
                  return 0;
                })
                .map((field) => {
                  const value = data[field.name];
                  const label = (
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.name}
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

                  switch (field.type) {
                    case 'string':
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
                      return (
                        <div key={field.name}>
                          {label}
                          <FKDropdown
                            value={String(value ?? '')}
                            options={refData[field.refTable!] || []}
                            labelField={field.refLabelField || 'label'}
                            onChange={(v) => update(field.name, v)}
                            refTable={field.refTable}
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
                      if (field.jsonShape === 'motion_planes') {
                        return (
                          <div key={field.name}>
                            {label}
                            <MotionPlanesField
                              value={value as Record<string, unknown> | null | undefined}
                              onChange={(v) => update(field.name, v)}
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
                })}

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
