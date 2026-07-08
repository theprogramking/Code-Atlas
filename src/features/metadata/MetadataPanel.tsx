import { useMemo } from 'react';
import { Info, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
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
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="flex flex-col gap-1">
        {nodes.map(({ node, label }) => (
          <button
            key={node.id}
            onClick={() => onSelect(node.id)}
            className="flex items-center justify-between rounded border border-white/5 bg-white/[0.02] px-2 py-1 text-left text-[11px] text-slate-300 hover:bg-white/5"
          >
            <span className="truncate">{node.label}</span>
            {label && <span className="ml-2 shrink-0 truncate text-[9px] text-slate-500">{label}</span>}
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
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <Info size={22} className="text-slate-600" />
          </div>
          <p className="text-sm text-slate-400">Select a graph node or explorer entry to inspect its metadata.</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Metadata">
      <div className="flex flex-col gap-4 p-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-100">{node.label}</h3>
            <Badge tone="blue">{node.kind}</Badge>
            {node.isExported && <Badge tone="green">exported</Badge>}
          </div>
          <p className="mt-1 truncate text-[11px] text-slate-500">{node.filePath}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {node.meta.kind === 'file' && (
            <>
              <Stat label="Extension" value={node.meta.extension ?? 'n/a'} />
              <Stat label="Lines" value={node.meta.lineCount.toLocaleString()} />
              <Stat label="Size" value={`${(node.meta.size / 1024).toFixed(1)} KB`} />
              <Stat label="Symbols" value={String(node.meta.symbolCount)} />
            </>
          )}
          {node.meta.kind === 'function' && (
            <>
              <Stat label="Async" value={node.meta.isAsync ? 'yes' : 'no'} />
              <Stat label="Generator" value={node.meta.isGenerator ? 'yes' : 'no'} />
              <Stat label="Arrow fn" value={node.meta.isArrow ? 'yes' : 'no'} />
              <Stat label="Params" value={node.meta.params.length ? node.meta.params.join(', ') : 'none'} />
            </>
          )}
          {node.meta.kind === 'class' && (
            <>
              <Stat label="Superclass" value={node.meta.superClass ?? 'none'} />
              <Stat label="Methods" value={String(node.meta.methods.length)} />
            </>
          )}
          {node.meta.kind === 'component' && (
            <>
              <Stat label="Kind" value={node.meta.componentKind} />
              <Stat label="Hooks used" value={node.meta.hooksUsed.length ? node.meta.hooksUsed.join(', ') : 'none'} />
            </>
          )}
        </div>

        {node.meta.kind === 'class' && node.meta.methods.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Methods</p>
            <div className="flex flex-wrap gap-1">
              {node.meta.methods.map((m) => (
                <Badge key={m}>{m}</Badge>
              ))}
            </div>
          </div>
        )}

        <EdgeList title="Incoming (imported by / called by)" nodes={incoming} onSelect={handleSelect} />
        <EdgeList title="Outgoing (imports / calls)" nodes={outgoing} onSelect={handleSelect} />

        {node.meta.kind === 'file' && parsedFile && (
          <>
            {parsedFile.imports.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Imports ({parsedFile.imports.length})
                </p>
                <div className="flex flex-col gap-0.5">
                  {parsedFile.imports.slice(0, 12).map((imp) => (
                    <div key={imp.id} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <ArrowLeft size={10} className="shrink-0 text-slate-600" />
                      <span className="truncate">{imp.localName || '(side-effect)'}</span>
                      <span className="shrink-0 truncate text-slate-600">from {imp.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {parsedFile.exports.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Exports ({parsedFile.exports.length})
                </p>
                <div className="flex flex-col gap-0.5">
                  {parsedFile.exports.slice(0, 12).map((exp) => (
                    <div key={exp.id} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <ArrowRight size={10} className="shrink-0 text-slate-600" />
                      <span className="truncate">{exp.exportedName}</span>
                      <span className="shrink-0 text-slate-600">({exp.kind})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {parsedFile.errors.length > 0 && (
              <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400">
                  <AlertTriangle size={11} />
                  Parse warnings
                </div>
                {parsedFile.errors.map((e, i) => (
                  <p key={i} className="mt-1 text-[10.5px] text-amber-400/70">
                    {e.message}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/5 bg-white/[0.02] px-2 py-1.5">
      <p className="text-[9.5px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="truncate text-[11.5px] text-slate-200">{value}</p>
    </div>
  );
}
