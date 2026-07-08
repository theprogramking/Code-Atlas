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
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-surface-950/90 backdrop-blur-sm">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-500/30 border-t-accent-500" />
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-medium text-slate-200">{phaseLabel}</p>
        <p className="max-w-md truncate text-xs text-slate-500">{message}</p>
      </div>
      {percent !== null && (
        <div className="h-1.5 w-64 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-accent-500 transition-all duration-150"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
