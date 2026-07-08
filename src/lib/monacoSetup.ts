import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

/**
 * By default @monaco-editor/react fetches Monaco's assets from a public CDN
 * at runtime. That would violate this app's "everything runs locally, no
 * cloud services" constraint and would break offline/PWA use, so instead we
 * point it at the `monaco-editor` package already bundled with the app and
 * wire up its web workers to local, Vite-bundled worker files.
 *
 * This module must be imported once, before any Monaco editor instance is
 * mounted (done in main.tsx).
 */
self.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    switch (label) {
      case 'json':
        return new jsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

loader.config({ monaco });
