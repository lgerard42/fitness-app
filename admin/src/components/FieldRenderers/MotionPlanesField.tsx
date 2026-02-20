import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';

interface MotionPlane {
  id: string;
  label: string;
  short_description?: string;
  sort_order?: number;
  is_active?: boolean;
}

interface MotionPlanesValue {
  default: string;
  options: string[];
}

interface MotionPlanesFieldProps {
  value: MotionPlanesValue | Record<string, unknown> | null | undefined;
  onChange: (v: MotionPlanesValue) => void;
}

function normalize(raw: unknown): MotionPlanesValue {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const def = typeof obj.default === 'string' ? obj.default : '';
    const opts = Array.isArray(obj.options) ? (obj.options as string[]) : [];
    return { default: def, options: opts };
  }
  return { default: '', options: [] };
}

export default function MotionPlanesField({ value, onChange }: MotionPlanesFieldProps) {
  const [planes, setPlanes] = useState<MotionPlane[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTable('motionPlanes')
      .then((data) => {
        const sorted = (data as MotionPlane[])
          .filter((p) => p.is_active !== false)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        setPlanes(sorted);
      })
      .catch(() => setPlanes([]))
      .finally(() => setLoading(false));
  }, []);

  const current = useMemo(() => normalize(value), [value]);
  const selectedSet = useMemo(() => new Set(current.options), [current.options]);

  const toggleOption = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    const nextOptions = planes.filter((p) => next.has(p.id)).map((p) => p.id);
    const nextDefault = next.has(current.default) ? current.default : (nextOptions[0] || '');
    onChange({ default: nextDefault, options: nextOptions });
  };

  const setDefault = (id: string) => {
    if (!selectedSet.has(id)) return;
    onChange({ ...current, default: id });
  };

  const selectAll = () => {
    const allIds = planes.map((p) => p.id);
    onChange({ default: current.default || allIds[0] || '', options: allIds });
  };

  const clearAll = () => {
    onChange({ default: '', options: [] });
  };

  if (loading) {
    return <div className="text-sm text-gray-400 py-2">Loading motion planes...</div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
        <span className="text-sm font-medium text-gray-700">
          {current.options.length}/{planes.length} selected
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={selectAll} className="px-2 py-1 text-xs text-blue-600 hover:underline font-medium">
            Select All
          </button>
          <button type="button" onClick={clearAll} className="px-2 py-1 text-xs text-gray-600 hover:underline">
            Clear All
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-3 py-2 text-left font-medium text-gray-600 w-10">Use</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Plane</th>
            <th className="px-3 py-2 text-center font-medium text-gray-600 w-16">Default</th>
          </tr>
        </thead>
        <tbody>
          {planes.map((plane) => {
            const isSelected = selectedSet.has(plane.id);
            const isDefault = current.default === plane.id;
            return (
              <tr
                key={plane.id}
                className={`border-b last:border-b-0 transition-colors ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOption(plane.id)}
                    className="rounded text-blue-600 w-4 h-4"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="group relative">
                    <span className="font-medium text-gray-800">{plane.label}</span>
                    <span className="text-xs text-gray-400 ml-2">({plane.id})</span>
                    {plane.short_description && (
                      <div className="absolute left-0 bottom-full mb-2 z-20 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-xl max-w-sm whitespace-normal pointer-events-none">
                        {plane.short_description}
                        <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="radio"
                    name="motion-plane-default"
                    checked={isDefault}
                    disabled={!isSelected}
                    onChange={() => setDefault(plane.id)}
                    className={`w-4 h-4 text-blue-600 focus:ring-blue-500 ${
                      !isSelected ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary */}
      {current.options.length > 0 && (
        <div className="px-3 py-2 bg-gray-50 border-t">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-gray-600">Default:</span>
            {current.default ? (
              <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                {planes.find((p) => p.id === current.default)?.label || current.default}
              </span>
            ) : (
              <span className="text-xs text-amber-600">None set</span>
            )}
            <span className="text-xs text-gray-400 ml-2">
              Options: {current.options.map((id) => planes.find((p) => p.id === id)?.label || id).join(', ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
