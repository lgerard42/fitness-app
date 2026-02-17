import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TableEditor from './pages/TableEditor';
import FilterMatrix from './pages/FilterMatrix';
import { api, type TableInfo, type SchemaResponse } from './api';

export default function App() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [schemaData, setSchemaData] = useState<SchemaResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const [tableList, schemas] = await Promise.all([api.listTables(), api.getSchemas()]);
      setTables(tableList);
      setSchemaData(schemas);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-500 text-lg">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar tables={tables} groups={schemaData?.groups ?? []} />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard tables={tables} />} />
          <Route
            path="/table/:key"
            element={<TableEditor schemas={schemaData?.tables ?? []} onDataChange={reload} />}
          />
          <Route
            path="/matrix"
            element={<FilterMatrix schemas={schemaData?.tables ?? []} onDataChange={reload} />}
          />
        </Routes>
      </main>
    </div>
  );
}
