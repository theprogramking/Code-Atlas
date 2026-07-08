import type { PropsWithChildren } from 'react';
import clsx from 'clsx';

type BadgeTone = 'default' | 'blue' | 'purple' | 'green' | 'amber' | 'rose';

const toneClasses: Record<BadgeTone, string> = {
  default: 'bg-white/5 text-slate-300 ring-1 ring-white/10',
  blue: 'bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20',
  purple: 'bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20',
  green: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20',
};

export function Badge({ tone = 'default', children }: PropsWithChildren<{ tone?: BadgeTone }>) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none tracking-wide',
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
