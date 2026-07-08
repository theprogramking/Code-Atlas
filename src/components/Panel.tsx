import type { PropsWithChildren, ReactNode } from 'react';
import clsx from 'clsx';

interface PanelProps {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Consistent chrome (header + scroll body) shared by every dock panel. */
export function Panel({
  title,
  icon,
  actions,
  className,
  bodyClassName,
  children,
}: PropsWithChildren<PanelProps>) {
  return (
    <div className={clsx('flex h-full min-h-0 flex-col bg-surface-900', className)}>
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/5 px-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {icon}
          <span>{title}</span>
        </div>
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </div>
      <div className={clsx('min-h-0 flex-1 overflow-auto', bodyClassName)}>{children}</div>
    </div>
  );
}
