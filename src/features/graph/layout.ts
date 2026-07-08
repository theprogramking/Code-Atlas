import dagre from 'dagre';
import type { ArchitectureGraph } from '../../types/graph';

export interface LayoutedPosition {
  x: number;
  y: number;
}

const NODE_WIDTH: Record<string, number> = {
  file: 200,
  component: 180,
  class: 170,
  function: 160,
};
const NODE_HEIGHT = 56;

/**
 * Computes a left-to-right layered layout with dagre. Cheap enough to re-run
 * whenever the graph changes; results are then cached (see graphStore) so
 * dragging a node doesn't get overwritten by a fresh layout on every render.
 */
export function computeAutoLayout(graph: ArchitectureGraph): Record<string, LayoutedPosition> {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 48, ranksep: 120, marginx: 40, marginy: 40 });

  for (const node of graph.nodes) {
    g.setNode(node.id, {
      width: NODE_WIDTH[node.kind] ?? 160,
      height: NODE_HEIGHT,
    });
  }
  for (const edge of graph.edges) {
    // Only lay out along "owns" and "import" edges - call edges can be dense
    // and would otherwise distort layout with little structural benefit.
    if (edge.kind === 'owns' || edge.kind === 'import') {
      if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
        g.setEdge(edge.source, edge.target);
      }
    }
  }

  dagre.layout(g);

  const positions: Record<string, LayoutedPosition> = {};
  for (const node of graph.nodes) {
    const layouted = g.node(node.id);
    if (layouted) {
      positions[node.id] = { x: layouted.x - layouted.width / 2, y: layouted.y - layouted.height / 2 };
    }
  }
  return positions;
}
