import { FolderOpen, Search, Map as MapIcon, History, Sparkles } from 'lucide-react';
import { FaGithub as Github } from 'react-icons/fa';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { isFileSystemAccessSupported } from '../services/fileSystemService';
import { IconButton } from './IconButton';

export function Toolbar() {
  const project = useAppStore((s) => s.project);
  const stats = project?.stats;
  const openProjectPicker = useAppStore((s) => s.openProjectPicker);
  const openGithubImportModal = useAppStore((s) => s.openGithubImportModal);
  const recentProjects = useAppStore((s) => s.recentProjects);
  const reopenRecentProject = useAppStore((s) => s.reopenRecentProject);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const [showRecents, setShowRecents] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const supported = isFileSystemAccessSupported();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isQuickAction = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isQuickAction) return;
      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const statSummary = useMemo(() => {
    if (!stats) return null;
    return [
      { label: 'Files', value: stats.fileCount },
      { label: 'Folders', value: stats.folderCount },
      { label: 'Components', value: stats.componentCount },
      { label: 'Functions', value: stats.functionCount },
    ];
  }, [stats]);

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/5 bg-surface-950/80 px-3 backdrop-blur">
      <div className="flex items-center gap-2 pr-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-500/10 ring-1 ring-accent-500/20">
          <MapIcon size={15} className="text-accent-300" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight text-slate-100">CloudAtlas</span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.24em] text-slate-500">Architecture explorer</span>
        </div>
      </div>

      <div className="relative flex items-center gap-2">
        <button
          onClick={() => void openProjectPicker()}
          disabled={!supported}
          className="inline-flex items-center gap-2 rounded-full border border-accent-500/25 bg-accent-600/90 px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(67,97,238,0.22)] transition hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-40"
          title={supported ? 'Open a local project folder' : 'Unsupported in this browser'}
        >
          <FolderOpen size={14} />
          Open Project
        </button>
        <button
          onClick={() => openGithubImportModal()}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/5"
        >
          <Github size={14} />
          Import from GitHub
        </button>
        {recentProjects.length > 0 && (
          <div className="relative">
            <IconButton
              icon={<History size={14} />}
              label="Recent projects"
              variant="soft"
              onClick={() => setShowRecents((v) => !v)}
            />
            {showRecents && (
              <div className="absolute left-0 top-full z-40 mt-2 w-64 rounded-xl border border-white/10 bg-surface-800/95 p-1 shadow-panel">
                {recentProjects.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setShowRecents(false);
                      void reopenRecentProject(r);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-white/5"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{r.name}</span>
                      {r.source?.kind === 'github' ? (
                        <span className="mt-0.5 truncate text-[10px] text-slate-500">{r.source.owner}/{r.source.repo}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {new Date(r.lastOpened).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative ml-1 flex-1 max-w-md">
        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          ref={searchInputRef}
          aria-label="Search files, functions, and components"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files, functions, components..."
          className="w-full rounded-full border border-white/10 bg-surface-800/80 py-2 pl-9 pr-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-accent-500/50 focus:ring-2 focus:ring-accent-500/20"
        />
      </div>

      {!supported && (
        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
          Chromium browser required for local file access
        </span>
      )}

      {statSummary && (
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          {statSummary.map((item) => (
            <div key={item.label} className="rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-1">
              <span className="text-slate-300">{item.value}</span>
              <span className="ml-1 text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="hidden items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-2 py-1 sm:flex">
        <Sparkles size={13} className="text-accent-300" />
        <span className="text-[11px] text-slate-400">Fast, focused, local-first</span>
      </div>
    </div>
  );
}
