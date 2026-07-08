/**
 * Types describing the structural facts extracted from a source file's AST.
 * The parser module (features/parser) is the only place that should produce
 * these; everything downstream (graph builder, metadata panel) consumes them
 * as plain data, which keeps the parser swappable (Babel today, potentially
 * Tree-sitter or a language server later) without touching the rest of the app.
 */

export interface SourceLocation {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export type ImportKind = 'default' | 'named' | 'namespace' | 'side-effect';

export interface ImportInfo {
  id: string;
  /** The module specifier as written, e.g. "./Button" or "react". */
  source: string;
  kind: ImportKind;
  /** Local binding name in this file. */
  localName: string;
  /** Original exported name for named imports (may differ from localName due to aliasing). */
  importedName?: string;
  loc: SourceLocation;
}

export type ExportKind = 'default' | 'named' | 're-export';

export interface ExportInfo {
  id: string;
  kind: ExportKind;
  /** Local name being exported, if any (default exports may be anonymous). */
  localName?: string;
  /** Exported-as name. */
  exportedName: string;
  /** For re-exports: the source module. */
  source?: string;
  loc: SourceLocation;
}

export interface FunctionInfo {
  id: string;
  name: string;
  isAsync: boolean;
  isGenerator: boolean;
  isArrow: boolean;
  params: string[];
  /** True if this function is exported (directly or via a later export statement). */
  isExported: boolean;
  /** True if this looks like a React component (PascalCase + returns JSX, or uses hooks). */
  isComponent: boolean;
  loc: SourceLocation;
}

export interface ClassInfo {
  id: string;
  name: string;
  superClass?: string;
  isExported: boolean;
  /** True if this looks like a React class component (extends Component/React.Component). */
  isComponent: boolean;
  methods: string[];
  loc: SourceLocation;
}

export interface VariableInfo {
  id: string;
  name: string;
  kind: 'const' | 'let' | 'var';
  isExported: boolean;
  loc: SourceLocation;
}

export interface HookUsageInfo {
  id: string;
  /** Hook name, e.g. useState, useEffect, useMyCustomHook. */
  name: string;
  /** Name of the enclosing function/component, if resolvable. */
  enclosingScope?: string;
  loc: SourceLocation;
}

export interface CallInfo {
  id: string;
  /** Callee name as written, e.g. "fetchData" or "Utils.parse". */
  calleeName: string;
  /** Name of the enclosing function/component this call occurs in, if resolvable. */
  callerName?: string;
  loc: SourceLocation;
}

export interface ParseError {
  message: string;
  loc?: SourceLocation;
}

export interface ParsedFile {
  fileId: string;
  path: string;
  /** Raw source text, cached alongside parse results for the editor + re-parsing. */
  source: string;
  lineCount: number;
  imports: ImportInfo[];
  exports: ExportInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  variables: VariableInfo[];
  hooks: HookUsageInfo[];
  calls: CallInfo[];
  /** Non-fatal parse issues (e.g. a single file with a syntax error shouldn't abort the whole scan). */
  errors: ParseError[];
  /** Hash of the source, used to skip re-parsing unchanged files against the IndexedDB cache. */
  contentHash: string;
  parsedAt: number;
}
