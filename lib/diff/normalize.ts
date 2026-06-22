import { EXCEL_ERROR_VALUES } from "./constants";

export function normHeader(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim().toUpperCase().replace(/\s+/g, " ");
}

export function normVal(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" && Number.isNaN(v)) return "";
  let s = String(v).trim();
  const lower = s.toLowerCase();
  if (lower === "nan" || lower === "none" || lower === "<na>" || lower === "nat") return "";
  if (EXCEL_ERROR_VALUES.has(s)) return "";
  // Strip trailing .0 from numeric coercion ("12345.0" -> "12345")
  if (s.endsWith(".0")) {
    const core = s.slice(0, -2);
    if (/^-?\d+$/.test(core)) s = core;
  }
  // Collapse internal whitespace
  s = s.split(/\s+/).join(" ");
  return s;
}

export function looksLikeSku(s: string): boolean {
  if (!s || s.length < 3 || s.length > 25) return false;
  if (/[\s,()/]/.test(s)) return false;
  if (!/^[A-Za-z]/.test(s)) return false;
  if (!/\d/.test(s)) return false;
  if (!/^[A-Za-z0-9.\-]+$/.test(s)) return false;
  return true;
}

export function findCol(headersNormed: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const a = normHeader(alias);
    const idx = headersNormed.indexOf(a);
    if (idx >= 0) return idx;
  }
  return -1;
}
