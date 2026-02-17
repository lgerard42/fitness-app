import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface FKMultiSelectProps {
  value: string[] | null;
  options: Record<string, unknown>[];
  labelField: string;
  onChange: (v: string[] | null) => void;
  nullable?: boolean;
  refTable?: string;
}

export default function FKMultiSelect({ value, options, labelField, onChange, nullable, refTable }: FKMultiSelectProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showCards, setShowCards] = useState(false);

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

  const selectedRecords = useMemo(() => {
    return options.filter((o) => selectedIds.has(String(o.id)));
  }, [options, selectedIds]);

  const toggle = (id: string) => {
    if (isNull) {
      onChange([id]);
      return;
    }
    if (selectedIds.has(id)) {
      const next = (value ?? []).filter((v) => v !== id);
      onChange(next);
    } else {
      onChange([...(value ?? []), id]);
    }
  };

  const selectAll = () => onChange(options.map((o) => String(o.id)));
  const selectNone = () => onChange([]);
  const setNullVal = () => onChange(null);

  return (
    <div>
      {/* Selected chips */}
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {isNull ? (
          <span className="text-xs text-gray-400 italic">null (field not applicable)</span>
        ) : selectedIds.size === 0 ? (
          <span className="text-xs text-gray-400">None selected</span>
        ) : (
          <>
            {[...selectedIds].map((id) => {
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
                    x
                  </button>
                </span>
              );
            })}
            <span className="text-xs text-gray-400 self-center ml-1">
              {selectedIds.size}/{options.length}
            </span>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-2 flex-wrap">
        <button
          type="button"
          onClick={() => { setIsOpen(!isOpen); setShowCards(false); }}
          className={`px-3 py-1.5 rounded text-xs font-medium ${
            isOpen ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isOpen ? 'Close' : 'Edit'}
        </button>
        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={() => { setShowCards(!showCards); setIsOpen(false); }}
            className={`px-3 py-1.5 rounded text-xs font-medium ${
              showCards ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showCards ? 'Hide Details' : `View Selected (${selectedIds.size})`}
          </button>
        )}
        <button type="button" onClick={selectAll} className="px-2 py-1 text-xs text-blue-600 hover:underline">
          All
        </button>
        <button type="button" onClick={selectNone} className="px-2 py-1 text-xs text-blue-600 hover:underline">
          None
        </button>
        {nullable && (
          <button
            type="button"
            onClick={setNullVal}
            className={`px-2 py-1 text-xs ${isNull ? 'text-amber-600 font-medium' : 'text-gray-400 hover:underline'}`}
          >
            Set null
          </button>
        )}
      </div>

      {/* Selected record mini cards */}
      {showCards && selectedRecords.length > 0 && (
        <div className="mb-3 grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto border rounded-lg p-2 bg-gray-50">
          {selectedRecords.map((rec) => (
            <div key={String(rec.id)} className="flex items-center gap-2 bg-white border rounded px-2.5 py-1.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-800">{String(rec[labelField] ?? rec.id)}</span>
                  <span className="text-xs text-gray-400">{String(rec.id)}</span>
                </div>
                {rec.short_description != null && (
                  <div className="text-xs text-gray-400 truncate">{String(rec.short_description)}</div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {refTable && (
                  <Link
                    to={`/table/${refTable}`}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    View
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => toggle(String(rec.id))}
                  className="text-red-400 hover:text-red-600 text-xs ml-1"
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown list */}
      {isOpen && (
        <div className="border rounded max-h-60 overflow-y-auto">
          <div className="p-2 border-b sticky top-0 bg-white">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1 border rounded text-sm focus:outline-none"
              autoFocus
            />
          </div>
          {filtered.map((o) => {
            const id = String(o.id);
            const checked = selectedIds.has(id);
            return (
              <label
                key={id}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-blue-50 ${
                  checked ? 'bg-blue-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(id)}
                  className="rounded text-blue-600 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span>{String(o[labelField] ?? id)}</span>
                  {o.id !== o[labelField] && (
                    <span className="text-xs text-gray-400 ml-1">{id}</span>
                  )}
                  {o.short_description != null && (
                    <div className="text-xs text-gray-400 truncate">{String(o.short_description)}</div>
                  )}
                </div>
              </label>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
          )}
        </div>
      )}
    </div>
  );
}
