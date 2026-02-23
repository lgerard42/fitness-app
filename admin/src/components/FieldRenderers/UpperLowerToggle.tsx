import React from 'react';

interface UpperLowerToggleProps {
  value: string[];
  onChange: (v: string[]) => void;
}

function isUpperValue(v: string): boolean {
  const u = String(v).toUpperCase();
  return u === 'UPPER' || u === 'UPPER BODY';
}
function isLowerValue(v: string): boolean {
  const u = String(v).toUpperCase();
  return u === 'LOWER' || u === 'LOWER BODY';
}

export default function UpperLowerToggle({ value, onChange }: UpperLowerToggleProps) {
  const isUpper = Array.isArray(value) && value.some(isUpperValue);
  const isLower = Array.isArray(value) && value.some(isLowerValue);
  const isBoth = isUpper && isLower;

  const handleToggle = (option: 'Upper' | 'Lower' | 'Both') => {
    if (option === 'Upper') {
      onChange(['UPPER']);
    } else if (option === 'Lower') {
      onChange(['LOWER']);
    } else {
      onChange(['UPPER', 'LOWER']);
    }
  };

  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => handleToggle('Upper')}
        className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
          isUpper && !isLower
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        Upper
      </button>
      <button
        type="button"
        onClick={() => handleToggle('Lower')}
        className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
          isLower && !isUpper
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        Lower
      </button>
      <button
        type="button"
        onClick={() => handleToggle('Both')}
        className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
          isBoth
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        Both
      </button>
    </div>
  );
}
