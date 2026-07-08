/**
 * The architecture graph is the central data structure the whole app revolves
 * around: files, functions, classes and components as nodes; imports, calls
 * and ownership as edges. This is deliberately a plain, serializable graph
 * (no React Flow types leak in here) so it can be cached in IndexedDB and
 * rendered by any visualization layer.
 */

export type GraphNodeKind = 'file' | 'function' | 'class' | 'component';

export type GraphEdgeKind = 'import' | 'export' | 'call' | 'owns';

export interface GraphNodeData {
  id: string;
  kind: GraphNodeKind;
  label: string;
  /** Path of the file this node belongs to (for files, its own path). */
  filePath: string;
  /** True if this symbol is exported from its file. */
  isExported: boolean;
  /** Cached layout position, persisted so re-opening a project keeps the same layout. */
  position?: { x: number; y: number };
  /** Extra metadata shown in the Metadata Panel, kind-specific. */
  meta: GraphNodeMeta;
}

export type GraphNodeMeta =
  | { kind: 'file'; extension: string | null; size: number; lineCount: number; symbolCount: number }
  | { kind: 'function'; isAsync: boolean; isGenerator: boolean; isArrow: boolean; params: string[] }
  | { kind: 'class'; superClass?: string; methods: string[] }
  | { kind: 'component'; componentKind: 'function' | 'class'; hooksUsed: string[] };

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
  /** Human readable label, e.g. the import specifier. */
  label?: string;
}

export interface ArchitectureGraph {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  generatedAt: number;
}

/** Layout cached separately from graph content so re-layout doesn't invalidate parse cache. */
export interface GraphLayoutCache {
  projectId: string;
  positions: Record<string, { x: number; y: number }>;
  updatedAt: number;
}
