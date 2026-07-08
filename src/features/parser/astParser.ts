import { parse } from '@babel/parser';
import traverse, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type {
  CallInfo,
  ClassInfo,
  ExportInfo,
  FunctionInfo,
  HookUsageInfo,
  ImportInfo,
  ParsedFile,
  ParseError,
  SourceLocation,
  VariableInfo,
} from '../../types/parser';
import { hashString } from '../../utils/hash';
import { nextId } from '../../utils/ids';

const HOOK_NAME_PATTERN = /^use[A-Z0-9]/;
const COMPONENT_NAME_PATTERN = /^[A-Z]/;

function locOf(node: t.Node): SourceLocation {
  const loc = node.loc;
  if (!loc) return { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 };
  return {
    startLine: loc.start.line,
    endLine: loc.end.line,
    startColumn: loc.start.column,
    endColumn: loc.end.column,
  };
}

/** Picks a Babel parser plugin set based on file extension. */
function pluginsForPath(path: string): ('jsx' | 'typescript')[] {
  const plugins: ('jsx' | 'typescript')[] = [];
  if (path.endsWith('.tsx') || path.endsWith('.jsx')) plugins.push('jsx');
  if (path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.mts') || path.endsWith('.cts')) {
    plugins.push('typescript');
  }
  // Plain .js/.mjs/.cjs files may still contain JSX in real-world codebases (no build-time
  // guarantee otherwise) - be permissive and include jsx unless it's clearly typescript-only.
  if (!plugins.includes('jsx') && !path.endsWith('.ts')) plugins.push('jsx');
  return plugins;
}

/** Returns true if a function body appears to return JSX, used as one signal for component detection. */
function bodyReturnsJsx(node: t.Function): boolean {
  let found = false;
  function visitStatement(stmt: t.Node | null | undefined) {
    if (!stmt || found) return;
    if (t.isJSXElement(stmt) || t.isJSXFragment(stmt)) {
      found = true;
      return;
    }
    if (t.isParenthesizedExpression(stmt)) {
      visitStatement(stmt.expression);
    } else if (t.isConditionalExpression(stmt)) {
      visitStatement(stmt.consequent);
      visitStatement(stmt.alternate);
    } else if (t.isLogicalExpression(stmt)) {
      visitStatement(stmt.right);
    }
  }
  if (t.isBlockStatement(node.body)) {
    for (const stmt of node.body.body) {
      if (t.isReturnStatement(stmt)) visitStatement(stmt.argument);
    }
  } else {
    // Arrow function with concise (expression) body.
    visitStatement(node.body);
  }
  return found;
}

function functionName(
  path: NodePath<t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression>,
): string {
  const node = path.node;
  if (t.isFunctionDeclaration(node) && node.id) return node.id.name;
  // Try to infer name from an enclosing VariableDeclarator: const Foo = () => {}
  const parent = path.parent;
  if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
    return parent.id.name;
  }
  if (t.isAssignmentExpression(parent) && t.isIdentifier(parent.left)) {
    return parent.left.name;
  }
  if (t.isObjectProperty(parent) && t.isIdentifier(parent.key)) {
    return parent.key.name;
  }
  return '<anonymous>';
}

function paramNames(params: t.Function['params']): string[] {
  return params.map((p) => {
    if (t.isIdentifier(p)) return p.name;
    if (t.isAssignmentPattern(p) && t.isIdentifier(p.left)) return p.left.name;
    if (t.isObjectPattern(p)) return 'props';
    if (t.isRestElement(p) && t.isIdentifier(p.argument)) return `...${p.argument.name}`;
    return 'arg';
  });
}

export interface ParseFileInput {
  path: string;
  source: string;
}

/**
 * Parses a single source file and extracts all structural facts CodeAtlas
 * needs. Designed to never throw on a single malformed file - syntax errors
 * are captured in `errors` so one broken file doesn't abort a whole project
 * scan.
 */
