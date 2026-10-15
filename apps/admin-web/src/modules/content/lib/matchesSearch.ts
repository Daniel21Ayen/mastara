// apps/admin-web/src/modules/content/lib/matchesSearch.ts

/** Case-insensitive match of the top-bar search text against any of the given texts. */
export function matchesSearch(q: string | undefined, ...texts: readonly string[]): boolean {
  const needle = q?.trim().toLowerCase();
  if (!needle) return true;
  return texts.some((text) => text.toLowerCase().includes(needle));
}
