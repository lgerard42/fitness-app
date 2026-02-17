import React from 'react';

interface NumberFieldProps {
  value: number | null | undefined;
  onChange: (v: number) => void;
  step?: number;
}

export default function NumberField({ value, onChange, step = 1 }: NumberFieldProps) {
  return (
    <input
      type="number"
      value={value ?? 0}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
