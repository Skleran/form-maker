/**
 * Folds text for Turkish-aware matching: plain toLowerCase turns "I" into "i" and misses "ı",
 * and a Turkish lowercase alone would stop "it" from matching "IT".
 */
export function normalizeSearchText(text: string): string {
  return text.trim().toLocaleLowerCase("tr").replace(/ı/g, "i")
}
