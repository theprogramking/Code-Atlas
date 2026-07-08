import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, SearchX } from 'lucide-react';
import clsx from 'clsx';
import { Panel } from '../../components/Panel';
import { useAppStore } from '../../store/useAppStore';
import type { FileTreeDirectory, FileTreeNode } from '../../types/fileSystem';

const EXT_COLORS: Record<string, string> = {
  ts: 'text-blue-400',
  tsx: 'text-blue-300',
  js: 'text-amber-400',
  jsx: 'text-amber-300',
  mjs: 'text-amber-400',
  cjs: 'text-amber-400',
};

function collectAncestorDirs(root: FileTreeDirectory, targetPath: string): Set<string> {
  const ancestors = new Set<string>();
  function visit(node: FileTreeNode, trail: string[]): boolean {
    if (node.kind === 'file') {
      return node.path === targetPath;
    }
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
  return node.children.some((c) => matchesQuery(c, q));
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

  if (node.kind === 'file') {
    const isSelected = selectedFilePath === node.path;
    const ext = node.extension ?? '';
    return (
      <button
        onClick={() => selectFileByPath(node.path)}
        style={{ paddingLeft: 10 + depth * 14 }}
        className={clsx(
          'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition',
          isSelected ? 'bg-accent-600/15 text-accent-100 shadow-[inset_0_0_0_1px_rgba(91,124,250,0.14)]' : 'text-slate-300 hover:bg-white/5 hover:text-white',
          !node.isSource && 'opacity-50',
        )}
        title={node.path}
      >
        <File size={12} className={clsx('shrink-0', EXT_COLORS[ext] ?? 'text-slate-500')} />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  const isExpanded = expanded.has(node.path) || Boolean(query);
  return (
    <div>
      <button
        onClick={() => toggle(node.path)}
        style={{ paddingLeft: 4 + depth * 14 }}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-100"
      >
        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {isExpanded ? <FolderOpen size={13} className="text-accent-400/80" /> : <Folder size={13} className="text-slate-500" />}
        <span className="truncate">{node.name || '/'}</span>
      </button>
      {isExpanded && (
        <div className="mt-0.5">
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
  const deferredQuery = useDeferredValue(searchQuery);
  const selectedFilePath = useAppStore((s) => s.selectedFilePath);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (project) {
      // Expand the top level by default so the tree isn't a single collapsed root.
      // Intentionally keyed only on tree identity, not full contents.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setExpanded(new Set([project.tree.path, ...project.tree.children.filter((c) => c.kind === 'directory').map((c) => c.path)]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <Folder size={24} className="text-slate-600" />
          <p className="text-sm text-slate-400">Open a project folder to inspect the file tree.</p>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-auto px-2 py-2">
            {searchQuery && !hasVisibleNodes ? (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500">
                <SearchX size={18} className="text-slate-600" />
                <span>No files matched your search.</span>
              </div>
            ) : (
              <TreeRow node={project.tree} depth={0} expanded={expanded} toggle={toggle} query={deferredQuery} />
            )}
          </div>
          {statLine && (
            <div className="shrink-0 border-t border-white/5 bg-surface-950/30 px-3 py-2 text-[10.5px] text-slate-500">
              {statLine}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
