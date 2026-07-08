import { useEffect } from 'react';
import { Panel as ResizablePanel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { AlertCircle, X } from 'lucide-react';
import { Toolbar } from './components/Toolbar';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ExplorerPanel } from './features/explorer/ExplorerPanel';
import { GraphPanel } from './features/graph/GraphPanel';
import { EditorPanel } from './features/editor/EditorPanel';
import { MetadataPanel } from './features/metadata/MetadataPanel';
import { useAppStore } from './store/useAppStore';

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

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-950 text-slate-100">
      <Toolbar />
      <ErrorBanner />
      <div className="relative min-h-0 flex-1">
        <LoadingOverlay />
        <PanelGroup direction="horizontal" autoSaveId="codeatlas-h-layout">
          <ResizablePanel defaultSize={18} minSize={12} maxSize={35} order={1}>
            <ExplorerPanel />
          </ResizablePanel>
          <HorizontalHandle />
          <ResizablePanel defaultSize={58} minSize={30} order={2}>
            <PanelGroup direction="vertical" autoSaveId="codeatlas-v-layout">
              <ResizablePanel defaultSize={65} minSize={25} order={1}>
                <GraphPanel />
              </ResizablePanel>
              <VerticalHandle />
              <ResizablePanel defaultSize={35} minSize={15} order={2}>
                <EditorPanel />
              </ResizablePanel>
            </PanelGroup>
          </ResizablePanel>
          <HorizontalHandle />
          <ResizablePanel defaultSize={24} minSize={16} maxSize={40} order={3}>
            <MetadataPanel />
          </ResizablePanel>
        </PanelGroup>
      </div>
    </div>
  );
}
