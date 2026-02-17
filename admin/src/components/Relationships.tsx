import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api, type FKRef, type TableSchema } from '../api';

interface RelationshipsProps {
  tableKey: string;
  recordId: string;
  recordLabel: string;
  schema: TableSchema;
  recordData: Record<string, unknown>;
  refData: Record<string, Record<string, unknown>[]>;
}

interface GroupedRefs {
  table: string;
  field: string;
  refs: FKRef[];
  direction: 'incoming' | 'outgoing';
}

export default function Relationships({
  tableKey,
  recordId,
  recordLabel,
  schema,
  recordData,
  refData,
}: RelationshipsProps) {
  const [incomingGroups, setIncomingGroups] = useState<GroupedRefs[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Load incoming relationships (what references this record)
  useEffect(() => {
    if (!tableKey || !recordId) return;
    setLoading(true);
    api.getFKRefs(tableKey, recordId)
      .then(({ refs }) => {
        const map = new Map<string, GroupedRefs>();
        for (const ref of refs) {
          const gk = `incoming::${ref.table}::${ref.field}`;
          if (!map.has(gk)) {
            map.set(gk, { table: ref.table, field: ref.field, refs: [], direction: 'incoming' });
          }
          map.get(gk)!.refs.push(ref);
        }
        setIncomingGroups([...map.values()]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tableKey, recordId]);

  // Compute outgoing relationships (what this record references)
  const outgoingGroups = useMemo((): GroupedRefs[] => {
    const groups: GroupedRefs[] = [];
    const map = new Map<string, GroupedRefs>();

    for (const field of schema.fields) {
      if ((field.type === 'fk' || field.type === 'fk[]') && field.refTable) {
        const value = recordData[field.name];
        if (value == null) continue;

        const refs: FKRef[] = [];
        const labelField = field.refLabelField || 'label';
        if (field.type === 'fk') {
          const refRecord = refData[field.refTable]?.find((r) => r.id === value);
          if (refRecord) {
            refs.push({
              table: field.refTable,
              field: field.name,
              rowId: String(value),
              rowLabel: String(refRecord[labelField] || refRecord.id || value),
            });
          }
        } else if (field.type === 'fk[]' && Array.isArray(value)) {
          for (const id of value) {
            const refRecord = refData[field.refTable]?.find((r) => r.id === id);
            if (refRecord) {
              refs.push({
                table: field.refTable,
                field: field.name,
                rowId: String(id),
                rowLabel: String(refRecord[labelField] || refRecord.id || id),
              });
            }
          }
        }

        if (refs.length > 0) {
          const gk = `outgoing::${field.refTable}::${field.name}`;
          map.set(gk, {
            table: field.refTable,
            field: field.name,
            refs,
            direction: 'outgoing',
          });
        }
      }
    }

    return [...map.values()];
  }, [schema, recordData, refData]);

  if (loading) return <div className="text-xs text-gray-400 py-2">Loading relationships...</div>;

  const totalIncoming = incomingGroups.reduce((sum, g) => sum + g.refs.length, 0);
  const totalOutgoing = outgoingGroups.reduce((sum, g) => sum + g.refs.length, 0);

  if (totalIncoming === 0 && totalOutgoing === 0) {
    return (
      <div className="text-xs text-gray-400 py-2 italic">
        No relationships found.
      </div>
    );
  }

  const toggleGroup = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const renderGroup = (g: GroupedRefs, prefix: string) => {
    const gk = `${prefix}::${g.table}::${g.field}`;
    const isExpanded = expanded.has(gk);
    return (
      <div key={gk} className="bg-white border rounded">
        <button
          type="button"
          onClick={() => toggleGroup(gk)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
        >
          <span className="text-xs text-gray-500 w-4">{isExpanded ? '▼' : '▶'}</span>
          <span className="text-sm text-gray-700 flex-1">
            <span className="font-medium">{g.refs.length}</span>
            {' '}
            <Link
              to={`/table/${g.table}`}
              className="text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {g.table}
            </Link>
            <span className="text-gray-400 text-xs ml-1">
              {g.direction === 'incoming' ? '←' : '→'} via {g.field}
            </span>
          </span>
        </button>

        {isExpanded && (
          <div className="border-t px-3 py-2 space-y-1 max-h-48 overflow-y-auto">
            {g.refs.map((ref, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Link
                  to={`/table/${ref.table}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {ref.rowLabel}
                </Link>
                <span className="text-gray-400">{ref.rowId}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Outgoing Relationships */}
      {outgoingGroups.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">
              References {totalOutgoing} record{totalOutgoing !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-400">in {outgoingGroups.length} table{outgoingGroups.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-1.5">
            {outgoingGroups.map((g) => renderGroup(g, 'outgoing'))}
          </div>
        </div>
      )}

      {/* Incoming Relationships */}
      {incomingGroups.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">
              Referenced by {totalIncoming} record{totalIncoming !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-400">across {incomingGroups.length} table{incomingGroups.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-1.5">
            {incomingGroups.map((g) => renderGroup(g, 'incoming'))}
          </div>
        </div>
      )}
    </div>
  );
}
