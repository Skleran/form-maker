// Spreadsheets run a cell starting with these as a formula. Plain numbers and phone numbers are safe to leave.
const FORMULA_PREFIX = /^[=+\-@\t\r]/
const NUMBER_LIKE = /^[+-]?[\d\s().-]+$/

/**
 * Escapes a value as an RFC 4180 CSV cell, and stops answers from running as spreadsheet formulas.
 */
export function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '""'
  const str = String(value)
  const safe = FORMULA_PREFIX.test(str) && !NUMBER_LIKE.test(str) ? `'${str}` : str
  return `"${safe.replace(/"/g, '""')}"`
}
