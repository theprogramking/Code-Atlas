import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  trailing?: ReactNode;
}

export function SectionHeader({ title, description, trailing }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      </div>
      {trailing}
    </div>
  );
}
