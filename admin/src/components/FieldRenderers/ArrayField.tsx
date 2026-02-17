import React, { useState } from 'react';

interface ArrayFieldProps {
  value: string[];
  onChange: (v: string[]) => void;
}

export default function ArrayField({ value, onChange }: ArrayFieldProps) {
  const [input, setInput] = useState('');

  const addItem = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput('');
    }
  };

  const removeItem = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((item, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-blue-500 hover:text-blue-700 font-bold"
            >
              x
            </button>
          </span>
        ))}
        {value.length === 0 && <span className="text-gray-400 text-xs">No items</span>}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Type and press Enter"
          className="flex-1 px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={addItem}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
        >
          Add
        </button>
      </div>
    </div>
  );
}
