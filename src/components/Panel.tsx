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
    <div className={clsx('flex h-full min-h-0 flex-col overflow-hidden rounded-none border border-white/5 bg-surface-900/80 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur', className)}>
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/5 bg-surface-950/40 px-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {icon}
          <span>{title}</span>
        </div>
        {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
      </div>
      <div className={clsx('min-h-0 flex-1 overflow-auto', bodyClassName)}>{children}</div>
    </div>
  );
}
