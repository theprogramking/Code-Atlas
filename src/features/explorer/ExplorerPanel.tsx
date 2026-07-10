import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FileCode2,
  FileJson,
  Folder,
  FolderOpen,
  SearchX,
  Database,
  Sparkles,
} from 'lucide-react';
import { FaGithub as Github } from 'react-icons/fa';
import clsx from 'clsx';
import { Panel } from '../../components/Panel';
import { useAppStore } from '../../store/useAppStore';
import type { FileTreeDirectory, FileTreeNode } from '../../types/fileSystem';

const FILE_ICON_MAP: Record<string, typeof FileText> = {
  ts: FileCode2,
  tsx: FileCode2,
  js: FileCode2,
  jsx: FileCode2,
  json: FileJson,
  md: FileText,
  markdown: FileText,
  html: FileText,
  css: FileText,
  scss: FileText,
  yaml: FileText,
  yml: FileText,
};

const FILE_COLOR_MAP: Record<string, string> = {
  ts: 'text-accent-blue',
  tsx: 'text-accent-blue',
  js: 'text-amber-400',
  jsx: 'text-amber-400',
  json: 'text-cyan-300',
  md: 'text-slate-400',
  markdown: 'text-slate-400',
  html: 'text-amber-300',
  css: 'text-violet-300',
  yaml: 'text-cyan-300',
  yml: 'text-cyan-300',
};

function fileIconForNode(node: FileTreeNode) {
  if (node.kind === 'directory') return Folder;
  const ext = node.extension?.toLowerCase() ?? '';
  return FILE_ICON_MAP[ext] ?? FileText;
}

function fileIconColor(node: FileTreeNode) {
  if (node.kind === 'directory') return 'text-slate-400';
  return FILE_COLOR_MAP[node.extension?.toLowerCase() ?? ''] ?? 'text-slate-500';
}

function collectAncestorDirs(root: FileTreeDirectory, targetPath: string): Set<string> {
  const ancestors = new Set<string>();
  function visit(node: FileTreeNode, trail: string[]): boolean {
    if (node.kind === 'file') return node.path === targetPath;
    for (const child of node.children) {
      if (visit(child, [...trail, node.path])) {
        for (const t of trail) ancestors.add(t);
        ancestors.add(node.path);
        return true;
      }
    }
    return false;
  }
  visit(root, []);
  return ancestors;
}

function matchesQuery(node: FileTreeNode, query: string): boolean {
  const q = query.toLowerCase();
  if (node.kind === 'file') return node.name.toLowerCase().includes(q);
  return node.name.toLowerCase().includes(q) || node.children.some((c) => matchesQuery(c, q));
}

interface TreeRowProps {
  node: FileTreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (path: string) => void;
  query: string;
}

const TreeRow = memo(function TreeRow({ node, depth, expanded, toggle, query }: TreeRowProps) {
  const selectedFilePath = useAppStore((s) => s.selectedFilePath);
  const selectFileByPath = useAppStore((s) => s.selectFileByPath);

  if (query && !matchesQuery(node, query)) return null;

  const Icon = fileIconForNode(node);
  const iconColor = fileIconColor(node);

  if (node.kind === 'file') {
    const isSelected = selectedFilePath === node.path;
    return (
      <button
        onClick={() => selectFileByPath(node.path)}
        style={{ paddingLeft: 12 + depth * 16 }}
        className={clsx(
          'relative flex w-full items-center gap-2 rounded-3xl border px-3 py-2 text-left text-sm transition duration-150',
          isSelected
            ? 'border-accent-blue/30 bg-accent-blue/10 text-slate-100 shadow-soft'
            : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white',
          !node.isSource && 'opacity-70',
        )}
        title={node.path}
      >
        {isSelected && <span className="absolute left-0 top-1/2 h-3 w-1 -translate-y-1/2 rounded-r-full bg-accent-blue" />}
        <Icon size={16} className={clsx('shrink-0', iconColor)} />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  const isExpanded = expanded.has(node.path) || Boolean(query);
  return (
    <div>
      <button
        onClick={() => toggle(node.path)}
        style={{ paddingLeft: 8 + depth * 16 }}
        className="flex w-full items-center gap-2 rounded-3xl px-3 py-2 text-left text-sm font-semibold text-slate-300 transition duration-150 hover:bg-white/5 hover:text-slate-100"
      >
        {isExpanded ? <ChevronDown size={14} className="text-slate-300" /> : <ChevronRight size={14} className="text-slate-500" />}
        {isExpanded ? <FolderOpen size={16} className="text-accent-blue" /> : <Folder size={16} className="text-slate-500" />}
        <span className="truncate">{node.name || '/'}</span>
      </button>
      {isExpanded && (
        <div className="mt-1 flex flex-col gap-1">
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              query={query}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export function ExplorerPanel() {
  const project = useAppStore((s) => s.project);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const openGithubImportModal = useAppStore((s) => s.openGithubImportModal);
  const deferredQuery = useDeferredValue(searchQuery);
  const selectedFilePath = useAppStore((s) => s.selectedFilePath);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (project) {
      setExpanded(new Set([project.tree.path, ...project.tree.children.filter((c) => c.kind === 'directory').map((c) => c.path)]));
    }
  }, [project?.tree.id]);

  useEffect(() => {
    if (project && selectedFilePath) {
      const ancestors = collectAncestorDirs(project.tree, selectedFilePath);
      setExpanded((prev) => new Set([...prev, ...ancestors]));
    }
  }, [selectedFilePath, project]);

  const toggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const stats = project?.stats;
  const statLine = useMemo(() => {
    if (!stats) return null;
    return `${stats.fileCount} files · ${stats.folderCount} folders · ${stats.totalLines.toLocaleString()} lines`;
  }, [stats]);

  const hasVisibleNodes = Boolean(project && (deferredQuery ? project.tree.children.some((child) => matchesQuery(child, deferredQuery)) : true));

  return (
    <Panel title="Explorer">
      {!project ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
          <Folder size={28} className="text-slate-500" />
          <div>
            <p className="text-sm text-slate-400">Open a project folder or import a public repository to inspect the file tree.</p>
          </div>
          <button
            onClick={() => openGithubImportModal()}
            className="inline-flex items-center gap-2 rounded-3xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            <Github size={16} />
            Import from GitHub
          </button>
        </div>
      ) : (
        <div className="flex h-full flex-col gap-3">
          <div className="h-full overflow-auto pr-1">
            {searchQuery && !hasVisibleNodes ? (
              <div className="mt-4 flex flex-col items-center gap-3 rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-7 text-center text-sm text-slate-500">
                <SearchX size={22} className="text-slate-500" />
                <span>No files matched your search.</span>
              </div>
            ) : (
              <TreeRow node={project.tree} depth={0} expanded={expanded} toggle={toggle} query={deferredQuery} />
            )}
          </div>
          {statLine && (
            <div className="shrink-0 rounded-3xl border border-white/10 bg-surface-900/80 px-3 py-2 text-[11px] text-slate-400">
              {statLine}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
