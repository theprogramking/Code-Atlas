import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ParsedFile } from '../types/parser';
import type { ArchitectureGraph, GraphLayoutCache } from '../types/graph';
import type { RecentProjectRecord } from '../types/fileSystem';
import type { UserPreferences } from '../types/app';

const DB_NAME = 'codeatlas';
const DB_VERSION = 1;

interface CodeAtlasDB extends DBSchema {
  parsedFiles: {
    key: string; // `${projectId}:${filePath}`
    value: ParsedFile & { projectId: string; cacheKey: string };
    indexes: { 'by-project': string };
  };
  graphs: {
    key: string; // projectId
    value: ArchitectureGraph & { projectId: string };
  };
  layouts: {
    key: string; // projectId
    value: GraphLayoutCache;
  };
  preferences: {
    key: string; // 'global'
    value: UserPreferences;
  };
  recentProjects: {
    key: string; // project id
    value: RecentProjectRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<CodeAtlasDB>> | null = null;

function getDb(): Promise<IDBPDatabase<CodeAtlasDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CodeAtlasDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('parsedFiles')) {
          const store = db.createObjectStore('parsedFiles', { keyPath: 'cacheKey' });
          store.createIndex('by-project', 'projectId');
        }
        if (!db.objectStoreNames.contains('graphs')) {
          db.createObjectStore('graphs', { keyPath: 'projectId' });
        }
        if (!db.objectStoreNames.contains('layouts')) {
          db.createObjectStore('layouts', { keyPath: 'projectId' });
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences');
        }
        if (!db.objectStoreNames.contains('recentProjects')) {
          db.createObjectStore('recentProjects', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

function cacheKey(projectId: string, filePath: string): string {
  return `${projectId}:${filePath}`;
}

// ---- Parsed file cache -----------------------------------------------------

export async function getCachedParsedFile(
  projectId: string,
  filePath: string,
): Promise<ParsedFile | null> {
  const db = await getDb();
  const record = await db.get('parsedFiles', cacheKey(projectId, filePath));
  return record ?? null;
}

export async function putCachedParsedFile(projectId: string, parsed: ParsedFile): Promise<void> {
  const db = await getDb();
  await db.put('parsedFiles', {
    ...parsed,
    projectId,
    cacheKey: cacheKey(projectId, parsed.path),
  });
}

export async function getAllCachedParsedFiles(projectId: string): Promise<ParsedFile[]> {
  const db = await getDb();
  return db.getAllFromIndex('parsedFiles', 'by-project', projectId);
}

export async function clearProjectCache(projectId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('parsedFiles', 'readwrite');
  const index = tx.store.index('by-project');
  let cursor = await index.openCursor(IDBKeyRange.only(projectId));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// ---- Graph cache ------------------------------------------------------------

export async function getCachedGraph(projectId: string): Promise<ArchitectureGraph | null> {
  const db = await getDb();
  const record = await db.get('graphs', projectId);
  return record ?? null;
}

export async function putCachedGraph(projectId: string, graph: ArchitectureGraph): Promise<void> {
  const db = await getDb();
  await db.put('graphs', { ...graph, projectId });
}

// ---- Layout cache -----------------------------------------------------------

export async function getLayoutCache(projectId: string): Promise<GraphLayoutCache | null> {
  const db = await getDb();
  const record = await db.get('layouts', projectId);
  return record ?? null;
}

export async function putLayoutCache(cache: GraphLayoutCache): Promise<void> {
  const db = await getDb();
  await db.put('layouts', cache);
}

// ---- Preferences --------------------------------------------------------------

export async function getPreferences(): Promise<UserPreferences | null> {
  const db = await getDb();
  const record = await db.get('preferences', 'global');
  return record ?? null;
}

export async function putPreferences(prefs: UserPreferences): Promise<void> {
  const db = await getDb();
  await db.put('preferences', prefs, 'global');
}

// ---- Recent projects (directory handles) ---------------------------------------

export async function listRecentProjects(): Promise<RecentProjectRecord[]> {
  const db = await getDb();
  const all = await db.getAll('recentProjects');
  return all.sort((a, b) => b.lastOpened - a.lastOpened);
}

export async function putRecentProject(record: RecentProjectRecord): Promise<void> {
  const db = await getDb();
  await db.put('recentProjects', record);
}

export async function removeRecentProject(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('recentProjects', id);
}
