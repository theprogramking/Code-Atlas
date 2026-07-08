import {
  IGNORED_DIR_NAMES,
  SOURCE_EXTENSIONS,
  type FileTreeDirectory,
  type FileTreeFile,
  type FileTreeNode,
  type ProjectStats,
  type SourceExtension,
} from '../types/fileSystem';
import { getExtension, joinPath } from '../utils/path';

export class FileSystemAccessUnsupportedError extends Error {
  constructor() {
    super(
      'This browser does not support the File System Access API. Please use a recent Chromium-based browser (Chrome, Edge, Arc, Brave) to open a project folder.',
    );
    this.name = 'FileSystemAccessUnsupportedError';
  }
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/** Opens the native directory picker and returns the chosen handle. */
export async function pickProjectDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isFileSystemAccessSupported()) {
    throw new FileSystemAccessUnsupportedError();
  }
  // showDirectoryPicker is not yet in lib.dom.d.ts across all TS versions -
  // cast through unknown to keep this call site typed without a global augmentation.
  const picker = (window as unknown as {
    showDirectoryPicker: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  }).showDirectoryPicker;
  return picker({ mode: 'read' });
}

type PermissionState = 'granted' | 'denied' | 'prompt';

interface PermissionCapableHandle {
  queryPermission?: (opts: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (opts: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
}

/** Re-requests read permission for a handle restored from IndexedDB. Browsers
 *  drop live permission across sessions even though the handle itself persists. */
export async function ensureReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const capable = handle as unknown as PermissionCapableHandle;
  if (!capable.queryPermission || !capable.requestPermission) return true;
  const current = await capable.queryPermission({ mode: 'read' });
  if (current === 'granted') return true;
  const requested = await capable.requestPermission({ mode: 'read' });
  return requested === 'granted';
}

function toSourceExtension(ext: string | null): SourceExtension | null {
  if (ext && (SOURCE_EXTENSIONS as readonly string[]).includes(ext)) {
    return ext as SourceExtension;
  }
  return null;
}

export interface ScanProgress {
  filesScanned: number;
  currentPath: string;
}

export interface ScanOptions {
  onProgress?: (progress: ScanProgress) => void;
  /** Abort an in-flight scan (e.g. user opens a different project mid-scan). */
  signal?: AbortSignal;
}

/**
 * Recursively walks a directory handle, skipping ignored directories, and
 * builds an in-memory tree plus aggregate stats. This only reads file
 * metadata (name/size/lastModified) - actual source text is read lazily by
 * the parser, one file at a time, to keep initial scans fast.
 */
export async function scanProjectDirectory(
  rootHandle: FileSystemDirectoryHandle,
  options: ScanOptions = {},
): Promise<{ tree: FileTreeDirectory; stats: ProjectStats }> {
  const stats: ProjectStats = {
    fileCount: 0,
    folderCount: 0,
    componentCount: 0,
    functionCount: 0,
    classCount: 0,
    totalLines: 0,
  };
  let filesScanned = 0;

  async function walk(
    handle: FileSystemDirectoryHandle,
    path: string,
  ): Promise<FileTreeDirectory> {
    if (options.signal?.aborted) {
      throw new DOMException('Scan aborted', 'AbortError');
    }
    const children: FileTreeNode[] = [];
    // @ts-expect-error - values() is part of the async iterable FileSystemDirectoryHandle spec
    for await (const entry of handle.values() as AsyncIterable<
      FileSystemFileHandle | FileSystemDirectoryHandle
    >) {
      if (options.signal?.aborted) {
        throw new DOMException('Scan aborted', 'AbortError');
      }
      const entryPath = joinPath(path, entry.name);
      if (entry.kind === 'directory') {
        if (IGNORED_DIR_NAMES.has(entry.name) || entry.name.startsWith('.')) {
          continue;
        }
        stats.folderCount += 1;
        const dirNode = await walk(entry as FileSystemDirectoryHandle, entryPath);
        children.push(dirNode);
      } else {
        const extension = toSourceExtension(getExtension(entry.name));
        const isSource = extension !== null;
        let size = 0;
        let lastModified = Date.now();
        if (isSource) {
          try {
            const file = await (entry as FileSystemFileHandle).getFile();
            size = file.size;
            lastModified = file.lastModified;
          } catch {
            // File may have been deleted/moved between listing and stat - skip metadata.
          }
        }
        const fileNode: FileTreeFile = {
          kind: 'file',
          id: `file:${entryPath}`,
          name: entry.name,
          path: entryPath,
          extension,
          isSource,
          size,
          lastModified,
          handle: entry as FileSystemFileHandle,
        };
        children.push(fileNode);
        if (isSource) {
          stats.fileCount += 1;
          filesScanned += 1;
          options.onProgress?.({ filesScanned, currentPath: entryPath });
        }
      }
    }
    // Directories first, then files, both alphabetically - keeps the explorer stable and scannable.
    children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return {
      kind: 'directory',
      id: `dir:${path || '.'}`,
      name: handle.name,
      path,
      children,
      handle,
    };
  }

  const tree = await walk(rootHandle, '');
  return { tree, stats };
}

/** Reads the text content of a single file, given its live handle. */
export async function readFileText(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

/** Flattens the tree into a list of source files, for bulk parsing. */
export function flattenSourceFiles(tree: FileTreeDirectory): FileTreeFile[] {
  const result: FileTreeFile[] = [];
  function visit(node: FileTreeNode) {
    if (node.kind === 'file') {
      if (node.isSource) result.push(node);
    } else {
      for (const child of node.children) visit(child);
    }
  }
  visit(tree);
  return result;
}

/** Finds a file node by path within the tree (used when a graph node is clicked). */
export function findFileByPath(tree: FileTreeDirectory, path: string): FileTreeFile | null {
  let found: FileTreeFile | null = null;
  function visit(node: FileTreeNode) {
    if (found) return;
    if (node.kind === 'file') {
      if (node.path === path) found = node;
    } else {
      for (const child of node.children) visit(child);
    }
  }
  visit(tree);
  return found;
}
