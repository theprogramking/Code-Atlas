import { Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function LoadingOverlay() {
  const phase = useAppStore((s) => s.loadingPhase);
  const message = useAppStore((s) => s.loadingMessage);
  const progress = useAppStore((s) => s.loadingProgress);

  if (phase === 'idle' || phase === 'ready' || phase === 'error') return null;

  const percent =
    progress && progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : null;

  const phaseLabel =
    phase === 'scanning' ? 'Scanning project' : phase === 'parsing' ? 'Parsing source files' : 'Building architecture graph';

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-surface-950/90 px-6 text-center backdrop-blur-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent-500/20 bg-accent-500/10">
        <Sparkles size={18} className="animate-pulse text-accent-300" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-semibold text-slate-100">{phaseLabel}</p>
        <p className="max-w-md text-xs text-slate-500">{message}</p>
      </div>
      {percent !== null && (
        <div className="w-64 overflow-hidden rounded-full border border-white/5 bg-white/5">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-accent-500 to-sky-400 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
