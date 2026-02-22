import React from 'react';

interface UpperLowerToggleSimpleProps {
  value: string;
  onChange: (v: string) => void;
}

export default function UpperLowerToggleSimple({ value, onChange }: UpperLowerToggleSimpleProps) {
  const isUpper = value === 'Upper';
  const isLower = value === 'Lower';

  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => onChange('Upper')}
        className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
          isUpper
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        Upper
      </button>
      <button
        type="button"
        onClick={() => onChange('Lower')}
        className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
          isLower
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        Lower
      </button>
    </div>
  );
}
