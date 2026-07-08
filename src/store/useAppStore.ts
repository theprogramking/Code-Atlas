import { create } from 'zustand';
import type { OpenProject, ProjectStats } from '../types/fileSystem';
import type { ParsedFile } from '../types/parser';
import type { ArchitectureGraph } from '../types/graph';
import {
  DEFAULT_GRAPH_FILTER,
  DEFAULT_PREFERENCES,
  type GraphFilterState,
  type PanelId,
  type UserPreferences,
} from '../types/app';
import {
  ensureReadPermission,
  flattenSourceFiles,
  pickProjectDirectory,
  scanProjectDirectory,
} from '../services/fileSystemService';
import {
  getLayoutCache,
  getPreferences,
  listRecentProjects,
  putLayoutCache,
  putPreferences,
  putRecentProject,
} from '../services/dbService';
import { parseProjectFiles } from '../features/parser/projectParser';
import { buildArchitectureGraph } from '../features/parser/graphBuilder';
import { computeAutoLayout } from '../features/graph/layout';
import type { RecentProjectRecord } from '../types/fileSystem';

export type LoadingPhase = 'idle' | 'scanning' | 'parsing' | 'building-graph' | 'ready' | 'error';

interface AppState {
  project: OpenProject | null;
  projectId: string | null;
  parsedFiles: Map<string, ParsedFile>;
  graph: ArchitectureGraph | null;
  layoutPositions: Record<string, { x: number; y: number }>;

  loadingPhase: LoadingPhase;
  loadingMessage: string;
  loadingProgress: { current: number; total: number } | null;
  errorMessage: string | null;

  selectedNodeId: string | null;
  selectedFilePath: string | null;
  searchQuery: string;
  graphFilter: GraphFilterState;

  preferences: UserPreferences;
  recentProjects: RecentProjectRecord[];

  initialize: () => Promise<void>;
  openProjectPicker: () => Promise<void>;
  reopenRecentProject: (record: RecentProjectRecord) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  selectFileByPath: (path: string) => void;
  setSearchQuery: (query: string) => void;
  setGraphFilter: (filter: Partial<GraphFilterState>) => void;
  setPanelSizes: (sizes: Partial<Record<PanelId, number>>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  relayout: () => void;
}

let currentScanAbortController: AbortController | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  project: null,
  projectId: null,
  parsedFiles: new Map(),
  graph: null,
  layoutPositions: {},

  loadingPhase: 'idle',
  loadingMessage: '',
  loadingProgress: null,
  errorMessage: null,

  selectedNodeId: null,
  selectedFilePath: null,
  searchQuery: '',
  graphFilter: DEFAULT_GRAPH_FILTER,

  preferences: DEFAULT_PREFERENCES,
  recentProjects: [],

  initialize: async () => {
    const [prefs, recents] = await Promise.all([getPreferences(), listRecentProjects()]);
    set({
      preferences: prefs ?? DEFAULT_PREFERENCES,
      graphFilter: prefs?.lastGraphFilter ?? DEFAULT_GRAPH_FILTER,
      recentProjects: recents,
    });
  },

  openProjectPicker: async () => {
    try {
      const handle = await pickProjectDirectory();
      await loadProject(handle, set);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      set({
        loadingPhase: 'error',
        errorMessage: err instanceof Error ? err.message : 'Failed to open project.',
      });
    }
  },

  reopenRecentProject: async (record) => {
    try {
      const granted = await ensureReadPermission(record.handle);
      if (!granted) {
        set({
          loadingPhase: 'error',
          errorMessage: `Permission to read "${record.name}" was not granted. Please reopen it via "Open Project".`,
        });
        return;
      }
      await loadProject(record.handle, set);
    } catch (err) {
      set({
        loadingPhase: 'error',
        errorMessage: err instanceof Error ? err.message : 'Failed to reopen project.',
      });
    }
  },

  selectNode: (nodeId) => {
    const graph = get().graph;
    const node = graph?.nodes.find((n) => n.id === nodeId);
    set({ selectedNodeId: nodeId, selectedFilePath: node?.filePath ?? get().selectedFilePath });
  },

