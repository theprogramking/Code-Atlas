import type { PropsWithChildren } from 'react';
import clsx from 'clsx';

type BadgeTone = 'default' | 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan';

const toneClasses: Record<BadgeTone, string> = {
  default: 'bg-white/5 text-slate-300 ring-1 ring-white/10',
  blue: 'bg-accent-blue/10 text-accent-blue ring-1 ring-accent-blue/20',
  purple: 'bg-accent-purple/10 text-accent-purple ring-1 ring-accent-purple/20',
  green: 'bg-accent-green/10 text-accent-green ring-1 ring-accent-green/20',
  orange: 'bg-accent-orange/10 text-accent-orange ring-1 ring-accent-orange/20',
  red: 'bg-accent-red/10 text-accent-red ring-1 ring-accent-red/20',
  cyan: 'bg-accent-cyan/10 text-accent-cyan ring-1 ring-accent-cyan/20',
};

export function Badge({ tone = 'default', children }: PropsWithChildren<{ tone?: BadgeTone }>) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide', toneClasses[tone])}>
      {children}
    </span>
  );
}
