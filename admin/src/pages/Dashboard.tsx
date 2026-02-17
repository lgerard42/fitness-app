import React from 'react';
import { Link } from 'react-router-dom';
import type { TableInfo } from '../api';

interface DashboardProps {
  tables: TableInfo[];
}

const groupColors: Record<string, string> = {
  'Exercise Setup': 'bg-purple-50 border-purple-200',
  Muscles: 'bg-red-50 border-red-200',
  Equipment: 'bg-blue-50 border-blue-200',
  Motions: 'bg-green-50 border-green-200',
  'Grips & Stance': 'bg-amber-50 border-amber-200',
};

export default function Dashboard({ tables }: DashboardProps) {
  const groups = [...new Set(tables.map((t) => t.group))];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Exercise Config Admin</h1>
      <p className="text-gray-500 mb-8">
        Manage your exercise configuration tables. Changes are written directly to the JSON files in{' '}
        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">src/database/tables/</code>.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-gray-800">{tables.length}</div>
          <div className="text-sm text-gray-500">Total Tables</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-gray-800">
            {tables.reduce((sum, t) => sum + t.rowCount, 0)}
          </div>
          <div className="text-sm text-gray-500">Total Rows</div>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">{group}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tables
              .filter((t) => t.group === group)
              .map((t) => (
                <Link
                  key={t.key}
                  to={`/table/${t.key}`}
                  className={`block rounded-lg border p-4 hover:shadow-md transition-shadow no-underline ${
                    groupColors[group] || 'bg-white border-gray-200'
                  }`}
                >
                  <div className="font-medium text-gray-800">{t.label}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {t.rowCount} rows &middot;{' '}
                    <span className="text-xs text-gray-400">{t.file}</span>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
