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
  import: '#2F81F7',
  export: '#3FB950',
  call: '#D29922',
  owns: '#8B94A1',
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
        const widthByKind: Record<GraphNodeKind, number> = { file: 220, component: 220, class: 200, function: 190 };
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
          type: 'smoothstep',
          style: {
            stroke: EDGE_COLORS[e.kind],
            strokeWidth: isConnectedToSelection ? 2.2 : 1.2,
            opacity: selectedNodeId ? (isConnectedToSelection ? 1 : 0.14) : 0.6,
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
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
            title="Filter node/edge kinds"
          >
            <Filter size={14} />
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button
            onClick={relayout}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
            title="Auto layout"
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">Layout</span>
          </button>
        </>
      }
      bodyClassName="relative overflow-hidden"
    >
      {!graph ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
            <LayoutGrid size={26} className="text-slate-600" />
          </div>
          <p className="text-sm text-slate-400">The architecture graph will appear here once a project is parsed.</p>
        </div>
      ) : (
        <>
          {showFilters && (
            <div className="absolute right-4 top-4 z-40 w-72 rounded-3xl border border-white/10 bg-surface-900/95 p-4 shadow-panel backdrop-blur">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Node kinds</p>
              <div className="mb-4 flex flex-wrap gap-2">
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
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Edge kinds</p>
              <div className="flex flex-wrap gap-2">
                {edgeToggles.map((k) => (
                  <button
                    key={k.key}
                    onClick={() =>
                      setGraphFilter({
                        edgeKinds: { ...graphFilter.edgeKinds, [k.key]: !graphFilter.edgeKinds[k.key] },
                      })
                    }
                  >
                    <Badge tone={graphFilter.edgeKinds[k.key] ? 'orange' : 'default'}>{k.label}</Badge>
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
            minZoom={0.12}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={null}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#30363D" />
            <Controls className="!bg-surface-900/90 !text-slate-300 [&>button]:!border-white/10 [&>button]:!bg-surface-900/90 [&>button]:hover:!bg-surface-800/90" />
            <MiniMap
              pannable
              zoomable
              className="!rounded-[18px] !bg-surface-900/90"
              maskColor="rgba(17,23,35,0.75)"
              nodeColor={(n) => {
                const data = n.data as AtlasNodeData | undefined;
                if (!data) return '#64748B';
                return (
                  { file: '#8B94A1', component: '#2F81F7', class: '#A371F7', function: '#3FB950' } as Record<GraphNodeKind, string>
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
