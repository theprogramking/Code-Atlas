import { useMemo } from 'react';
import { Info, ArrowRight, ArrowLeft, AlertTriangle, Layers, Sparkles } from 'lucide-react';
import { Panel } from '../../components/Panel';
import { Badge } from '../../components/Badge';
import { useAppStore } from '../../store/useAppStore';
import type { GraphNodeData } from '../../types/graph';

function EdgeList({
  title,
  nodes,
  onSelect,
}: {
  title: string;
  nodes: { node: GraphNodeData; label?: string }[];
  onSelect: (id: string) => void;
}) {
  if (nodes.length === 0) return null;
  return (
    <div className="rounded-3xl border border-white/10 bg-surface-900/80 p-3 shadow-soft">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        <Layers size={14} />
        <span>{title}</span>
      </div>
      <div className="flex flex-col gap-2">
        {nodes.map(({ node, label }) => (
          <button
            key={node.id}
            onClick={() => onSelect(node.id)}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface-950/80 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/5"
          >
            <span className="truncate">{node.label}</span>
            {label ? <span className="text-xs text-slate-500">{label}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MetadataPanel() {
  const graph = useAppStore((s) => s.graph);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const selectNode = useAppStore((s) => s.selectNode);
  const selectFileByPath = useAppStore((s) => s.selectFileByPath);
  const parsedFiles = useAppStore((s) => s.parsedFiles);

  const node = useMemo(() => graph?.nodes.find((n) => n.id === selectedNodeId), [graph, selectedNodeId]);

  const incoming = useMemo(() => {
    if (!graph || !node) return [] as { node: GraphNodeData; label: string }[];
    const result: { node: GraphNodeData; label: string }[] = [];
    for (const e of graph.edges) {
      if (e.target !== node.id) continue;
      const source = graph.nodes.find((n) => n.id === e.source);
      if (source) result.push({ node: source, label: e.kind });
    }
    return result;
  }, [graph, node]);

  const outgoing = useMemo(() => {
    if (!graph || !node) return [] as { node: GraphNodeData; label: string }[];
    const result: { node: GraphNodeData; label: string }[] = [];
    for (const e of graph.edges) {
      if (e.source !== node.id) continue;
      const target = graph.nodes.find((n) => n.id === e.target);
      if (target) result.push({ node: target, label: e.kind });
    }
    return result;
  }, [graph, node]);

  const parsedFile = node ? parsedFiles.get(node.filePath) : undefined;

  const handleSelect = (id: string) => {
    selectNode(id);
    const target = graph?.nodes.find((n) => n.id === id);
    if (target) selectFileByPath(target.filePath);
  };

  if (!node) {
    return (
      <Panel title="Metadata">
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
            <Info size={26} className="text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Select a node to inspect</p>
            <p className="mt-2 text-sm text-slate-400">Hover or click a graph node or explorer item to view metadata and relationships.</p>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Metadata">
      <div className="flex h-full flex-col gap-4">
        <div className="rounded-3xl border border-white/10 bg-surface-900/80 p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/5 text-accent-blue">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100">{node.label}</p>
              <p className="mt-1 text-xs text-slate-500 truncate">{node.filePath}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="blue">{node.kind}</Badge>
                {node.isExported && <Badge tone="green">exported</Badge>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Type" value={node.meta.kind} />
            <Stat label="Exported" value={node.isExported ? 'Yes' : 'No'} />
            {node.meta.kind === 'file' && <Stat label="Lines" value={node.meta.lineCount.toLocaleString()} />}
            {node.meta.kind === 'file' && <Stat label="Size" value={`${(node.meta.size / 1024).toFixed(1)} KB`} />}
          </div>

          {node.meta.kind === 'function' && (
            <CardSection title="Function details">
              <Detail label="Async" value={node.meta.isAsync ? 'Yes' : 'No'} />
              <Detail label="Generator" value={node.meta.isGenerator ? 'Yes' : 'No'} />
              <Detail label="Arrow" value={node.meta.isArrow ? 'Yes' : 'No'} />
              <Detail label="Parameters" value={node.meta.params.length ? node.meta.params.join(', ') : 'None'} />
            </CardSection>
          )}

          {node.meta.kind === 'class' && (
            <CardSection title="Class details">
              <Detail label="Superclass" value={node.meta.superClass ?? 'None'} />
              <Detail label="Methods" value={String(node.meta.methods.length)} />
            </CardSection>
          )}

          {node.meta.kind === 'component' && (
            <CardSection title="Component details">
              <Detail label="Component kind" value={node.meta.componentKind} />
              <Detail label="Hooks used" value={node.meta.hooksUsed.length ? node.meta.hooksUsed.join(', ') : 'None'} />
            </CardSection>
          )}

          <EdgeList title="Incoming dependencies" nodes={incoming} onSelect={handleSelect} />
          <EdgeList title="Outgoing dependencies" nodes={outgoing} onSelect={handleSelect} />

          {node.meta.kind === 'file' && parsedFile && (
            <CardSection title="File insights">
              <p className="text-sm leading-6 text-slate-400">
                This file includes {parsedFile.imports.length} imports and {parsedFile.exports.length} exports. More AI insights will appear here soon.
              </p>
            </CardSection>
          )}
        </div>
      </div>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-surface-900/80 px-4 py-3 text-sm text-slate-200 shadow-soft">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface-950/90 px-3 py-2 text-sm text-slate-200">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-surface-900/80 p-4 shadow-soft">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
