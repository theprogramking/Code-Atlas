export function joinPath(base: string, name: string): string {
  if (!base) return name;
  return `${base}/${name}`;
}

export function getExtension(name: string): string | null {
  const idx = name.lastIndexOf('.');
  if (idx === -1 || idx === name.length - 1) return null;
  return name.slice(idx + 1).toLowerCase();
}

export function baseName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}

export function dirName(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/');
}

/** Resolves a relative import specifier ("./Button", "../utils/foo") against
 *  the importing file's directory, returning a project-relative path without
 *  extension. Returns null for bare specifiers (npm packages) since those
 *  aren't part of the local project graph. */
export function resolveRelativeImport(fromFilePath: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const fromDir = dirName(fromFilePath);
  const segments = fromDir ? fromDir.split('/') : [];
  const parts = specifier.split('/');
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      segments.pop();
    } else {
      segments.push(part);
    }
  }
  return segments.join('/');
}
