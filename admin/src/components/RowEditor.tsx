import React, { useState } from 'react';
import type { TableSchema } from '../api';
import StringField from './FieldRenderers/StringField';
import NumberField from './FieldRenderers/NumberField';
import BooleanField from './FieldRenderers/BooleanField';
import ArrayField from './FieldRenderers/ArrayField';
import FKDropdown from './FieldRenderers/FKDropdown';
import FKMultiSelect from './FieldRenderers/FKMultiSelect';
import JsonEditor from './FieldRenderers/JsonEditor';
import MuscleTargetTree from './FieldRenderers/MuscleTargetTree';

interface RowEditorProps {
  schema: TableSchema;
  row: Record<string, unknown>;
  isNew: boolean;
  refData: Record<string, Record<string, unknown>[]>;
  onSave: (row: Record<string, unknown>) => void;
  onCancel: () => void;
}

export default function RowEditor({ schema, row, isNew, refData, onSave, onCancel }: RowEditorProps) {
  const [data, setData] = useState<Record<string, unknown>>({ ...row });

  const update = (field: string, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-end z-50">
      <div className="bg-white h-full w-full max-w-2xl shadow-xl overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
            <h2 className="font-bold text-gray-800">
              {isNew ? 'Add Row' : `Edit: ${data[schema.labelField] || data[schema.idField]}`}
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
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
            {schema.fields.map((field) => {
              const value = data[field.name];
              const label = (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.name}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  <span className="text-xs text-gray-400 ml-2">{field.type}</span>
                </label>
              );

              // ID field: editable only when creating
              if (field.name === 'id' || field.name === schema.idField) {
                return (
                  <div key={field.name}>
                    {label}
                    <input
                      type="text"
                      value={String(value ?? '')}
                      onChange={(e) => update(field.name, e.target.value)}
                      disabled={!isNew}
                      className={`w-full px-3 py-2 border rounded text-sm ${
                        !isNew ? 'bg-gray-100 text-gray-500' : 'focus:ring-2 focus:ring-blue-500'
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
                  return (
                    <div key={field.name}>
                      {label}
                      <FKDropdown
                        value={String(value ?? '')}
                        options={refData[field.refTable!] || []}
                        labelField={field.refLabelField || 'label'}
                        onChange={(v) => update(field.name, v)}
                      />
                    </div>
                  );

                case 'fk[]':
                  return (
                    <div key={field.name}>
                      {label}
                      <FKMultiSelect
                        value={Array.isArray(value) ? (value as string[]) : value == null ? null : []}
                        options={refData[field.refTable!] || []}
                        labelField={field.refLabelField || 'label'}
                        onChange={(v) => update(field.name, v)}
                        nullable
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
          </div>
        </form>
      </div>
    </div>
  );
}
