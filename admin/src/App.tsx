import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TableEditor from './pages/TableEditor';
import FilterMatrix from './pages/FilterMatrix';
import RelationshipGraph from './pages/RelationshipGraph';
import MotionDeltaMatrix from './pages/MotionDeltaMatrix';
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
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: '14px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { duration: 5000 },
        }}
      />
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
          <Route
            path="/motion-delta-matrix"
            element={<MotionDeltaMatrix schemas={schemaData?.tables ?? []} onDataChange={reload} />}
          />
          <Route path="/graph" element={<RelationshipGraph />} />
        </Routes>
      </main>
    </div>
  );
}