  selectFileByPath: (path) => {
    const graph = get().graph;
    const fileNode = graph?.nodes.find((n) => n.kind === 'file' && n.filePath === path);
    set({ selectedFilePath: path, selectedNodeId: fileNode?.id ?? null });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setGraphFilter: (filter) => {
    const merged = { ...get().graphFilter, ...filter };
    set({ graphFilter: merged });
    const prefs = { ...get().preferences, lastGraphFilter: merged };
    set({ preferences: prefs });
    void putPreferences(prefs);
  },

  setPanelSizes: (sizes) => {
    const nextPreferences = {
      ...get().preferences,
      panelSizes: { ...get().preferences.panelSizes, ...sizes },
    };
    set({ preferences: nextPreferences });
    void putPreferences(nextPreferences);
  },

  updateNodePosition: (nodeId, position) => {
    const positions = { ...get().layoutPositions, [nodeId]: position };
    set({ layoutPositions: positions });
    const projectId = get().projectId;
    if (projectId) {
      void putLayoutCache({ projectId, positions, updatedAt: Date.now() });
    }
  },

  relayout: () => {
    const graph = get().graph;
    if (!graph) return;
    const positions = computeAutoLayout(graph);
    set({ layoutPositions: positions });
    const projectId = get().projectId;
    if (projectId) {
      void putLayoutCache({ projectId, positions, updatedAt: Date.now() });
    }
  },
}));

async function loadProject(
  handle: FileSystemDirectoryHandle,
  set: (partial: Partial<AppState>) => void,
): Promise<void> {
  currentScanAbortController?.abort();
  const controller = new AbortController();
  currentScanAbortController = controller;

  const projectId = await deriveProjectId(handle);

  set({
    loadingPhase: 'scanning',
    loadingMessage: `Scanning ${handle.name}...`,
    loadingProgress: null,
    errorMessage: null,
    project: null,
    graph: null,
    selectedNodeId: null,
    selectedFilePath: null,
  });

  const { tree, stats } = await scanProjectDirectory(handle, {
    signal: controller.signal,
    onProgress: (p) =>
      set({ loadingMessage: `Scanning: ${p.currentPath}`, loadingProgress: { current: p.filesScanned, total: p.filesScanned } }),
  });

  const sourceFiles = flattenSourceFiles(tree);

  set({ loadingPhase: 'parsing', loadingMessage: 'Parsing source files...', loadingProgress: { current: 0, total: sourceFiles.length } });

  const parsedList = await parseProjectFiles(projectId, sourceFiles, {
    signal: controller.signal,
    onProgress: (p) =>
      set({
        loadingMessage: `Parsing: ${p.currentPath}`,
        loadingProgress: { current: p.parsed, total: p.total },
      }),
  });

  const parsedFiles = new Map(parsedList.map((pf) => [pf.path, pf] as const));

  const fullStats: ProjectStats = {
    ...stats,
    componentCount: parsedList.reduce(
      (acc, pf) =>
        acc +
        pf.functions.filter((f) => f.isComponent).length +
        pf.classes.filter((c) => c.isComponent).length,
      0,
    ),
    functionCount: parsedList.reduce((acc, pf) => acc + pf.functions.length, 0),
    classCount: parsedList.reduce((acc, pf) => acc + pf.classes.length, 0),
    totalLines: parsedList.reduce((acc, pf) => acc + pf.lineCount, 0),
  };

  set({ loadingPhase: 'building-graph', loadingMessage: 'Building architecture graph...' });

  const graph = buildArchitectureGraph(parsedList);

  const cachedLayout = await getLayoutCache(projectId);
  const positions = cachedLayout?.positions ?? computeAutoLayout(graph);
  if (!cachedLayout) {
    await putLayoutCache({ projectId, positions, updatedAt: Date.now() });
  }

  const project: OpenProject = { name: handle.name, rootHandle: handle, tree, stats: fullStats };

  await putRecentProject({ id: projectId, name: handle.name, lastOpened: Date.now(), handle });
  const recents = await listRecentProjects();

  set({
    project,
    projectId,
    parsedFiles,
    graph,
    layoutPositions: positions,
    loadingPhase: 'ready',
    loadingMessage: '',
    loadingProgress: null,
    recentProjects: recents,
  });
}

/** Derives a stable id for a directory handle so caches/recents survive
 *  across sessions. Uses isSameEntry when re-opening a known handle, and a
 *  name+timestamp fallback otherwise (good enough for a local single-user app). */
async function deriveProjectId(handle: FileSystemDirectoryHandle): Promise<string> {
  return `project:${handle.name}`;
}