export function parseSourceFile({ path, source }: ParseFileInput): ParsedFile {
  const errors: ParseError[] = [];
  const imports: ImportInfo[] = [];
  const exports: ExportInfo[] = [];
  const functions: FunctionInfo[] = [];
  const classes: ClassInfo[] = [];
  const variables: VariableInfo[] = [];
  const hooks: HookUsageInfo[] = [];
  const calls: CallInfo[] = [];

  const exportedLocalNames = new Set<string>();

  let ast: t.File | null = null;
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: [...pluginsForPath(path), 'classProperties', 'decorators-legacy', 'objectRestSpread'],
      errorRecovery: true,
    });
  } catch (err) {
    errors.push({ message: err instanceof Error ? err.message : 'Unknown parse error' });
  }

  if (!ast) {
    return {
      fileId: `file:${path}`,
      path,
      source,
      lineCount: source.split('\n').length,
      imports,
      exports,
      functions,
      classes,
      variables,
      hooks,
      calls,
      errors,
      contentHash: hashString(source),
      parsedAt: Date.now(),
    };
  }

  // First pass: collect export declarations so isExported can be resolved on the second pass.
  traverse(ast, {
    ExportNamedDeclaration(path_) {
      const node = path_.node;
      if (node.declaration) {
        if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
          exportedLocalNames.add(node.declaration.id.name);
          exports.push({
            id: nextId('export'),
            kind: 'named',
            localName: node.declaration.id.name,
            exportedName: node.declaration.id.name,
            loc: locOf(node),
          });
        } else if (t.isClassDeclaration(node.declaration) && node.declaration.id) {
          exportedLocalNames.add(node.declaration.id.name);
          exports.push({
            id: nextId('export'),
            kind: 'named',
            localName: node.declaration.id.name,
            exportedName: node.declaration.id.name,
            loc: locOf(node),
          });
        } else if (t.isVariableDeclaration(node.declaration)) {
          for (const decl of node.declaration.declarations) {
            if (t.isIdentifier(decl.id)) {
              exportedLocalNames.add(decl.id.name);
              exports.push({
                id: nextId('export'),
                kind: 'named',
                localName: decl.id.name,
                exportedName: decl.id.name,
                loc: locOf(node),
              });
            }
          }
        }
      }
      for (const spec of node.specifiers) {
        if (t.isExportSpecifier(spec)) {
          const local = spec.local.name;
          const exported = t.isIdentifier(spec.exported) ? spec.exported.name : spec.exported.value;
          exportedLocalNames.add(local);
          exports.push({
            id: nextId('export'),
            kind: node.source ? 're-export' : 'named',
            localName: local,
            exportedName: exported,
            source: node.source?.value,
            loc: locOf(node),
          });
        }
      }
    },
    ExportDefaultDeclaration(path_) {
      const node = path_.node;
      let localName: string | undefined;
      if (t.isIdentifier(node.declaration)) {
        localName = node.declaration.name;
      } else if (
        (t.isFunctionDeclaration(node.declaration) || t.isClassDeclaration(node.declaration)) &&
        node.declaration.id
      ) {
        localName = node.declaration.id.name;
      }
      if (localName) exportedLocalNames.add(localName);
      exports.push({
        id: nextId('export'),
        kind: 'default',
        localName,
        exportedName: 'default',
        loc: locOf(node),
      });
    },
    ExportAllDeclaration(path_) {
      const node = path_.node;
      exports.push({
        id: nextId('export'),
        kind: 're-export',
        exportedName: '*',
        source: node.source.value,
        loc: locOf(node),
      });
    },
  });

  // Main pass: imports, functions, classes, variables, hooks, calls.
  traverse(ast, {
    ImportDeclaration(path_) {
      const node = path_.node;
      for (const spec of node.specifiers) {
        if (t.isImportDefaultSpecifier(spec)) {
          imports.push({
            id: nextId('import'),
            source: node.source.value,
            kind: 'default',
            localName: spec.local.name,
            loc: locOf(node),
          });
        } else if (t.isImportNamespaceSpecifier(spec)) {
          imports.push({
            id: nextId('import'),
            source: node.source.value,
            kind: 'namespace',
            localName: spec.local.name,
            loc: locOf(node),
          });
        } else if (t.isImportSpecifier(spec)) {
          const imported = t.isIdentifier(spec.imported) ? spec.imported.name : spec.imported.value;
          imports.push({
            id: nextId('import'),
            source: node.source.value,
            kind: 'named',
            localName: spec.local.name,
            importedName: imported,
            loc: locOf(node),
          });
        }
      }
      if (node.specifiers.length === 0) {
        imports.push({
          id: nextId('import'),
          source: node.source.value,
          kind: 'side-effect',
          localName: '',
          loc: locOf(node),
        });
      }
    },

    FunctionDeclaration(path_) {
      recordFunction(path_);
    },
    FunctionExpression(path_) {
      // Only record named/assigned function expressions (const foo = function () {}),
      // to avoid double-counting inline callbacks passed to e.g. array methods.
      if (
        t.isVariableDeclarator(path_.parent) ||
        t.isAssignmentExpression(path_.parent) ||
        t.isObjectProperty(path_.parent)
      ) {
        recordFunction(path_);
      }
    },
    ArrowFunctionExpression(path_) {
      if (
        t.isVariableDeclarator(path_.parent) ||
        t.isAssignmentExpression(path_.parent) ||
        t.isExportDefaultDeclaration(path_.parent)
      ) {
        recordFunction(path_);
      }
    },

    ClassDeclaration(path_) {
      const node = path_.node;
      if (!node.id) return;
      const superName = t.isIdentifier(node.superClass)
        ? node.superClass.name
        : t.isMemberExpression(node.superClass) && t.isIdentifier(node.superClass.property)
          ? node.superClass.property.name
          : undefined;
      const methods: string[] = [];
      for (const member of node.body.body) {
        if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
          methods.push(member.key.name);
        }
      }
      const isComponent =
        superName === 'Component' || superName === 'PureComponent' || superName === 'React.Component';
      classes.push({
        id: nextId('class'),
        name: node.id.name,
        superClass: superName,
        isExported: exportedLocalNames.has(node.id.name),
        isComponent,
        methods,
        loc: locOf(node),
      });
    },

    VariableDeclarator(path_) {
      const node = path_.node;
      if (!t.isIdentifier(node.id)) return;
      // Skip if this declarator's init is itself a function - that's already captured as a FunctionInfo.
      if (
        node.init &&
        (t.isArrowFunctionExpression(node.init) || t.isFunctionExpression(node.init))
      ) {
        return;
      }
      const declKind = t.isVariableDeclaration(path_.parent) ? path_.parent.kind : 'const';
      variables.push({
        id: nextId('var'),
        name: node.id.name,
        kind: declKind as 'const' | 'let' | 'var',
        isExported: exportedLocalNames.has(node.id.name),
        loc: locOf(node),
      });
    },

    CallExpression(path_) {
      const node = path_.node;
      let calleeName: string | null = null;
      if (t.isIdentifier(node.callee)) {
        calleeName = node.callee.name;
      } else if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property)) {
        calleeName = node.callee.property.name;
      }
      if (!calleeName) return;

      const enclosing = findEnclosingFunctionName(path_);

      if (HOOK_NAME_PATTERN.test(calleeName)) {
        hooks.push({
          id: nextId('hook'),
          name: calleeName,
          enclosingScope: enclosing,
          loc: locOf(node),
        });
        return;
      }

      calls.push({
        id: nextId('call'),
        calleeName,
        callerName: enclosing,
        loc: locOf(node),
      });
    },
  });

  function findEnclosingFunctionName(path_: NodePath<t.Node>): string | undefined {
    let current: NodePath<t.Node> | null = path_.parentPath;
    while (current) {
      if (
        current.isFunctionDeclaration() ||
        current.isFunctionExpression() ||
        current.isArrowFunctionExpression()
      ) {
        return functionName(
          current as NodePath<t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression>,
        );
      }
      current = current.parentPath;
    }
    return undefined;
  }

  function recordFunction(
    path_: NodePath<t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression>,
  ) {
    const node = path_.node;
    const name = functionName(path_);
    const isComponent = COMPONENT_NAME_PATTERN.test(name) && bodyReturnsJsx(node);
    functions.push({
      id: nextId('fn'),
      name,
      isAsync: node.async,
      isGenerator: t.isFunctionDeclaration(node) || t.isFunctionExpression(node) ? node.generator : false,
      isArrow: t.isArrowFunctionExpression(node),
      params: paramNames(node.params),
      isExported: exportedLocalNames.has(name),
      isComponent,
      loc: locOf(node),
    });
  }

  // Second signal for component detection: a PascalCase function that doesn't
  // visibly `return <JSX/>` (e.g. it returns the result of another hook, or a
  // ternary too complex for the shallow scan above) but does call other hooks
  // is still very likely a component - hooks can only be called from
  // components or other hooks, and hooks aren't PascalCase, so this is a safe
  // upgrade rather than a guess.
  for (const fn of functions) {
    if (!fn.isComponent && COMPONENT_NAME_PATTERN.test(fn.name)) {
      const callsHook = hooks.some((h) => h.enclosingScope === fn.name);
      if (callsHook) fn.isComponent = true;
    }
  }

  return {
    fileId: `file:${path}`,
    path,
    source,
    lineCount: source.split('\n').length,
    imports,
    exports,
    functions,
    classes,
    variables,
    hooks,
    calls,
    errors,
    contentHash: hashString(source),
    parsedAt: Date.now(),
  };
}
