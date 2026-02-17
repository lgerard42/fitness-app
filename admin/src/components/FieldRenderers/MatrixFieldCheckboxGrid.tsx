import React, { useState, useMemo } from 'react';

interface MatrixFieldCheckboxGridProps {
  value: string[] | null;
  options: Record<string, unknown>[];
  labelField: string;
  onChange: (v: string[] | null) => void;
  nullable?: boolean;
  fieldName: string;
}

export default function MatrixFieldCheckboxGrid({
  value,
  options,
  labelField,
  onChange,
  nullable,
  fieldName,
}: MatrixFieldCheckboxGridProps) {
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const isNull = value === null;
  const selectedIds = new Set(value ?? []);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) =>
      String(o[labelField] ?? o.id ?? '').toLowerCase().includes(q) ||
      String(o.id ?? '').toLowerCase().includes(q)
    );
  }, [options, search, labelField]);

  const toggle = (id: string) => {
    if (isNull) {
      onChange([id]);
      return;
    }
    if (selectedIds.has(id)) {
      const next = (value ?? []).filter((v) => v !== id);
      onChange(next.length === 0 ? [] : next);
    } else {
      onChange([...(value ?? []), id]);
    }
  };

  const selectAll = () => onChange(options.map((o) => String(o.id)));
  const clearAll = () => onChange([]);
  const setNullVal = () => onChange(null);

  const selectedCount = selectedIds.size;
  const totalCount = options.length;

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border rounded-t">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 transition-transform"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-gray-700 hover:text-gray-900 cursor-pointer"
          >
            {selectedCount}/{totalCount} selected
          </button>
          {isNull && (
            <span className="text-xs text-amber-600 font-medium">(Field set to N/A)</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="px-2 py-1 text-xs text-blue-600 hover:underline font-medium"
            disabled={isNull}
          >
            Select All
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="px-2 py-1 text-xs text-gray-600 hover:underline"
            disabled={isNull}
          >
            Clear All
          </button>
          {nullable && (
            <button
              type="button"
              onClick={setNullVal}
              className={`px-2 py-1 text-xs font-medium ${
                isNull ? 'text-amber-600' : 'text-gray-400 hover:underline'
              }`}
            >
              Set N/A
            </button>
          )}
        </div>
      </div>

      {/* Collapsible wrapper for search and options */}
      {isExpanded && (
        <div className="border border-t-0 rounded-b-lg overflow-hidden">
          {/* Search */}
          <div className="border-b">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${fieldName.replace('allowed_', '').replace(/_/g, ' ')}...`}
              className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-0"
              disabled={isNull}
            />
          </div>

          {/* Checkbox grid */}
          <div className={`overflow-hidden ${isNull ? 'opacity-50' : ''}`}>
            <div className="max-h-96 overflow-y-auto p-3">
              {filtered.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-8">No options found</div>
              ) : (
                <div className="grid grid-cols-1 gap-1">
                  {filtered.map((opt) => {
                    const id = String(opt.id);
                    const checked = selectedIds.has(id);
                    const optLabel = String(opt[labelField] ?? id);
                    const hasDescription = opt.short_description != null;
                    return (
                      <label
                        key={id}
                        className={`group flex items-center gap-3 py-1 pl-[10px] rounded cursor-pointer transition-colors relative ${
                          checked
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(id)}
                          disabled={isNull}
                          className="rounded text-blue-600 flex-shrink-0 w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">{optLabel}</span>
                            {opt.id !== opt[labelField] && (
                              <span className="text-xs text-gray-400">({id})</span>
                            )}
                          </div>
                        </div>
                        {hasDescription && (
                          <div className="absolute left-12 bottom-full mb-2 z-20 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-xl max-w-sm whitespace-normal pointer-events-none">
                            {String(opt.short_description)}
                            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected summary chips */}
      {selectedCount > 0 && !isNull && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-blue-50 border border-blue-200 rounded mt-3">
          <span className="text-xs font-medium text-blue-800 mr-1">Selected:</span>
          {[...selectedIds].slice(0, 10).map((id) => {
            const opt = options.find((o) => o.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {opt ? String(opt[labelField] ?? id) : id}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="text-blue-500 hover:text-blue-700 font-bold"
                >
                  ×
                </button>
              </span>
            );
          })}
          {selectedCount > 10 && (
            <span className="text-xs text-blue-600">+{selectedCount - 10} more</span>
          )}
        </div>
      )}
    </div>
  );
}
