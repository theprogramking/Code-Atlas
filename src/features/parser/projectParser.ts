import type { FileTreeFile } from '../../types/fileSystem';
import type { ParsedFile } from '../../types/parser';
import { readFileText } from '../../services/fileSystemService';
import { getCachedParsedFile, putCachedParsedFile } from '../../services/dbService';
import { hashString } from '../../utils/hash';
import { parseSourceFile } from './astParser';

export interface ParseAllProgress {
  parsed: number;
  total: number;
  currentPath: string;
  fromCache: boolean;
}

export interface ParseAllOptions {
  onProgress?: (progress: ParseAllProgress) => void;
  signal?: AbortSignal;
}

/**
 * Parses every source file in a project, reusing the IndexedDB cache when a
 * file's content hash hasn't changed since it was last parsed. Files are read
 * and parsed with limited concurrency so large projects stay responsive
 * rather than blocking the main thread on hundreds of sequential reads.
 */
export async function parseProjectFiles(
  projectId: string,
  files: FileTreeFile[],
  options: ParseAllOptions = {},
): Promise<ParsedFile[]> {
  const results: ParsedFile[] = new Array(files.length);
  let parsed = 0;
  const concurrency = 8;
  let cursor = 0;

  async function worker() {
    while (cursor < files.length) {
      if (options.signal?.aborted) throw new DOMException('Parse aborted', 'AbortError');
      const index = cursor;
      cursor += 1;
      const file = files[index];
      const source = await readFileText(file.handle);
      const contentHash = hashString(source);
      const cached = await getCachedParsedFile(projectId, file.path);
      let result: ParsedFile;
      let fromCache = false;
      if (cached && cached.contentHash === contentHash) {
        result = cached;
        fromCache = true;
      } else {
        result = parseSourceFile({ path: file.path, source });
        await putCachedParsedFile(projectId, result);
      }
      results[index] = result;
      parsed += 1;
      options.onProgress?.({ parsed, total: files.length, currentPath: file.path, fromCache });
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
