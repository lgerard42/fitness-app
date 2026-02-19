import React, { useState, useEffect } from 'react';
import type { TableField } from '../api';

interface ColumnSettingsProps {
  fields: TableField[];
  visibleColumns: string[];
  columnOrder: string[];
  onSave: (visibleColumns: string[], columnOrder: string[]) => void;
  onClose: () => void;
}

export default function ColumnSettings({
  fields,
  visibleColumns,
  columnOrder,
  onSave,
  onClose,
}: ColumnSettingsProps) {
  const [localVisible, setLocalVisible] = useState<Set<string>>(new Set(visibleColumns));
  const [localOrder, setLocalOrder] = useState<string[]>(columnOrder);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalVisible(new Set(visibleColumns));
    // Ensure order only has current fields (filter stale, add missing)
    const allFieldNames = new Set(fields.map((f) => f.name));
    const validOrder = columnOrder.filter((n) => allFieldNames.has(n));
    const orderSet = new Set(validOrder);
    const missing = fields.filter((f) => !orderSet.has(f.name)).map((f) => f.name);
    const mergedOrder = validOrder.length > 0 ? [...validOrder, ...missing] : fields.map((f) => f.name);
    setLocalOrder(mergedOrder);
  }, [visibleColumns, columnOrder, fields]);

  const toggleColumn = (fieldName: string) => {
    const newVisible = new Set(localVisible);
    if (newVisible.has(fieldName)) {
      newVisible.delete(fieldName);
    } else {
      newVisible.add(fieldName);
    }
    setLocalVisible(newVisible);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newOrder = [...localOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    setLocalOrder(newOrder);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...localOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setLocalOrder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === localOrder.length - 1) return;
    const newOrder = [...localOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setLocalOrder(newOrder);
  };

  const handleSave = () => {
    onSave([...localVisible], localOrder);
    onClose();
  };

  const handleReset = () => {
    const defaultOrder = fields.map((f) => f.name);
    const defaultVisible = new Set(defaultOrder.slice(0, 8));
    setLocalVisible(defaultVisible);
    setLocalOrder(defaultOrder);
  };

  const orderedFields = localOrder.map((name) => fields.find((f) => f.name === name)).filter(Boolean) as TableField[];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Column Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4">
          <div className="space-y-2">
            {orderedFields.map((field, index) => {
              const isVisible = localVisible.has(field.name);
              const isDragging = draggedIndex === index;

              return (
                <div
                  key={field.name}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 border rounded cursor-move transition-colors ${
                    isDragging ? 'bg-blue-50 border-blue-300 opacity-50' : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-gray-400 cursor-grab active:cursor-grabbing">☰</span>
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleColumn(field.name)}
                        className="rounded text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm font-medium text-gray-800">{field.name}</span>
                      <span className="text-xs text-gray-400">({field.type})</span>
                      {field.refTable && (
                        <span className="text-xs text-blue-400">→ {field.refTable}</span>
                      )}
                    </label>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveUp(index);
                      }}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveDown(index);
                      }}
                      disabled={index === orderedFields.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            Reset to Default
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
