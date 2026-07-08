import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { editor } from 'monaco-editor';
import { FileCode2, ListTree } from 'lucide-react';
import { Panel } from '../../components/Panel';
import { useAppStore } from '../../store/useAppStore';
import { getExtension } from '../../utils/path';

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

  // Highlight the selected node's line range (function/class/component) whenever
  // the selection or the underlying file content changes.
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
      title={parsedFile ? parsedFile.path : 'Code Viewer'}
      icon={<FileCode2 size={12} className="text-slate-500" />}
      actions={
        parsedFile && symbols.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => setShowSymbols((v) => !v)}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-slate-400 hover:bg-white/5 hover:text-slate-200"
              title="Jump to symbol"
            >
              <ListTree size={12} />
            </button>
            {showSymbols && (
              <div className="absolute right-0 top-full z-40 mt-1 max-h-64 w-56 overflow-auto rounded-lg border border-white/10 bg-surface-800 py-1 shadow-panel">
                {symbols.map((s) => (
                  <button
                    key={`${s.name}-${s.loc.startLine}`}
                    onClick={() => jumpToSymbol(s.loc.startLine)}
                    className="flex w-full items-center justify-between px-3 py-1 text-left text-[11px] text-slate-300 hover:bg-white/5"
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="shrink-0 text-[9px] text-slate-500">L{s.loc.startLine}</span>
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
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <FileCode2 size={22} className="text-slate-600" />
          <p className="text-xs text-slate-500">Select a file or node to view its source.</p>
        </div>
      ) : (
        <Suspense
          fallback={<div className="flex h-full items-center justify-center text-xs text-slate-500">Loading editor...</div>}
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
              fontSize: 12.5,
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              lineNumbers: 'on',
              folding: true,
              scrollBeyondLastLine: false,
              renderLineHighlight: 'line',
              automaticLayout: true,
              padding: { top: 8 },
            }}
          />
        </Suspense>
      )}
    </Panel>
  );
}
