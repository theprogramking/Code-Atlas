# CodeAtlas

A browser-based tool that loads a local JavaScript/TypeScript codebase, parses its
structure, and visualizes the architecture as an interactive graph.

**100% local. No backend, no server, no API calls, no cloud services, no AI (yet).**
Everything — file access, parsing, graph layout, caching — runs in your browser.

## Getting started

```bash
npm install
npm run dev
```

Open the printed `localhost` URL in **Chrome, Edge, Arc, or Brave** (the File System
Access API is Chromium-only — Firefox and Safari can't open local folders here).

Click **Open Project**, pick a folder, and CodeAtlas will scan it, parse every
`.js/.jsx/.ts/.tsx` file, and render the architecture graph.

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

## What it does

- **Open Local Project** — native folder picker via the File System Access API.
  Recursively scans for JS/TS/JSX/TSX, skipping `node_modules`, `dist`, `build`,
  `.git`, `coverage`, `.next`, `out`. Directory handles are persisted in IndexedDB
  so recent projects can be reopened (subject to the browser re-confirming read
  permission — this is a browser security requirement, not something an app can
  bypass).
- **Project Explorer** — searchable, collapsible file tree with live project stats.
- **AST Parser** — extracts files, functions, classes, React components (function
  and class), imports, exports, variables, hook usage, and function calls.
- **Architecture Graph** — a directed graph of files/functions/classes/components
  connected by import, call, and ownership edges, auto-laid-out with Dagre and
  cached per-project so your layout (including manual drags) survives reloads.
- **React Flow visualization** — zoom, pan, minimap, node/edge filtering, click to
  select + highlight connected nodes + jump to source.
- **Monaco code viewer** — read-only, lazy-loaded, syntax highlighted, with
  jump-to-symbol and the selected function/class/component's line range highlighted.
- **Metadata panel** — kind-specific details, incoming/outgoing edges, imports/exports
  for the selected node.
- **IndexedDB cache** — parsed ASTs (content-hashed, so unchanged files skip
  re-parsing), the built graph, layout positions, preferences, and recent projects.

## Architecture

```
src/
  components/       shared chrome: Panel, Badge, Toolbar, LoadingOverlay
  features/
    explorer/        file tree UI
    graph/           React Flow panel, custom node renderer, dagre layout
    parser/          astParser.ts (Babel), graphBuilder.ts, projectParser.ts (orchestration + cache)
    editor/          Monaco panel
    metadata/        selected-node detail panel
  hooks/             (reserved for future shared hooks)
  lib/               monacoSetup.ts (self-hosted Monaco, no CDN)
  services/          fileSystemService.ts, dbService.ts — the only modules that
                     touch the File System Access API / IndexedDB directly
  store/             useAppStore.ts — single zustand store tying everything together
  types/             fileSystem.ts, parser.ts, graph.ts, app.ts — plain data contracts
  utils/             ids, hashing, path helpers
  ai-extensions/      future AI extension-point interfaces (unimplemented by design)
```

The parser (`features/parser/astParser.ts`) is intentionally isolated behind a
`parseSourceFile(path, source) -> ParsedFile` function — swapping it for
Tree-sitter WASM or a language-server-backed parser later means touching one
file, not the graph builder or any UI.

### Why Babel Parser instead of Tree-sitter

The spec allows "Tree-sitter (WASM) **or another JavaScript AST parser (Babel
Parser, Acorn, or SWC)**." This build uses `@babel/parser` + `@babel/traverse`.
It has first-class JSX/TSX support, doesn't require fetching/instantiating a
WASM grammar file, and its AST shape is exactly what the component/hook/call
heuristics below are written against. The parser module's boundary means
Tree-sitter can be swapped in later without changing anything downstream.

### Component detection heuristic

A function is treated as a component if its name is PascalCase **and** either
(a) it visibly returns JSX (including through simple ternaries/`&&`), or
(b) it calls a hook (`use[A-Z]...`) — hooks can only legally be called from
components or other hooks, so this is a safe signal, not a guess. Class
components are detected by `extends Component` / `extends React.Component` /
`extends PureComponent`.

### Call-graph resolution

Call edges resolve against same-file symbols first, then fall back to a
project-wide symbol-name index *only when the name is unambiguous* (exactly one
file defines a symbol with that name). Ambiguous or externally-defined calls
(library functions) are intentionally left unconnected rather than guessed at —
this is a heuristic static analysis, not a type checker, and it's better to
under-connect than to draw a wrong edge.

## AI readiness (not implemented)

`src/ai-extensions/types.ts` defines the interfaces a future AI layer would
implement (`AiProvider.explainNode`, `.analyzeGraph`, etc.), built on top of
`ParsedFile`/`ArchitectureGraph` data that already exists. Nothing in the app
calls into this file today — it's a stable seam for later work, not a feature.

## Known limitations

- **Monaco bundle size.** Self-hosting Monaco (required to satisfy "no cloud
  services" — the library's default behavior is to fetch itself from a public
  CDN) means the production bundle includes Monaco's full language feature set,
  which is large (~5 MB before gzip, cached by the service worker after first
  load). This is a legitimate offline-vs-bundle-size tradeoff; trimming to a
  subset of languages is possible later via Monaco's per-language entry points.
- **Static analysis, not type-checking.** Call-edge resolution and component
  detection are name/shape heuristics (see above), not a full type checker —
  they're deliberately conservative rather than confidently wrong.
- **Directory handle permission re-prompts.** Chromium re-asks for folder read
  permission when reopening a project from a previous session — this is a
  browser security boundary, not something CodeAtlas can suppress.
- **Barrel/dynamic imports.** Re-exports (`export * from './x'`) are captured
  as edges but not flattened through to the original symbol; fully-dynamic
  `import()` expressions and non-literal specifiers aren't resolved.
