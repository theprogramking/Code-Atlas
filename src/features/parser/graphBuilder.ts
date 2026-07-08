import type { ArchitectureGraph, GraphEdgeData, GraphNodeData } from '../../types/graph';
import type { ParsedFile } from '../../types/parser';
import { getExtension } from '../../utils/path';
import { resolveRelativeImport } from '../../utils/path';
import { fileNodeId, nextId, nodeId } from '../../utils/ids';

/**
 * Pure function: parsed files in, a serializable graph out. Kept free of any
 * React Flow / rendering concerns so it can be unit tested and cached
 * independently of the visualization layer.
 */
export function buildArchitectureGraph(parsedFiles: ParsedFile[]): ArchitectureGraph {
  const nodes: GraphNodeData[] = [];
  const edges: GraphEdgeData[] = [];

  const byPath = new Map<string, ParsedFile>();
  for (const pf of parsedFiles) byPath.set(pf.path, pf);

  // A lookup from "path -> symbol name -> nodeId" lets us resolve call edges
  // (which only know a bare name) against the right file-scoped symbol.
  const symbolsByFile = new Map<string, Map<string, string>>();

  // Pass 1: create nodes for files and their symbols.
  for (const pf of parsedFiles) {
    const symbolCount = pf.functions.length + pf.classes.length;
    nodes.push({
      id: fileNodeId(pf.path),
      kind: 'file',
      label: pf.path.split('/').pop() ?? pf.path,
      filePath: pf.path,
      isExported: false,
      meta: {
        kind: 'file',
        extension: getExtension(pf.path),
        size: pf.source.length,
        lineCount: pf.lineCount,
        symbolCount,
      },
    });

    const symbolMap = new Map<string, string>();
    symbolsByFile.set(pf.path, symbolMap);

    for (const fn of pf.functions) {
      const id = nodeId(pf.path, fn.isComponent ? 'component' : 'function', fn.name);
      symbolMap.set(fn.name, id);
      const hooksUsed = pf.hooks
        .filter((h) => h.enclosingScope === fn.name)
        .map((h) => h.name);
      nodes.push({
        id,
        kind: fn.isComponent ? 'component' : 'function',
        label: fn.name,
        filePath: pf.path,
        isExported: fn.isExported,
        meta: fn.isComponent
          ? { kind: 'component', componentKind: 'function', hooksUsed: [...new Set(hooksUsed)] }
          : {
              kind: 'function',
              isAsync: fn.isAsync,
              isGenerator: fn.isGenerator,
              isArrow: fn.isArrow,
              params: fn.params,
            },
      });
      edges.push({
        id: nextId('edge'),
        source: fileNodeId(pf.path),
        target: id,
        kind: 'owns',
      });
    }

    for (const cls of pf.classes) {
      const id = nodeId(pf.path, cls.isComponent ? 'component' : 'class', cls.name);
      symbolMap.set(cls.name, id);
      nodes.push({
        id,
        kind: cls.isComponent ? 'component' : 'class',
        label: cls.name,
        filePath: pf.path,
        isExported: cls.isExported,
        meta: cls.isComponent
          ? { kind: 'component', componentKind: 'class', hooksUsed: [] }
          : { kind: 'class', superClass: cls.superClass, methods: cls.methods },
      });
      edges.push({
        id: nextId('edge'),
        source: fileNodeId(pf.path),
        target: id,
        kind: 'owns',
      });
    }
  }

  // Pass 2: import edges between files (resolving relative specifiers only -
  // bare npm-package imports aren't part of the local architecture graph).
  for (const pf of parsedFiles) {
    for (const imp of pf.imports) {
      const resolved = resolveRelativeImport(pf.path, imp.source);
      if (!resolved) continue;
      const targetPath = matchTargetFile(resolved, byPath);
      if (!targetPath) continue;
      edges.push({
        id: nextId('edge'),
        source: fileNodeId(pf.path),
        target: fileNodeId(targetPath),
        kind: 'import',
        label: imp.source,
      });
    }
  }

  // Pass 3: call edges between symbols, resolved within the same file first
  // (the common case), falling back to a project-wide name search so calls to
  // imported functions still produce an edge even without full type-aware
  // module resolution.
  const globalSymbolIndex = new Map<string, string[]>();
  for (const [filePath, symbolMap] of symbolsByFile) {
    for (const [name, id] of symbolMap) {
      const list = globalSymbolIndex.get(name) ?? [];
      list.push(id);
      globalSymbolIndex.set(name, list);
      void filePath;
    }
  }

  for (const pf of parsedFiles) {
    const localSymbols = symbolsByFile.get(pf.path);
    for (const call of pf.calls) {
      const callerId = call.callerName ? localSymbols?.get(call.callerName) : undefined;
      const sourceId = callerId ?? fileNodeId(pf.path);
      const localTarget = localSymbols?.get(call.calleeName);
      if (localTarget) {
        edges.push({ id: nextId('edge'), source: sourceId, target: localTarget, kind: 'call' });
        continue;
      }
      const candidates = globalSymbolIndex.get(call.calleeName);
      if (candidates && candidates.length === 1) {
        edges.push({ id: nextId('edge'), source: sourceId, target: candidates[0], kind: 'call' });
      }
      // Ambiguous (multiple files define a symbol with this name) or unresolved
      // (external library call) - intentionally skipped rather than guessing.
    }
  }

  return { nodes, edges, generatedAt: Date.now() };
}

/** Resolves an extensionless import path to an actual parsed file, trying
 *  common resolution strategies (exact match, index files, each source ext). */
function matchTargetFile(resolvedPath: string, byPath: Map<string, ParsedFile>): string | null {
  const candidates = [
    resolvedPath,
    `${resolvedPath}.ts`,
    `${resolvedPath}.tsx`,
    `${resolvedPath}.js`,
    `${resolvedPath}.jsx`,
    `${resolvedPath}/index.ts`,
    `${resolvedPath}/index.tsx`,
    `${resolvedPath}/index.js`,
    `${resolvedPath}/index.jsx`,
  ];
  for (const candidate of candidates) {
    if (byPath.has(candidate)) return candidate;
  }
  return null;
}
