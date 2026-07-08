let counter = 0;

/** Monotonic-ish unique id, fast and dependency-free (no need for uuid here). */
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/** Deterministic id for a graph node so re-parsing the same file yields stable ids
 *  (important for layout caching - a node's position should survive re-parses). */
export function nodeId(filePath: string, kind: string, name: string): string {
  return `${kind}:${filePath}:${name}`;
}

export function fileNodeId(filePath: string): string {
  return `file:${filePath}`;
}
