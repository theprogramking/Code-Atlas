import { lazy, Suspense, useEffect } from 'react';
import { Panel as ResizablePanel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { Toolbar } from './components/Toolbar';
import { LoadingOverlay } from './components/LoadingOverlay';
import { GithubImportModal } from './components/GithubImportModal';
import { ExplorerPanel } from './features/explorer/ExplorerPanel';
import { useAppStore } from './store/useAppStore';

const GraphPanel = lazy(() => import('./features/graph/GraphPanel').then((m) => ({ default: m.GraphPanel })));
const EditorPanel = lazy(() => import('./features/editor/EditorPanel').then((m) => ({ default: m.EditorPanel })));
const MetadataPanel = lazy(() => import('./features/metadata/MetadataPanel').then((m) => ({ default: m.MetadataPanel })));

function PanelFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 border border-white/5 bg-surface-900/80 text-sm text-slate-500">
      <Loader2 size={14} className="animate-spin" />
      <span>Loading {label}…</span>
    </div>
  );
}

function HorizontalHandle() {
  return (
    <PanelResizeHandle className="group relative w-1 bg-transparent">
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/5 transition group-hover:bg-accent-500/50 group-data-[resize-handle-active]:bg-accent-500" />
    </PanelResizeHandle>
  );
}

function VerticalHandle() {
  return (
    <PanelResizeHandle className="group relative h-1 bg-transparent">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/5 transition group-hover:bg-accent-500/50 group-data-[resize-handle-active]:bg-accent-500" />
    </PanelResizeHandle>
  );
}

function ErrorBanner() {
  const errorMessage = useAppStore((s) => s.errorMessage);
  if (!errorMessage) return null;
  return (
    <div className="flex items-center gap-2 border-b border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300">
      <AlertCircle size={13} className="shrink-0" />
      <span className="flex-1 truncate">{errorMessage}</span>
      <button
        onClick={() => useAppStore.setState({ errorMessage: null })}
        className="shrink-0 rounded p-0.5 hover:bg-white/10"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export default function App() {
  const initialize = useAppStore((s) => s.initialize);
  const preferences = useAppStore((s) => s.preferences);
  const setPanelSizes = useAppStore((s) => s.setPanelSizes);
  const githubImportOpen = useAppStore((s) => s.githubImportOpen);
  const githubImporting = useAppStore((s) => s.githubImporting);
  const githubImportProgress = useAppStore((s) => s.githubImportProgress);
  const githubImportError = useAppStore((s) => s.githubImportError);
  const importFromGitHub = useAppStore((s) => s.importFromGitHub);
  const closeGithubImportModal = useAppStore((s) => s.closeGithubImportModal);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const explorerSize = preferences.panelSizes.explorer ?? 18;
  const metadataSize = preferences.panelSizes.metadata ?? 24;
  const middleSize = 100 - explorerSize - metadataSize;
  const graphSize = preferences.panelSizes.graph ?? 65;
  const editorSize = 100 - graphSize;
  const progressSteps = [
    { label: 'Connecting to GitHub', done: githubImportProgress.some((step) => step.step === 'connect') },
    { label: 'Downloading repository', done: githubImportProgress.some((step) => step.step === 'download') },
    { label: 'Extracting files', done: githubImportProgress.some((step) => step.step === 'extract') },
    { label: 'Indexing project', done: githubImportProgress.some((step) => step.step === 'index') },
    { label: 'Building dependency graph', done: githubImportProgress.some((step) => step.step === 'graph') },
  ];
  const progressMessage = githubImportProgress.at(-1)?.message ?? 'Preparing import...';

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-950 text-slate-100">
      <Toolbar />
      <ErrorBanner />
      <div className="relative min-h-0 flex-1">
        <LoadingOverlay />
        <PanelGroup direction="horizontal" autoSaveId="codeatlas-h-layout" onLayout={(sizes) => setPanelSizes({ explorer: sizes[0], metadata: sizes[2] })}>
          <ResizablePanel defaultSize={explorerSize} minSize={12} maxSize={35} order={1}>
            <ExplorerPanel />
          </ResizablePanel>
          <HorizontalHandle />
          <ResizablePanel defaultSize={middleSize} minSize={30} order={2}>
            <PanelGroup direction="vertical" autoSaveId="codeatlas-v-layout" onLayout={(sizes) => setPanelSizes({ graph: sizes[0], editor: sizes[1] })}>
              <ResizablePanel defaultSize={graphSize} minSize={25} order={1}>
                <Suspense fallback={<PanelFallback label="graph" />}>
                  <GraphPanel />
                </Suspense>
              </ResizablePanel>
              <VerticalHandle />
              <ResizablePanel defaultSize={editorSize} minSize={15} order={2}>
                <Suspense fallback={<PanelFallback label="editor" />}>
                  <EditorPanel />
                </Suspense>
              </ResizablePanel>
            </PanelGroup>
          </ResizablePanel>
          <HorizontalHandle />
          <ResizablePanel defaultSize={metadataSize} minSize={16} maxSize={40} order={3}>
            <Suspense fallback={<PanelFallback label="metadata" />}>
              <MetadataPanel />
            </Suspense>
          </ResizablePanel>
        </PanelGroup>
      </div>
      <GithubImportModal
        open={githubImportOpen}
        onClose={closeGithubImportModal}
        onImport={(url) => void importFromGitHub(url)}
        isImporting={githubImporting}
        progressMessage={progressMessage}
        progressSteps={progressSteps}
        errorMessage={githubImportError}
      />
    </div>
  );
}
