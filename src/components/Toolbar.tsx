import { FolderOpen, Search, Map as MapIcon, History } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { isFileSystemAccessSupported } from '../services/fileSystemService';

export function Toolbar() {
  const project = useAppStore((s) => s.project);
  const stats = project?.stats;
  const openProjectPicker = useAppStore((s) => s.openProjectPicker);
  const recentProjects = useAppStore((s) => s.recentProjects);
  const reopenRecentProject = useAppStore((s) => s.reopenRecentProject);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const [showRecents, setShowRecents] = useState(false);
  const supported = isFileSystemAccessSupported();

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-white/5 bg-surface-900 px-3">
      <div className="flex items-center gap-2 pr-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-accent-600/20">
          <MapIcon size={14} className="text-accent-400" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-slate-100">CodeAtlas</span>
      </div>

      <div className="relative flex items-center gap-1.5">
        <button
          onClick={() => void openProjectPicker()}
          disabled={!supported}
          className="flex items-center gap-1.5 rounded-md bg-accent-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-40"
          title={supported ? 'Open a local project folder' : 'Unsupported in this browser'}
        >
          <FolderOpen size={13} />
          Open Project
        </button>
        {recentProjects.length > 0 && (
          <button
            onClick={() => setShowRecents((v) => !v)}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200"
            title="Recent projects"
          >
            <History size={13} />
          </button>
        )}
        {showRecents && recentProjects.length > 0 && (
          <div className="absolute left-0 top-full z-40 mt-1 w-64 rounded-lg border border-white/10 bg-surface-800 py-1 shadow-panel">
            {recentProjects.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setShowRecents(false);
                  void reopenRecentProject(r);
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-white/5"
              >
                <span className="truncate">{r.name}</span>
                <span className="shrink-0 text-[10px] text-slate-500">
                  {new Date(r.lastOpened).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative ml-1 flex-1 max-w-sm">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files, functions, components..."
          className="w-full rounded-md border border-white/10 bg-surface-800 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-accent-500/50 focus:outline-none"
        />
      </div>

      {!supported && (
        <span className="text-[11px] text-amber-400">
          Requires a Chromium browser (Chrome/Edge) for the File System Access API.
        </span>
      )}

      {stats && (
        <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-500">
          <span>{stats.fileCount} files</span>
          <span className="text-slate-700">|</span>
          <span>{stats.folderCount} folders</span>
          <span className="text-slate-700">|</span>
          <span>{stats.componentCount} components</span>
          <span className="text-slate-700">|</span>
          <span>{stats.functionCount} functions</span>
        </div>
      )}
    </div>
  );
}
