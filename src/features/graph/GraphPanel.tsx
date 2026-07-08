import { useMemo, useCallback, useState, memo } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  type NodeMouseHandler,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { LayoutGrid, Filter } from 'lucide-react';
import { Panel } from '../../components/Panel';
import { Badge } from '../../components/Badge';
import { useAppStore } from '../../store/useAppStore';
import { nodeTypes, type AtlasNodeData } from './AtlasNode';
import type { GraphEdgeKind, GraphNodeKind } from '../../types/graph';

const EDGE_COLORS: Record<GraphEdgeKind, string> = {
  import: '#5b7cfa',
  export: '#34d399',
  call: '#f59e0b',
  owns: '#475569',
};

function nodeMatchesSearch(label: string, filePath: string, query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase();
  return label.toLowerCase().includes(q) || filePath.toLowerCase().includes(q);
}

const GraphInner = memo(function GraphInner() {
  const graph = useAppStore((s) => s.graph);
  const layoutPositions = useAppStore((s) => s.layoutPositions);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const selectNode = useAppStore((s) => s.selectNode);
  const selectFileByPath = useAppStore((s) => s.selectFileByPath);
  const updateNodePosition = useAppStore((s) => s.updateNodePosition);
  const relayout = useAppStore((s) => s.relayout);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const graphFilter = useAppStore((s) => s.graphFilter);
  const setGraphFilter = useAppStore((s) => s.setGraphFilter);
  const [showFilters, setShowFilters] = useState(false);

  const connectedIds = useMemo(() => {
    if (!graph || !selectedNodeId) return new Set<string>();
    const set = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.source === selectedNodeId) set.add(edge.target);
      if (edge.target === selectedNodeId) set.add(edge.source);
    }
    return set;
  }, [graph, selectedNodeId]);

  const visibleNodeIds = useMemo(() => {
    if (!graph) return new Set<string>();
    const set = new Set<string>();
    for (const n of graph.nodes) {
      if (graphFilter.kinds[n.kind as GraphNodeKind]) set.add(n.id);
    }
    return set;
  }, [graph, graphFilter]);

  const flowNodes: Node<AtlasNodeData>[] = useMemo(() => {
    if (!graph) return [];
    return graph.nodes
      .filter((n) => visibleNodeIds.has(n.id))
      .map((n) => {
        const pos = layoutPositions[n.id] ?? { x: 0, y: 0 };
        const widthByKind: Record<GraphNodeKind, number> = { file: 200, component: 180, class: 170, function: 160 };
        return {
          id: n.id,
          type: 'atlasNode',
          position: pos,
          data: {
            graphNode: n,
            isDimmed: selectedNodeId !== null && n.id !== selectedNodeId && !connectedIds.has(n.id),
            isHighlighted: connectedIds.has(n.id),
            isSelected: n.id === selectedNodeId,
            matchesSearch: nodeMatchesSearch(n.label, n.filePath, searchQuery),
          },
          style: { width: widthByKind[n.kind] },
        } satisfies Node<AtlasNodeData>;
      });
  }, [graph, layoutPositions, selectedNodeId, connectedIds, searchQuery, visibleNodeIds]);

  const flowEdges: Edge[] = useMemo(() => {
    if (!graph) return [];
    return graph.edges
      .filter(
        (e) =>
          graphFilter.edgeKinds[e.kind] &&
          visibleNodeIds.has(e.source) &&
          visibleNodeIds.has(e.target),
      )
      .map((e) => {
        const isConnectedToSelection =
          selectedNodeId !== null && (e.source === selectedNodeId || e.target === selectedNodeId);
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.kind === 'import' ? e.label : undefined,
          style: {
            stroke: EDGE_COLORS[e.kind],
            strokeWidth: isConnectedToSelection ? 2 : 1,
            opacity: selectedNodeId ? (isConnectedToSelection ? 1 : 0.12) : 0.55,
          },
          animated: e.kind === 'call' && isConnectedToSelection,
        } satisfies Edge;
      });
  }, [graph, selectedNodeId, graphFilter, visibleNodeIds]);

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_, node) => {
      selectNode(node.id);
      const graphNode = graph?.nodes.find((n) => n.id === node.id);
      if (graphNode) selectFileByPath(graphNode.filePath);
    },
    [graph, selectNode, selectFileByPath],
  );

  const handleNodeDragStop = useCallback<NodeMouseHandler>(
    (_, node) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition],
  );

  const handlePaneClick = useCallback(() => selectNode(null), [selectNode]);

  const kindToggles: { key: GraphNodeKind; label: string }[] = [
    { key: 'file', label: 'Files' },
    { key: 'component', label: 'Components' },
    { key: 'class', label: 'Classes' },
    { key: 'function', label: 'Functions' },
  ];
  const edgeToggles: { key: GraphEdgeKind; label: string }[] = [
    { key: 'import', label: 'Imports' },
    { key: 'call', label: 'Calls' },
    { key: 'owns', label: 'Ownership' },
    { key: 'export', label: 'Re-exports' },
  ];

  return (
    <Panel
      title="Architecture Graph"
      actions={
        <>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-slate-400 hover:bg-white/5 hover:text-slate-200"
            title="Filter node/edge kinds"
          >
            <Filter size={12} />
          </button>
          <button
            onClick={relayout}
            className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-slate-400 hover:bg-white/5 hover:text-slate-200"
            title="Auto layout"
          >
            <LayoutGrid size={12} />
          </button>
        </>
      }
      bodyClassName="relative overflow-hidden"
    >
      {!graph ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <LayoutGrid size={22} className="text-slate-600" />
          </div>
          <p className="text-sm text-slate-400">The architecture graph will appear here once a project is parsed.</p>
        </div>
      ) : (
        <>
          {showFilters && (
            <div className="absolute right-2 top-2 z-40 w-56 rounded-2xl border border-white/10 bg-surface-800/95 p-2.5 shadow-panel backdrop-blur">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Node kinds</p>
              <div className="mb-2 flex flex-wrap gap-1">
                {kindToggles.map((k) => (
                  <button
                    key={k.key}
                    onClick={() =>
                      setGraphFilter({ kinds: { ...graphFilter.kinds, [k.key]: !graphFilter.kinds[k.key] } })
                    }
                  >
                    <Badge tone={graphFilter.kinds[k.key] ? 'blue' : 'default'}>{k.label}</Badge>
                  </button>
                ))}
              </div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Edge kinds</p>
              <div className="flex flex-wrap gap-1">
                {edgeToggles.map((k) => (
                  <button
                    key={k.key}
                    onClick={() =>
                      setGraphFilter({
                        edgeKinds: { ...graphFilter.edgeKinds, [k.key]: !graphFilter.edgeKinds[k.key] },
                      })
                    }
                  >
                    <Badge tone={graphFilter.edgeKinds[k.key] ? 'amber' : 'default'}>{k.label}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            onNodeDragStop={handleNodeDragStop}
            onPaneClick={handlePaneClick}
            fitView
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={null}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#28304a" />
            <Controls className="!bg-surface-800 !text-slate-300 [&>button]:!border-white/10 [&>button]:!bg-surface-800 [&>button]:hover:!bg-surface-700" />
            <MiniMap
              pannable
              zoomable
              className="!bg-surface-800"
              maskColor="rgba(11,15,25,0.7)"
              nodeColor={(n) => {
                const data = n.data as AtlasNodeData | undefined;
                if (!data) return '#475569';
                return (
                  { file: '#64748b', component: '#7c9cff', class: '#a78bfa', function: '#34d399' } as Record<
                    GraphNodeKind,
                    string
                  >
                )[data.graphNode.kind];
              }}
            />
          </ReactFlow>
        </>
      )}
    </Panel>
  );
});

export function GraphPanel() {
  return (
    <ReactFlowProvider>
      <GraphInner />
    </ReactFlowProvider>
  );
}
