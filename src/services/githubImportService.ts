import JSZip from 'jszip';
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

export interface GitHubRepositoryInfo {
  owner: string;
  repo: string;
  branch: string;
  url: string;
}

export interface GitHubImportProgress {
  step: 'connect' | 'download' | 'extract' | 'index' | 'graph';
  message: string;
}

export interface GitHubImportPayload {
  projectName: string;
  rootHandle: FileSystemDirectoryHandle;
  tree: FileTreeDirectory;
  stats: ProjectStats;
  source: {
    kind: 'github';
    owner: string;
    repo: string;
    githubUrl: string;
    defaultBranch: string;
  };
}

class VirtualDirectoryHandle {
  kind: 'directory' = 'directory';
  name: string;
  path: string;
  children = new Map<string, VirtualDirectoryHandle | VirtualFileHandle>();

  constructor(name: string, path: string) {
    this.name = name;
    this.path = path;
  }

  async *values(): AsyncGenerator<VirtualDirectoryHandle | VirtualFileHandle> {
    for (const child of this.children.values()) {
      yield child;
    }
  }
}

class VirtualFileHandle {
  kind: 'file' = 'file';
  name: string;
  path: string;
  private readonly content: string;
  private readonly fileSize: number;
  private readonly modifiedAt: number;

  constructor(name: string, path: string, content: string, modifiedAt: number) {
    this.name = name;
    this.path = path;
    this.content = content;
    this.fileSize = new TextEncoder().encode(content).length;
    this.modifiedAt = modifiedAt;
  }

  async getFile(): Promise<File> {
    return new File([this.content], this.name, {
      type: 'text/plain;charset=utf-8',
      lastModified: this.modifiedAt,
    });
  }
}

function isSourceExtension(ext: string | null): SourceExtension | null {
  if (ext && SOURCE_EXTENSIONS.includes(ext as SourceExtension)) {
    return ext as SourceExtension;
  }
  return null;
}

function normalizeRepoPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function stripArchivePrefix(path: string, repoName: string, branch: string): string {
  const normalized = normalizeRepoPath(path);
  const prefixes = [repoName, `${repoName}-${branch}`];
  for (const prefix of prefixes) {
    if (normalized === prefix) return '';
    if (normalized.startsWith(`${prefix}/`)) return normalized.slice(prefix.length + 1);
  }
  return normalized;
}

function isBinaryPath(path: string): boolean {
  const ext = getExtension(path);
  return Boolean(
    ext &&
      /\.(png|jpe?g|gif|svg|ico|pdf|zip|gz|tgz|rar|7z|mp4|mp3|wav|webm|woff2?|eot|ttf|otf|wasm|exe|dll|bin|jar|pyc)$/i.test(
        path,
      ),
  );
}

function isIgnoredPath(path: string): boolean {
  const normalized = normalizeRepoPath(path);
  if (!normalized) return true;
  if (normalized.startsWith('.git/')) return true;
  if (normalized === '.git') return true;
  const segments = normalized.split('/');
  if (segments.some((segment) => IGNORED_DIR_NAMES.has(segment) || segment.startsWith('.cache'))) return true;
  if (normalized.includes('/node_modules/')) return true;
  if (normalized.startsWith('node_modules/')) return true;
  if (normalized.startsWith('vendor/')) return true;
  return false;
}

function parseGitignoreEntries(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter((entry) => entry && !entry.startsWith('#'));
}

