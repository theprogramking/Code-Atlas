import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { editor } from 'monaco-editor';
import { FileCode2, ListTree, ChevronRight } from 'lucide-react';
import { Panel } from '../../components/Panel';
import { useAppStore } from '../../store/useAppStore';
import { getExtension } from '../../utils/path';
import { Button } from '../../components/Button';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

function languageForExtension(ext: string | null): string {
  switch (ext) {
    case 'ts':
    case 'mts':
    case 'cts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'jsx':
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    default:
      return 'plaintext';
  }
}

export function EditorPanel() {
  const selectedFilePath = useAppStore((s) => s.selectedFilePath);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const parsedFiles = useAppStore((s) => s.parsedFiles);
  const graph = useAppStore((s) => s.graph);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const [showSymbols, setShowSymbols] = useState(false);

  const parsedFile = selectedFilePath ? parsedFiles.get(selectedFilePath) : undefined;
  const language = languageForExtension(getExtension(selectedFilePath ?? ''));

  const symbols = useMemo(() => {
    if (!parsedFile) return [];
    return [
      ...parsedFile.functions.map((f) => ({ name: f.name, loc: f.loc, kind: f.isComponent ? 'component' : 'function' })),
      ...parsedFile.classes.map((c) => ({ name: c.name, loc: c.loc, kind: c.isComponent ? 'component' : 'class' })),
    ].sort((a, b) => a.loc.startLine - b.loc.startLine);
  }, [parsedFile]);

  const selectedGraphNode = useMemo(
    () => graph?.nodes.find((n) => n.id === selectedNodeId),
    [graph, selectedNodeId],
  );

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (!selectedGraphNode || selectedGraphNode.kind === 'file' || !parsedFile) {
      decorationsRef.current = ed.deltaDecorations(decorationsRef.current, []);
      return;
    }
    const symbol = symbols.find((s) => s.name === selectedGraphNode.label);
    if (!symbol) return;
    decorationsRef.current = ed.deltaDecorations(decorationsRef.current, [
      {
        range: {
          startLineNumber: symbol.loc.startLine,
          startColumn: 1,
          endLineNumber: symbol.loc.endLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: 'atlas-highlighted-range',
          linesDecorationsClassName: 'atlas-highlighted-gutter',
        },
      },
    ]);
    ed.revealLineInCenter(symbol.loc.startLine);
  }, [selectedGraphNode, parsedFile, symbols]);

  const jumpToSymbol = (line: number) => {
    editorRef.current?.revealLineInCenter(line);
    editorRef.current?.setPosition({ lineNumber: line, column: 1 });
    editorRef.current?.focus();
    setShowSymbols(false);
  };

  return (
    <Panel
      title={parsedFile ? parsedFile.path.split('/').pop() ?? parsedFile.path : 'Code Viewer'}
      icon={<FileCode2 size={14} className="text-slate-500" />}
      actions={
        parsedFile && symbols.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setShowSymbols((v) => !v)}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-surface-800/80 px-3 py-1 text-[11px] text-slate-300 transition hover:bg-white/10 hover:text-slate-100"
              title="Jump to symbol"
            >
              <ListTree size={14} />
              Symbols
            </button>
            {showSymbols && (
              <div className="absolute right-0 top-full z-40 mt-2 max-h-64 w-72 overflow-auto rounded-3xl border border-white/10 bg-surface-900/95 p-2 shadow-panel">
                {symbols.map((s) => (
                  <button
                    key={`${s.name}-${s.loc.startLine}`}
                    onClick={() => jumpToSymbol(s.loc.startLine)}
                    className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">L{s.loc.startLine}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null
      }
      bodyClassName="overflow-hidden"
    >
      {!parsedFile ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
            <FileCode2 size={24} className="text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Ready when you are</p>
            <p className="mt-2 text-sm text-slate-400">Select a file or node to inspect its source code with syntax highlighting and inline symbol navigation.</p>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-surface-900/80 shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-100">
              <span className="font-semibold">{parsedFile.path.split('/').pop()}</span>
              <span className="text-xs text-slate-500">{parsedFile.path}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {parsedFile.functions.length + parsedFile.classes.length > 0 ? (
                <span>{parsedFile.functions.length + parsedFile.classes.length} symbols</span>
              ) : null}
              <span>{parsedFile.lineCount} lines</span>
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-white/10 bg-surface-950/70 px-4 py-2 text-xs text-slate-400">
            {parsedFile.path.split('/').map((segment, index, arr) => (
              <span key={`${segment}-${index}`} className="flex items-center gap-2">
                {index > 0 && <ChevronRight size={14} className="text-slate-600" />}
                <span className="truncate">{segment}</span>
              </span>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            <Suspense
              fallback={<div className="flex h-full items-center justify-center text-sm text-slate-500">Loading editor…</div>}
            >
              <MonacoEditor
                key={parsedFile.path}
                height="100%"
                theme="vs-dark"
                language={language}
                value={parsedFile.source}
                onMount={(ed) => {
                  editorRef.current = ed;
                }}
                options={{
                  readOnly: true,
                  domReadOnly: true,
                  minimap: { enabled: true, scale: 1 },
                  fontSize: 13,
                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                  lineNumbers: 'on',
                  folding: true,
                  scrollBeyondLastLine: false,
                  renderLineHighlight: 'line',
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                }}
              />
            </Suspense>
          </div>
        </div>
      )}
    </Panel>
  );
}
