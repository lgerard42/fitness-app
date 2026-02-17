import React, { useState, useMemo } from 'react';

interface FKDropdownProps {
  value: string;
  options: Record<string, unknown>[];
  labelField: string;
  onChange: (v: string) => void;
}

export default function FKDropdown({ value, options, labelField, onChange }: FKDropdownProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) =>
      String(o[labelField] ?? o.id ?? '').toLowerCase().includes(q)
    );
  }, [options, search, labelField]);

  const selectedLabel = options.find((o) => o.id === value)?.[labelField] ?? value;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border rounded text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value ? String(selectedLabel) : 'Select...'}
        </span>
        <span className="text-gray-400">&#9662;</span>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
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
              className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-blue-50 ${
                o.id === value ? 'bg-blue-100 text-blue-800' : 'text-gray-800'
              }`}
              onClick={() => {
                onChange(String(o.id));
                setIsOpen(false);
                setSearch('');
              }}
            >
              {String(o[labelField] ?? o.id)}
              {o.id !== o[labelField] && (
                <span className="text-xs text-gray-400 ml-2">{String(o.id)}</span>
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
