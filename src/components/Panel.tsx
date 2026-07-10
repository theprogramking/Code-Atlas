import type { PropsWithChildren, ReactNode } from 'react';
import clsx from 'clsx';

interface PanelProps {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({
  title,
  icon,
  actions,
  className,
  bodyClassName,
  children,
}: PropsWithChildren<PanelProps>) {
  return (
    <div className={clsx('flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] border border-white/10 bg-surface-900/95 shadow-panel backdrop-blur-md', className)}>
      <div className="flex h-14 items-center justify-between gap-3 border-b border-white/10 bg-surface-950/80 px-4 py-3">
        <div className="flex items-center gap-3 text-sm font-semibold tracking-tight text-slate-100">
          {icon}
          <span>{title}</span>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className={clsx('min-h-0 flex-1 overflow-auto px-4 py-4', bodyClassName)}>{children}</div>
    </div>
  );
}
