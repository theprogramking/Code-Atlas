import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: 'ghost' | 'soft' | 'primary';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'ghost', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
        variant === 'primary' && 'bg-accent-600 text-white hover:bg-accent-500',
        variant === 'soft' && 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white',
        variant === 'ghost' && 'text-slate-400 hover:bg-white/5 hover:text-white',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
});
