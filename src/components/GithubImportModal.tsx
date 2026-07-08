import { useEffect, useMemo, useRef, useState } from 'react';
import { GitHub, Loader2, Sparkles, CheckCircle2, AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';
import { IconButton } from './IconButton';
import { parseGitHubRepositoryUrl } from '../services/githubImportService';

interface GithubImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (url: string) => void;
  isImporting: boolean;
  progressMessage?: string;
  progressSteps?: Array<{ label: string; done: boolean }>;
  errorMessage?: string | null;
}

const examples = [
  'https://github.com/vercel/next.js',
  'https://github.com/facebook/react',
  'https://github.com/openai/openai-agents-js',
];

export function GithubImportModal({
  open,
  onClose,
  onImport,
  isImporting,
  progressMessage,
  progressSteps,
  errorMessage,
}: GithubImportModalProps) {
  const [url, setUrl] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setUrl('');
      setValidationMessage(null);
      return;
    }
  }, [open]);

  const validation = useMemo(() => {
    if (!url.trim()) return { valid: false, message: null };
    const parsed = parseGitHubRepositoryUrl(url);
    if (!parsed) {
      return { valid: false, message: 'Use a GitHub repository URL such as https://github.com/owner/repo.' };
    }
    return { valid: true, message: null };
  }, [url]);

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!validation.valid) {
      setValidationMessage(validation.message ?? 'Enter a valid repository URL.');
      return;
    }
    onImport(url.trim());
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-surface-950/80 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import a GitHub repository"
        className="w-full max-w-xl rounded-3xl border border-white/10 bg-surface-900/95 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-300">
                <GitHub size={18} />
              </div>
              Import from GitHub
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Pull in any public repository and inspect it in CloudAtlas as if it were opened locally.
            </p>
          </div>
          <IconButton icon={<X size={15} />} label="Close dialog" variant="soft" onClick={onClose} />
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Repository URL</span>
            <input
              ref={inputRef}
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setValidationMessage(null);
              }}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData('text');
                if (pasted) setUrl(pasted);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const dropped = event.dataTransfer.getData('text');
                if (dropped) setUrl(dropped);
              }}
              onDragOver={(event) => event.preventDefault()}
              placeholder="Paste a GitHub repository URL..."
              className="w-full rounded-2xl border border-white/10 bg-surface-800/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-accent-500/60 focus:ring-2 focus:ring-accent-500/20"
            />
            {validation.message ? (
              <p className="mt-2 text-sm text-amber-300">{validation.message}</p>
            ) : null}
            {validationMessage ? <p className="mt-2 text-sm text-amber-300">{validationMessage}</p> : null}
          </label>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Examples</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setUrl(example)}
                  className="rounded-full border border-white/10 bg-surface-800/70 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/5"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {isImporting && progressSteps && (
            <div className="rounded-2xl border border-accent-500/20 bg-accent-500/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-accent-200">
                <Loader2 size={14} className="animate-spin" />
                {progressMessage}
              </div>
              <div className="mt-3 space-y-2">
                {progressSteps.map((step) => (
                  <div key={step.label} className="flex items-center gap-2 text-sm text-slate-300">
                    {step.done ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Sparkles size={14} className="text-slate-500" />}
                    <span className={clsx(step.done ? 'text-slate-200' : 'text-slate-400')}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorMessage ? (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!validation.valid || isImporting}
              className="inline-flex items-center gap-2 rounded-full bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />}
              Import Repository
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
