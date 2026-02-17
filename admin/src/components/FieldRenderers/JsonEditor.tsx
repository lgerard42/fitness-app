import React, { useState, useEffect } from 'react';

interface JsonEditorProps {
  value: unknown;
  onChange: (v: unknown) => void;
  jsonShape?: string;
}

export default function JsonEditor({ value, onChange, jsonShape }: JsonEditorProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setText(JSON.stringify(value, null, 2));
      setError('');
    } catch {
      setText(String(value));
    }
  }, [value]);

  const handleBlur = () => {
    try {
      const parsed = JSON.parse(text);
      onChange(parsed);
      setError('');
    } catch (err) {
      setError(`Invalid JSON: ${err}`);
    }
  };

  return (
    <div>
      {jsonShape && (
        <div className="text-xs text-gray-400 mb-1">Shape: {jsonShape}</div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        rows={Math.min(20, Math.max(4, text.split('\n').length + 1))}
        spellCheck={false}
        className={`w-full px-3 py-2 border rounded text-sm font-mono focus:outline-none focus:ring-2 ${
          error ? 'border-red-300 focus:ring-red-500' : 'focus:ring-blue-500'
        }`}
      />
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  );
}
