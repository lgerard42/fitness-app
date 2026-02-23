import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface FKDropdownProps {
  value: string;
  options: Record<string, unknown>[];
  labelField: string;
  onChange: (v: string) => void;
  refTable?: string;
  hideSelectedCard?: boolean;
}

export default function FKDropdown({ value, options, labelField, onChange, refTable, hideSelectedCard = false }: FKDropdownProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) =>
      String(o[labelField] ?? o.id ?? '').toLowerCase().includes(q) ||
      String(o.id ?? '').toLowerCase().includes(q) ||
      String(o.short_description ?? '').toLowerCase().includes(q)
    );
  }, [options, search, labelField]);

  const selectedRecord = options.find((o) => o.id === value);
  const selectedLabel = selectedRecord?.[labelField] ?? value;

  return (
    <div className="relative">
      {/* Selected value chip */}
      {!hideSelectedCard && value && selectedRecord && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-blue-800">{String(selectedLabel)}</span>
            <span className="text-xs text-blue-500 ml-2">{String(selectedRecord.id)}</span>
            {selectedRecord.short_description != null && (
              <div className="text-xs text-blue-600 truncate mt-0.5">
                {String(selectedRecord.short_description)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {refTable && (
              <Link
                to={`/table/${refTable}`}
                className="text-xs text-blue-500 hover:text-blue-700 hover:underline px-1"
                title="View in table"
              >
                View
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                onChange('');
              }}
              className="text-blue-400 hover:text-blue-600 text-sm px-1"
              title="Clear"
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* Preview card */}
      {showPreview && selectedRecord && (
        <div className="mb-2 border rounded-lg bg-white p-3 shadow-sm">
          <div className="text-xs text-gray-400 mb-1">Preview</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {Object.entries(selectedRecord)
              .filter(([k]) => k !== 'sort_order' && k !== 'is_active')
              .slice(0, 8)
              .map(([k, v]) => (
                <div key={k} className="truncate">
                  <span className="text-gray-400">{k}: </span>
                  <span className="text-gray-700">
                    {v === null ? 'null' : Array.isArray(v) ? `[${v.length}]` : typeof v === 'object' ? '{...}' : String(v).slice(0, 40)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Dropdown button */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 px-3 py-2 border rounded text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
        >
          <span className={value ? 'text-gray-800' : 'text-gray-400'}>
            {value ? String(selectedLabel) : 'Select...'}
          </span>
          <span className="text-gray-400">&#9662;</span>
        </button>
        {value && selectedRecord && (
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`px-2 py-2 border rounded text-xs ${showPreview ? 'bg-blue-50 text-blue-600 border-blue-300' : 'text-gray-400 hover:bg-gray-50'}`}
            title="Toggle preview"
          >
            {showPreview ? 'Hide' : 'Info'}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow-lg max-h-72 overflow-y-auto">
          <div className="p-2 border-b sticky top-0 bg-white">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by label, ID, or description..."
              className="w-full px-2 py-1 border rounded text-sm focus:outline-none"
              autoFocus
            />
          </div>
          <div
            className="px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 cursor-pointer"
            onClick={() => {
              onChange('');
              setIsOpen(false);
              setSearch('');
            }}
          >
            (none)
          </div>
          {filtered.map((o) => (
            <div
              key={String(o.id)}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                o.id === value ? 'bg-blue-100 text-blue-800' : 'text-gray-800'
              }`}
              onClick={() => {
                onChange(String(o.id));
                setIsOpen(false);
                setSearch('');
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{String(o[labelField] ?? o.id)}</span>
                {o.id !== o[labelField] && (
                  <span className="text-xs text-gray-400">{String(o.id)}</span>
                )}
              </div>
              {o.short_description != null && (
                <div className="text-xs text-gray-400 mt-0.5 truncate">
                  {String(o.short_description)}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
          )}
        </div>
      )}
    </div>
  );
}
