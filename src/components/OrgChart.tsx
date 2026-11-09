import { Controls, Handle, Position, ReactFlow, ReactFlowProvider, useReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import type { RadarPosition } from '../lib';
import { Pill } from './ui';
import { layout, NODE_H, NODE_W } from './orgLayout';

type Data = { p: RadarPosition; selected: boolean };

const PositionNode = memo(function PositionNode({ data }: NodeProps<Node<Data>>) {
  const { p, selected } = data;
  const holder = p.holders.length === 1 ? p.holders[0].full_name : `${p.holders.length} موظفين`;
  const pill = p.is_critical ? <Pill tone="negative">بلا بديل</Pill> : p.ready === 1 ? <Pill tone="warning">بديل واحد</Pill> : null;
  return (
    <div
      dir="rtl"
      title={`${p.title} — ${p.holders.map((h) => h.full_name).join('، ')}`}
      style={{
        width: NODE_W, height: NODE_H,
        borderRightWidth: p.is_critical ? 3 : 1,
        borderRightColor: p.is_critical ? 'var(--negative)' : undefined,
        boxShadow: selected ? 'inset 0 0 0 1px var(--accent)' : undefined,
        borderColor: selected ? 'var(--accent)' : undefined,
      }}
      className="bg-surface border border-border hover:border-control rounded-card px-3 py-2 flex flex-col justify-center gap-1 box-border"
    >
      <div className="text-body font-medium truncate">{p.title}</div>
      <div className="flex items-center justify-between gap-2 min-h-5">
        <span className="text-meta text-muted truncate">{holder}</span>
        {pill}
      </div>
      <Handle type="target" position={Position.Right} isConnectable={false} />
      <Handle type="source" position={Position.Left} isConnectable={false} />
    </div>
  );
});
const nodeTypes = { position: PositionNode };

function Inner({ positions, focusId, onSelect }: { positions: RadarPosition[]; focusId: number | null; onSelect: (id: number) => void }) {
  const rf = useReactFlow();
  const wrap = useRef<HTMLDivElement>(null);
  const { pos, edges } = useMemo(() => layout(positions), [positions]);

  const nodes: Node<Data>[] = useMemo(
    () => positions.map((p) => ({ id: String(p.id), type: 'position', position: pos.get(p.id)!, data: { p, selected: p.id === focusId }, draggable: false, connectable: false })),
    [positions, pos, focusId],
  );
  const flowEdges: Edge[] = useMemo(() => edges.map((e) => ({ ...e, type: 'step', selectable: false, focusable: false })), [edges]);

  // readable zoom: fit the four columns when the frame is wide enough, otherwise a fixed 0.6 and the
  // user pans inside the frame. Anchored top-right, where RTL readers start.
  const COLUMNS_W = 4 * NODE_W + 3 * 48;
  const zoomFor = (w: number) => Math.min(0.85, Math.max(0.6, (w - 32) / COLUMNS_W));
  const placeViewport = () => {
    const w = wrap.current?.clientWidth ?? 800;
    const z = zoomFor(w);
    rf.setViewport({ x: w - 16 - NODE_W * z, y: 16, zoom: z });
  };
  useEffect(() => {
    if (focusId == null) return;
    const at = pos.get(focusId);
    if (at) rf.setCenter(at.x + NODE_W / 2, at.y + NODE_H / 2, { zoom: zoomFor(wrap.current?.clientWidth ?? 800), duration: 0 });
  }, [focusId, pos, rf]);

  return (
    <div ref={wrap} className="absolute inset-0" style={{ direction: 'ltr' }}>
      <ReactFlow
        nodes={nodes} edges={flowEdges} nodeTypes={nodeTypes}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
        minZoom={0.3} maxZoom={1.2} zoomOnDoubleClick={false} preventScrolling={false}
        onInit={placeViewport}
        onNodeClick={(_, n) => onSelect(Number(n.id))}
        proOptions={{ hideAttribution: false }}
      >
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </div>
  );
}

export default function OrgChart(props: { positions: RadarPosition[]; focusId: number | null; onSelect: (id: number) => void }) {
  return <ReactFlowProvider><Inner {...props} /></ReactFlowProvider>;
}