function matchesGitIgnoreRule(path: string, rules: string[]): boolean {
  const normalized = normalizeRepoPath(path);
  if (!normalized) return false;
  return rules.some((rule) => {
    const cleaned = rule.replace(/^\//, '').replace(/\/$/, '');
    if (!cleaned) return false;
    if (cleaned === '.git' || cleaned === 'node_modules' || cleaned === 'dist' || cleaned === 'build') return true;
    if (cleaned.startsWith('*.')) return normalized.endsWith(cleaned.slice(1));
    if (cleaned.includes('*')) return false;
    return normalized === cleaned || normalized.startsWith(`${cleaned}/`) || normalized.includes(`/${cleaned}/`);
  });
}

function buildTreeFromEntries(entries: Array<{ path: string; content: string }>, projectName: string): FileTreeDirectory {
  const root = new VirtualDirectoryHandle(projectName, '');
  const sortedEntries = [...entries].sort((a, b) => a.path.localeCompare(b.path));

  for (const entry of sortedEntries) {
    const normalizedPath = normalizeRepoPath(entry.path);
    const segments = normalizedPath.split('/').filter(Boolean);
    if (segments.length === 0) continue;
    const fileName = segments[segments.length - 1];
    const directories = segments.slice(0, -1);

    let current = root;
    for (const directoryName of directories) {
      const child = current.children.get(directoryName);
      if (child?.kind === 'directory') {
        current = child;
      } else {
        const nextDir = new VirtualDirectoryHandle(directoryName, joinPath(current.path, directoryName));
        current.children.set(directoryName, nextDir);
        current = nextDir;
      }
    }

    current.children.set(
      fileName,
      new VirtualFileHandle(fileName, normalizedPath, entry.content, Date.now()),
    );
  }

  const children = Array.from(root.children.values()).sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const treeChildren: FileTreeNode[] = children.map((child) => {
    const childPath = child.path || '';
    if (child.kind === 'directory') {
      const directoryChildren = Array.from(child.children.values()).sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      const nodes: FileTreeNode[] = directoryChildren.map((grandChild) => {
        if (grandChild.kind === 'directory') {
          const nestedChildren = Array.from(grandChild.children.values()).sort((a, b) => {
            if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          const nested = nestedChildren.map((leaf) => {
            if (leaf.kind === 'directory') {
              return {
                kind: 'directory' as const,
                id: `dir:${joinPath(grandChild.path, leaf.name)}`,
                name: leaf.name,
                path: joinPath(grandChild.path, leaf.name),
                children: [],
                handle: leaf as unknown as FileSystemDirectoryHandle,
              } satisfies FileTreeDirectory;
            }
            return {
              kind: 'file' as const,
              id: `file:${joinPath(grandChild.path, leaf.name)}`,
              name: leaf.name,
              path: joinPath(grandChild.path, leaf.name),
              extension: isSourceExtension(getExtension(leaf.name)),
              isSource: isSourceExtension(getExtension(leaf.name)) !== null,
              size: 0,
              lastModified: Date.now(),
              handle: leaf as unknown as FileSystemFileHandle,
            } satisfies FileTreeFile;
          });
          return {
            kind: 'directory' as const,
            id: `dir:${grandChild.path || '.'}`,
            name: grandChild.name,
            path: grandChild.path || '',
            children: nested,
            handle: grandChild as unknown as FileSystemDirectoryHandle,
          } satisfies FileTreeDirectory;
        }
        return {
          kind: 'file' as const,
          id: `file:${joinPath(childPath, grandChild.name)}`,
          name: grandChild.name,
          path: joinPath(childPath, grandChild.name),
          extension: isSourceExtension(getExtension(grandChild.name)),
          isSource: isSourceExtension(getExtension(grandChild.name)) !== null,
          size: 0,
          lastModified: Date.now(),
          handle: grandChild as unknown as FileSystemFileHandle,
        } satisfies FileTreeFile;
      });
      return {
        kind: 'directory' as const,
        id: `dir:${childPath || '.'}`,
        name: child.name,
        path: childPath,
        children: nodes,
        handle: child as unknown as FileSystemDirectoryHandle,
      } satisfies FileTreeDirectory;
    }
    return {
      kind: 'file' as const,
      id: `file:${childPath}`,
      name: child.name,
      path: childPath,
      extension: isSourceExtension(getExtension(child.name)),
      isSource: isSourceExtension(getExtension(child.name)) !== null,
      size: 0,
      lastModified: Date.now(),
      handle: child as unknown as FileSystemFileHandle,
    } satisfies FileTreeFile;
  });

  return {
    kind: 'directory',
    id: `dir:${projectName}`,
    name: projectName,
    path: '',
    children: treeChildren,
    handle: root as unknown as FileSystemDirectoryHandle,
  };
}

function createStats(tree: FileTreeDirectory): ProjectStats {
  const stats: ProjectStats = {
    fileCount: 0,
    folderCount: 0,
    componentCount: 0,
    functionCount: 0,
    classCount: 0,
    totalLines: 0,
  };

  const visit = (node: FileTreeNode) => {
    if (node.kind === 'directory') {
      stats.folderCount += 1;
      for (const child of node.children) visit(child);
    } else if (node.isSource) {
      stats.fileCount += 1;
    }
  };

  visit(tree);
  return stats;
}

export async function parseGitHubRepositoryUrl(input: string): Promise<GitHubRepositoryInfo | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const pattern = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?(?:$|[?#])/i;
  const match = trimmed.match(pattern);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    branch: 'main',
    url: `https://github.com/${match[1]}/${match[2]}`,
  };
}

export async function resolveGitHubRepository(url: string): Promise<GitHubRepositoryInfo> {
  const parsed = await parseGitHubRepositoryUrl(url);
  if (!parsed) throw new Error('Enter a valid GitHub repository URL.');

  const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;
  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CloudAtlas',
    },
  });

  if (!response.ok) {
    const message = response.status === 404 ? 'That repository could not be found.' : response.status === 403 ? 'GitHub rate limiting blocked this import. Please try again shortly.' : 'That repository could not be imported.';
    throw new Error(message);
  }

  const data = (await response.json()) as { default_branch?: string; full_name?: string };
  return {
    ...parsed,
    branch: data.default_branch ?? 'main',
    url: `https://github.com/${parsed.owner}/${parsed.repo}`,
  };
}

