import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api, type RelationshipNode, type RelationshipEdge } from '../../api';

// ─── Color palette for groups ──────────────────────────────────
const GROUP_COLORS: Record<string, { bg: string; border: string; text: string; mini: string }> = {
  Muscles:         { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', mini: '#f59e0b' },
  Equipment:       { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', mini: '#3b82f6' },
  Motions:         { bg: '#d1fae5', border: '#10b981', text: '#065f46', mini: '#10b981' },
  'Grips & Stance':{ bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', mini: '#8b5cf6' },
  'Exercise Setup':{ bg: '#fee2e2', border: '#ef4444', text: '#991b1b', mini: '#ef4444' },
};
const DEFAULT_COLOR = { bg: '#f3f4f6', border: '#9ca3af', text: '#374151', mini: '#9ca3af' };

function getGroupColor(group: string) {
  return GROUP_COLORS[group] || DEFAULT_COLOR;
}

// ─── Custom Node ───────────────────────────────────────────────
interface TableNodeData {
  label: string;
  group: string;
  rowCount: number;
  tableKey: string;
  incomingCount: number;
  outgoingCount: number;
  [key: string]: unknown;
}

function TableNode({ data }: { data: TableNodeData }) {
  const color = getGroupColor(data.group);
  return (
    <div
      className="rounded-lg shadow-md border-2 min-w-[160px] cursor-pointer transition-shadow hover:shadow-lg"
      style={{ backgroundColor: color.bg, borderColor: color.border }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-gray-400" />
      <div className="px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: color.border }}>
          {data.group}
        </div>
        <div className="font-bold text-sm" style={{ color: color.text }}>
          {data.label}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: color.text + 'bb' }}>
          <span>{data.rowCount} rows</span>
          {data.incomingCount > 0 && <span>{data.incomingCount} in</span>}
          {data.outgoingCount > 0 && <span>{data.outgoingCount} out</span>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-400" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  tableNode: TableNode as unknown as NodeTypes[string],
};

// ─── Layout helper: arrange nodes by group ─────────────────────
function layoutNodes(nodes: RelationshipNode[], edges: RelationshipEdge[]): Node<TableNodeData>[] {
  const groups = [...new Set(nodes.map((n) => n.group))];
  const groupMap = new Map<string, RelationshipNode[]>();
  for (const n of nodes) {
    if (!groupMap.has(n.group)) groupMap.set(n.group, []);
    groupMap.get(n.group)!.push(n);
  }

  const incomingCount = new Map<string, number>();
  const outgoingCount = new Map<string, number>();
  for (const e of edges) {
    outgoingCount.set(e.from, (outgoingCount.get(e.from) || 0) + 1);
    incomingCount.set(e.to, (incomingCount.get(e.to) || 0) + 1);
  }

  const result: Node<TableNodeData>[] = [];
  const NODE_W = 200;
  const NODE_H = 90;
  const GROUP_GAP_X = 60;
  const GROUP_GAP_Y = 40;

  let groupX = 0;
  for (const group of groups) {
    const members = groupMap.get(group) || [];
    const cols = Math.ceil(Math.sqrt(members.length));

    members.forEach((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      result.push({
        id: n.key,
        type: 'tableNode',
        position: { x: groupX + col * (NODE_W + 20), y: row * (NODE_H + GROUP_GAP_Y) },
        data: {
          label: n.label,
          group: n.group,
          rowCount: n.rowCount,
          tableKey: n.key,
          incomingCount: incomingCount.get(n.key) || 0,
          outgoingCount: outgoingCount.get(n.key) || 0,
        },
      });
    });

    const cols2 = Math.ceil(Math.sqrt(members.length));
    groupX += cols2 * (NODE_W + 20) + GROUP_GAP_X;
  }

  return result;
}

function buildEdges(raw: RelationshipEdge[]): Edge[] {
  return raw.map((e, i) => ({
    id: `e-${i}`,
    source: e.from,
    target: e.to,
    label: e.field,
    type: 'smoothstep',
    animated: e.type === 'fk[]',
    style: {
      stroke: e.type === 'fk[]' ? '#8b5cf6' : '#6b7280',
      strokeWidth: e.type === 'fk[]' ? 2 : 1.5,
    },
    labelStyle: { fontSize: 10, fill: '#6b7280' },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.85 },
    labelBgPadding: [4, 2] as [number, number],
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: e.type === 'fk[]' ? '#8b5cf6' : '#6b7280',
      width: 16,
      height: 16,
    },
  }));
}

// ─── Main Component ────────────────────────────────────────────
export default function RelationshipGraph() {
  const navigate = useNavigate();
  const [rawNodes, setRawNodes] = useState<RelationshipNode[]>([]);
  const [rawEdges, setRawEdges] = useState<RelationshipEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [filterTable, setFilterTable] = useState<string>('');
  const [showLabels, setShowLabels] = useState(true);

  useEffect(() => {
    api.getRelationships().then((data) => {
      setRawNodes(data.nodes);
      setRawEdges(data.edges);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => [...new Set(rawNodes.map((n) => n.group))], [rawNodes]);

  const { filteredNodes, filteredEdges } = useMemo(() => {
    let fNodes = rawNodes;
    let fEdges = rawEdges;

    if (filterGroup) {
      const groupKeys = new Set(rawNodes.filter((n) => n.group === filterGroup).map((n) => n.key));
      fEdges = fEdges.filter((e) => groupKeys.has(e.from) || groupKeys.has(e.to));
      const connectedKeys = new Set<string>();
      for (const e of fEdges) { connectedKeys.add(e.from); connectedKeys.add(e.to); }
      fNodes = fNodes.filter((n) => n.group === filterGroup || connectedKeys.has(n.key));
    }

    if (filterTable) {
      fEdges = fEdges.filter((e) => e.from === filterTable || e.to === filterTable);
      const connected = new Set<string>();
      connected.add(filterTable);
      for (const e of fEdges) { connected.add(e.from); connected.add(e.to); }
      fNodes = fNodes.filter((n) => connected.has(n.key));
    }

    return { filteredNodes: fNodes, filteredEdges: fEdges };
  }, [rawNodes, rawEdges, filterGroup, filterTable]);

  const initialNodes = useMemo(() => layoutNodes(filteredNodes, filteredEdges), [filteredNodes, filteredEdges]);
  const initialEdges = useMemo(() => {
    const edges = buildEdges(filteredEdges);
    if (!showLabels) return edges.map((e) => ({ ...e, label: undefined }));
    return edges;
  }, [filteredEdges, showLabels]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    navigate(`/table/${node.id}`);
  }, [navigate]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Loading graph...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex-shrink-0 p-4 border-b bg-white flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold text-gray-800 mr-4">Relationship Graph</h1>

        <select
          value={filterGroup}
          onChange={(e) => { setFilterGroup(e.target.value); setFilterTable(''); }}
          className="px-2 py-1.5 border rounded text-sm bg-white"
        >
          <option value="">All Groups</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <select
          value={filterTable}
          onChange={(e) => setFilterTable(e.target.value)}
          className="px-2 py-1.5 border rounded text-sm bg-white"
        >
          <option value="">All Tables</option>
          {rawNodes.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
        </select>

        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
            className="rounded text-blue-600"
          />
          Edge labels
        </label>

        <div className="ml-auto flex gap-3 text-xs text-gray-500">
          <span>{filteredNodes.length} tables</span>
          <span>{filteredEdges.length} relationships</span>
        </div>

        {/* Legend */}
        <div className="flex gap-2 items-center text-xs">
          <span className="inline-flex items-center gap-1">
            <span className="w-8 h-0.5 bg-gray-500 inline-block" /> fk (1:1)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-8 h-0.5 bg-purple-500 inline-block" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #8b5cf6 0, #8b5cf6 4px, transparent 4px, transparent 8px)' }} /> fk[] (1:many)
          </span>
        </div>
      </div>

      {/* Graph area */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} />
          <Controls position="bottom-left" />
          <MiniMap
            nodeColor={(node) => {
              const d = node.data as TableNodeData | undefined;
              return d ? getGroupColor(d.group).mini : '#9ca3af';
            }}
            maskColor="rgb(243 244 246 / 0.7)"
            position="bottom-right"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
