/**
 * Types describing the on-disk project tree as read via the
 * File System Access API. These are intentionally decoupled from AST/parser
 * types so the explorer can render instantly before parsing completes.
 */

export type SourceExtension = 'js' | 'jsx' | 'ts' | 'tsx' | 'mjs' | 'cjs' | 'mts' | 'cts';

export const SOURCE_EXTENSIONS: readonly SourceExtension[] = [
  'js',
  'jsx',
  'ts',
  'tsx',
  'mjs',
  'cjs',
  'mts',
  'cts',
];

export const IGNORED_DIR_NAMES: ReadonlySet<string> = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '.next',
  'out',
  '.turbo',
  '.cache',
  '.vite',
]);

export interface FileTreeFile {
  kind: 'file';
  /** Stable id derived from the path, used as a graph/explorer key. */
  id: string;
  name: string;
  /** Path relative to the project root, using forward slashes. */
  path: string;
  extension: SourceExtension | null;
  /** Whether this file is one CodeAtlas will parse (matches SOURCE_EXTENSIONS). */
  isSource: boolean;
  size: number;
  lastModified: number;
  /** Live handle, kept only in memory (never persisted - handles aren't serializable). */
  handle: FileSystemFileHandle;
}

export interface FileTreeDirectory {
  kind: 'directory';
  id: string;
  name: string;
  path: string;
  children: FileTreeNode[];
  handle: FileSystemDirectoryHandle;
}

export type FileTreeNode = FileTreeFile | FileTreeDirectory;

export interface ProjectStats {
  fileCount: number;
  folderCount: number;
  componentCount: number;
  functionCount: number;
  classCount: number;
  totalLines: number;
}

export interface ProjectSource {
  kind: 'local' | 'github';
  githubUrl?: string;
  owner?: string;
  repo?: string;
  defaultBranch?: string;
}

export interface OpenProject {
  /** Human readable name (root directory name). */
  name: string;
  /** Root directory handle - kept in memory; persisted separately via IndexedDB handle storage. */
  rootHandle: FileSystemDirectoryHandle;
  tree: FileTreeDirectory;
  stats: ProjectStats;
  source?: ProjectSource;
}

/** Record persisted in IndexedDB so a project can be reopened with permission re-grant. */
export interface RecentProjectRecord {
  id: string;
  name: string;
  lastOpened: number;
  /** The FileSystemDirectoryHandle itself - IndexedDB can store handles directly (structured clone). */
  handle: FileSystemDirectoryHandle;
  source?: ProjectSource;
}