export async function importGitHubRepository(
  input: string,
  onProgress?: (progress: GitHubImportProgress) => void,
): Promise<GitHubImportPayload> {
  const repository = await resolveGitHubRepository(input);
  const archiveUrl = `https://github.com/${repository.owner}/${repository.repo}/archive/refs/heads/${repository.branch}.zip`;

  onProgress?.({ step: 'connect', message: 'Connecting to GitHub' });

  const response = await fetch(archiveUrl, {
    headers: {
      Accept: 'application/octet-stream',
      'User-Agent': 'CloudAtlas',
    },
  });
  if (!response.ok) {
    throw new Error('The repository archive could not be downloaded.');
  }

  onProgress?.({ step: 'download', message: 'Downloading repository' });
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('The repository archive could not be streamed.');
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress?.({ step: 'download', message: `Downloading repository (${Math.round(received / 1024)} KB)` });
  }

  const archiveBuffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    archiveBuffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  onProgress?.({ step: 'extract', message: 'Extracting files' });
  const zip = await JSZip.loadAsync(archiveBuffer.buffer);
  const gitignoreRules = parseGitignoreEntries(
    (await zip.file('.gitignore')?.async('string')) ?? '',
  );

  const entries: Array<{ path: string; content: string }> = [];
  const fileNames = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  for (const fileName of fileNames) {
    const normalizedName = normalizeRepoPath(fileName);
    if (!normalizedName) continue;
    if (isIgnoredPath(normalizedName) || matchesGitIgnoreRule(normalizedName, gitignoreRules)) continue;
    if (isBinaryPath(normalizedName)) continue;
    const file = zip.files[fileName];
    const content = await file.async('string');
    const relativePath = stripArchivePrefix(normalizedName, repository.repo, repository.branch);
    if (!relativePath) continue;
    entries.push({ path: relativePath, content });
  }

  const projectName = repository.repo.replace(/\s+/g, '-');
  const tree = buildTreeFromEntries(entries, projectName);
  const stats = createStats(tree);

  return {
    projectName,
    rootHandle: tree.handle as unknown as FileSystemDirectoryHandle,
    tree,
    stats,
    source: {
      kind: 'github',
      owner: repository.owner,
      repo: repository.repo,
      githubUrl: repository.url,
      defaultBranch: repository.branch,
    },
  };
}
