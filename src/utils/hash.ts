/**
 * Fast, non-cryptographic hash (FNV-1a) used only to detect whether a file's
 * content changed since it was last parsed and cached. Not a security
 * primitive - just cheap change detection so we can skip re-parsing unchanged
 * files.
 */
export function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}
