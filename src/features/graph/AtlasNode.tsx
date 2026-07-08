import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import clsx from 'clsx';
import { FileCode2, FunctionSquare, Component, Box } from 'lucide-react';
import type { GraphNodeData } from '../../types/graph';

const KIND_STYLES: Record<
  GraphNodeData['kind'],
  { icon: typeof FileCode2; border: string; bg: string; iconColor: string }
> = {
  file: {
    icon: FileCode2,
    border: 'border-slate-500/40',
    bg: 'bg-surface-800',
    iconColor: 'text-slate-400',
  },
  component: {
    icon: Component,
    border: 'border-accent-500/50',
    bg: 'bg-accent-600/10',
    iconColor: 'text-accent-300',
  },
  class: {
    icon: Box,
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/10',
    iconColor: 'text-violet-300',
  },
  function: {
    icon: FunctionSquare,
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-300',
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
        'w-full rounded-lg border px-3 py-2 shadow-sm transition-all duration-150',
        style.border,
        style.bg,
        isDimmed && !isHighlighted && !isSelected && 'opacity-25',
        isSelected && 'ring-2 ring-accent-400',
        isHighlighted && !isSelected && 'ring-1 ring-accent-400/60',
        matchesSearch && !isSelected && 'ring-1 ring-amber-400/70',
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-slate-600" />
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-slate-600" />
      <div className="flex items-center gap-1.5">
        <Icon size={13} className={clsx('shrink-0', style.iconColor)} />
        <span className="truncate text-[12px] font-medium text-slate-100">{graphNode.label}</span>
        {graphNode.isExported && (
          <span className="ml-auto shrink-0 rounded bg-white/5 px-1 text-[9px] text-slate-400">export</span>
        )}
      </div>
      {subtitle && <div className="mt-0.5 truncate text-[10px] text-slate-500">{subtitle}</div>}
    </div>
  );
}

export const AtlasNode = memo(AtlasNodeInner);

export const nodeTypes = { atlasNode: AtlasNode };
