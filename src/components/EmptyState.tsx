import { motion } from 'framer-motion';
import { FolderOpen, GitBranch, Sparkles } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({ onOpen, onImport }: { onOpen: () => void; onImport: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10"
    >
      <div className="w-full max-w-3xl rounded-[30px] border border-white/10 bg-surface-900/95 p-10 shadow-panel backdrop-blur-xl">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-blue/10 text-accent-blue ring-1 ring-accent-blue/15">
            <Sparkles size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-100">Welcome to CodeAtlas</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
              Explore your codebase with a premium architecture graph, instant search, and polished developer workflows.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-left">
              <p className="text-sm font-semibold text-slate-100">Open local project</p>
              <p className="mt-2 text-xs text-slate-500">Browse a folder and inspect its code structure instantly.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-left">
              <p className="text-sm font-semibold text-slate-100">Import from GitHub</p>
              <p className="mt-2 text-xs text-slate-500">Pull a public repository and explore its architecture without leaving the browser.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-left">
              <p className="text-sm font-semibold text-slate-100">Drag & drop support</p>
              <p className="mt-2 text-xs text-slate-500">Drop a repository URL or folder to get started faster.</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button variant="primary" icon={<FolderOpen size={16} />} onClick={onOpen}>
              Open Local Project
            </Button>
            <Button variant="secondary" icon={<GitBranch size={16} />} onClick={onImport}>
              Import from GitHub
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
