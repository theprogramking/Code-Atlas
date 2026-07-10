import { lazy, Suspense, useEffect } from 'react';
import { Panel as ResizablePanel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { Toolbar } from './components/Toolbar';
import { LoadingOverlay } from './components/LoadingOverlay';
import { GithubImportModal } from './components/GithubImportModal';
import { EmptyState } from './components/EmptyState';
import { ExplorerPanel } from './features/explorer/ExplorerPanel';
import { useAppStore } from './store/useAppStore';

const GraphPanel = lazy(() => import('./features/graph/GraphPanel').then((m) => ({ default: m.GraphPanel })));
const EditorPanel = lazy(() => import('./features/editor/EditorPanel').then((m) => ({ default: m.EditorPanel })));
const MetadataPanel = lazy(() => import('./features/metadata/MetadataPanel').then((m) => ({ default: m.MetadataPanel })));

function PanelFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-surface-900/80 text-sm text-slate-400 shadow-soft">
      <Loader2 size={14} className="animate-spin" />
      <span>Loading {label}…</span>
    </div>
  );
}

function HorizontalHandle() {
  return (
    <PanelResizeHandle className="group relative w-2 bg-transparent">
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/5 transition-all duration-200 group-hover:bg-accent-blue/50 group-data-[resize-handle-active]:bg-accent-blue" />
    </PanelResizeHandle>
  );
}

function VerticalHandle() {
  return (
    <PanelResizeHandle className="group relative h-2 bg-transparent">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/5 transition-all duration-200 group-hover:bg-accent-blue/50 group-data-[resize-handle-active]:bg-accent-blue" />
    </PanelResizeHandle>
  );
}

function ErrorBanner() {
  const errorMessage = useAppStore((s) => s.errorMessage);
  if (!errorMessage) return null;
  return (
    <div className="flex items-center gap-2 border-b border-red/20 bg-red/10 px-4 py-3 text-sm text-red-200">
      <AlertCircle size={14} className="shrink-0" />
      <span className="flex-1 truncate">{errorMessage}</span>
      <button
        onClick={() => useAppStore.setState({ errorMessage: null })}
        className="shrink-0 rounded-full p-1 hover:bg-white/10"
      >
        <X size={14} />
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
  const project = useAppStore((s) => s.project);
  const openProjectPicker = useAppStore((s) => s.openProjectPicker);
  const openGithubImportModal = useAppStore((s) => s.openGithubImportModal);

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
    { label: 'Building architecture graph', done: githubImportProgress.some((step) => step.step === 'graph') },
  ];
  const progressMessage = githubImportProgress.at(-1)?.message ?? 'Preparing import...';

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-950 text-slate-100">
      <Toolbar />
      <ErrorBanner />
      <div className="relative min-h-0 flex-1">
        <LoadingOverlay />
        {project ? (
          <PanelGroup direction="horizontal" autoSaveId="codeatlas-h-layout" onLayout={(sizes) => setPanelSizes({ explorer: sizes[0], metadata: sizes[2] })}>
            <ResizablePanel defaultSize={explorerSize} minSize={14} maxSize={35} order={1}>
              <ExplorerPanel />
            </ResizablePanel>
            <HorizontalHandle />
            <ResizablePanel defaultSize={middleSize} minSize={32} order={2}>
              <PanelGroup direction="vertical" autoSaveId="codeatlas-v-layout" onLayout={(sizes) => setPanelSizes({ graph: sizes[0], editor: sizes[1] })}>
                <ResizablePanel defaultSize={graphSize} minSize={26} order={1}>
                  <Suspense fallback={<PanelFallback label="graph" />}>
                    <GraphPanel />
                  </Suspense>
                </ResizablePanel>
                <VerticalHandle />
                <ResizablePanel defaultSize={editorSize} minSize={18} order={2}>
                  <Suspense fallback={<PanelFallback label="editor" />}>
                    <EditorPanel />
                  </Suspense>
                </ResizablePanel>
              </PanelGroup>
            </ResizablePanel>
            <HorizontalHandle />
            <ResizablePanel defaultSize={metadataSize} minSize={18} maxSize={40} order={3}>
              <Suspense fallback={<PanelFallback label="metadata" />}>
                <MetadataPanel />
              </Suspense>
            </ResizablePanel>
          </PanelGroup>
        ) : (
          <EmptyState onOpen={openProjectPicker} onImport={openGithubImportModal} />
        )}
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
