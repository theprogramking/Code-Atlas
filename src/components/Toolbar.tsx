import { FolderOpen, Search, Map as MapIcon, History, Sparkles } from 'lucide-react';
import { FaGithub as Github } from 'react-icons/fa';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { isFileSystemAccessSupported } from '../services/fileSystemService';
import { IconButton } from './IconButton';
import { Button } from './Button';
import { StatPill } from './StatPill';

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
      { label: 'Components', value: stats.componentCount },
      { label: 'Functions', value: stats.functionCount },
      { label: 'Lines', value: stats.totalLines.toLocaleString() },
    ];
  }, [stats]);

  return (
    <div className="flex h-20 shrink-0 items-center gap-4 border-b border-white/10 bg-surface-950/90 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-accent-blue/10 ring-1 ring-accent-blue/20">
          <MapIcon size={18} className="text-accent-blue" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight text-slate-100">CodeAtlas</span>
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Developer platform</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" icon={<FolderOpen size={16} />} onClick={() => void openProjectPicker()}>
          Open Project
        </Button>
        <Button variant="soft" icon={<Github size={16} />} onClick={openGithubImportModal}>
          Import from GitHub
        </Button>
      </div>

      <div className="relative flex-1 max-w-2xl">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          ref={searchInputRef}
          aria-label="Global search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files, components, functions, types..."
          className="w-full rounded-3xl border border-white/10 bg-surface-800/90 py-3 pl-12 pr-4 text-sm text-slate-100 outline-none transition focus:border-accent-blue/50 focus:ring-2 focus:ring-accent-blue/20"
        />
      </div>

      <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-surface-900/80 px-3 py-2 lg:flex">
        {statSummary?.map((item) => (
          <StatPill key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      {recentProjects.length > 0 && (
        <div className="relative">
          <IconButton
            icon={<History size={16} />}
            label="Recent projects"
            variant="soft"
            onClick={() => setShowRecents((v) => !v)}
          />
          {showRecents && (
            <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-3xl border border-white/10 bg-surface-900/95 p-2 shadow-panel backdrop-blur">
              {recentProjects.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setShowRecents(false);
                    void reopenRecentProject(r);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{r.name}</span>
                    {r.source?.kind === 'github' ? (
                      <span className="mt-0.5 truncate text-xs text-slate-500">{r.source.owner}/{r.source.repo}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {new Date(r.lastOpened).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!supported && (
        <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
          Chromium required for local access
        </span>
      )}
    </div>
  );
}
