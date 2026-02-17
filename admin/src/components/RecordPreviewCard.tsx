import React from 'react';
import { Link } from 'react-router-dom';

interface RecordPreviewCardProps {
  record: Record<string, unknown>;
  tableKey: string;
  labelField: string;
  compact?: boolean;
}

export default function RecordPreviewCard({ record, tableKey, labelField, compact }: RecordPreviewCardProps) {
  if (compact) {
    return (
      <Link
        to={`/table/${tableKey}`}
        className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border rounded text-xs hover:border-blue-400 hover:shadow-sm transition-all no-underline"
      >
        <span className="font-medium text-gray-800">{String(record[labelField] ?? record.id)}</span>
        <span className="text-gray-400">{String(record.id)}</span>
      </Link>
    );
  }

  return (
    <div className="border rounded-lg bg-white p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm text-gray-800">
          {String(record[labelField] ?? record.id)}
        </span>
        <Link
          to={`/table/${tableKey}`}
          className="text-xs text-blue-600 hover:underline"
        >
          View in {tableKey}
        </Link>
      </div>
      <div className="text-xs text-gray-400 mb-2">ID: {String(record.id)}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {Object.entries(record)
          .filter(([k]) => k !== 'id' && k !== labelField && k !== 'sort_order' && k !== 'is_active')
          .slice(0, 6)
          .map(([k, v]) => (
            <div key={k} className="truncate">
              <span className="text-gray-400">{k}: </span>
              <span className="text-gray-600">
                {v === null ? 'null' : typeof v === 'object' ? '{...}' : String(v).slice(0, 30)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
