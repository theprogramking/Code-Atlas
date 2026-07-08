export type PanelId = 'explorer' | 'graph' | 'metadata' | 'editor';

export interface UserPreferences {
  theme: 'dark' | 'light';
  panelSizes: Partial<Record<PanelId, number>>;
  autoLayoutOnOpen: boolean;
  showMinimap: boolean;
  lastGraphFilter: GraphFilterState;
}

export interface GraphFilterState {
  kinds: {
    file: boolean;
    function: boolean;
    class: boolean;
    component: boolean;
  };
  edgeKinds: {
    import: boolean;
    export: boolean;
    call: boolean;
    owns: boolean;
  };
  searchQuery: string;
}

export const DEFAULT_GRAPH_FILTER: GraphFilterState = {
  kinds: { file: true, function: true, class: true, component: true },
  edgeKinds: { import: true, export: true, call: true, owns: true },
  searchQuery: '',
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  panelSizes: {},
  autoLayoutOnOpen: true,
  showMinimap: true,
  lastGraphFilter: DEFAULT_GRAPH_FILTER,
};

export type SelectableEntityKind = GraphFilterState['kinds'] extends infer K
  ? keyof K
  : never;

/** Anything in the app that can be the "selected" entity: a node, or a plain file. */
export interface SelectionRef {
  nodeId: string;
  filePath: string;
}
