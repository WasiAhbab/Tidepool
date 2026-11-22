export const csvCell = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString() : String(v ?? '')
  return '"' + (/^[\s]*[=+@-]|^[\t\r\n]/.test(s) ? "'" : '') + s.replaceAll('"', '""') + '"'
}
