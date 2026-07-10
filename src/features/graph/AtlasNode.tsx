import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import clsx from 'clsx';
import { FileCode2, FunctionSquare, Component, Box } from 'lucide-react';
import type { GraphNodeData } from '../../types/graph';

const KIND_STYLES: Record<
  GraphNodeData['kind'],
  { icon: typeof FileCode2; bg: string; iconColor: string; accent: string }
> = {
  file: {
    icon: FileCode2,
    bg: 'bg-surface-900',
    iconColor: 'text-slate-300',
    accent: 'border-slate-600',
  },
  component: {
    icon: Component,
    bg: 'bg-accent-blue/10',
    iconColor: 'text-accent-blue',
    accent: 'border-accent-blue/30',
  },
  class: {
    icon: Box,
    bg: 'bg-accent-purple/10',
    iconColor: 'text-accent-purple',
    accent: 'border-accent-purple/30',
  },
  function: {
    icon: FunctionSquare,
    bg: 'bg-accent-green/10',
    iconColor: 'text-accent-green',
    accent: 'border-accent-green/30',
  },
};

export interface AtlasNodeData {
  graphNode: GraphNodeData;
  isDimmed: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  matchesSearch: boolean;
}

function AtlasNodeInner({ data }: NodeProps<AtlasNodeData>) {
  const { graphNode, isDimmed, isHighlighted, isSelected, matchesSearch } = data;
  const style = KIND_STYLES[graphNode.kind];
  const Icon = style.icon;

  let subtitle = '';
  if (graphNode.meta.kind === 'file') subtitle = `${graphNode.meta.symbolCount} symbols`;
  else if (graphNode.meta.kind === 'function') subtitle = graphNode.meta.isAsync ? 'async function' : 'function';
  else if (graphNode.meta.kind === 'class') subtitle = graphNode.meta.superClass ? `extends ${graphNode.meta.superClass}` : 'class';
  else if (graphNode.meta.kind === 'component') subtitle = `${graphNode.meta.componentKind} component`;

  return (
    <div
      className={clsx(
        'w-full rounded-[16px] border px-4 py-3 shadow-soft transition duration-150',
        style.bg,
        style.accent,
        isDimmed && !isHighlighted && !isSelected && 'opacity-25',
        isSelected && 'ring-2 ring-accent-blue/60',
        isHighlighted && !isSelected && 'ring-1 ring-accent-blue/40',
        matchesSearch && !isSelected && 'ring-1 ring-accent-blue/40',
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-0 !bg-slate-600" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-0 !bg-slate-600" />
      <div className="flex items-start gap-2">
        <div className={clsx('mt-1 rounded-2xl p-2', style.bg)}>
          <Icon size={16} className={clsx(style.iconColor)} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <span className="truncate">{graphNode.label}</span>
            {graphNode.isExported ? (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">export</span>
            ) : null}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

export const AtlasNode = memo(AtlasNodeInner);

export const nodeTypes = { atlasNode: AtlasNode };
