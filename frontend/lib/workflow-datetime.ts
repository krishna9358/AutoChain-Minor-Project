/**
 * Bridge between workflow config (ISO 8601 strings for APIs) and <input type="datetime-local" /> (local, no TZ in value).
 */

/** Convert stored ISO / loose datetime string → `YYYY-MM-DDTHH:mm` for datetime-local input. */
export function isoToDatetimeLocalValue(stored: unknown): string {
  if (stored == null || stored === "") return "";
  const s = String(stored).trim();
  if (!s) return "";
  let normalized = s;
  if (!normalized.includes("T")) {
    normalized = normalized.replace(/^(\d{4}-\d{2}-\d{2})[ T](.+)$/, "$1T$2");
  }
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(normalized)) {
    normalized = `${normalized}Z`;
  }
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** From datetime-local value → ISO 8601 UTC string for APIs / saved config. */
export function datetimeLocalToIso(localValue: string): string {
  const t = localValue.trim();
  if (!t) return "";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}
