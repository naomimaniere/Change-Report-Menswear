import * as XLSX from "xlsx";
import {
  FIELD_ALIASES,
  COMPARED_FIELDS,
  NON_PRODUCT_SHEETS,
  SKIP_SHEET_PATTERNS,
  Record_,
  Snapshot,
} from "./constants";
import { normHeader, normVal, looksLikeSku, findCol } from "./normalize";

function getCellValueAt(sheet: XLSX.WorkSheet, r: number, c: number): unknown {
  const ref = XLSX.utils.encode_cell({ r, c });
  const cell = sheet[ref];
  return cell ? cell.v : undefined;
}

function getSheetDimensions(sheet: XLSX.WorkSheet): { rows: number; cols: number } {
  if (!sheet["!ref"]) return { rows: 0, cols: 0 };
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  return { rows: range.e.r + 1, cols: range.e.c + 1 };
}

function getHeaderRow(sheet: XLSX.WorkSheet, cols: number): string[] {
  const headers: string[] = [];
  for (let c = 0; c < cols; c++) {
    headers.push(normHeader(getCellValueAt(sheet, 0, c)));
  }
  return headers;
}

export function discoverProductSheets(wb: XLSX.WorkBook): string[] {
  const candidates: string[] = [];
  for (const name of wb.SheetNames) {
    const lower = name.trim().toLowerCase();
    if (NON_PRODUCT_SHEETS.has(lower)) continue;
    if (SKIP_SHEET_PATTERNS.some((p) => lower.startsWith(p))) continue;
    candidates.push(name);
  }

  // Filter to sheets that actually have an SKU column
  const valid: string[] = [];
  for (const name of candidates) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const { rows, cols } = getSheetDimensions(sheet);
    if (rows < 2) continue;
    const headers = getHeaderRow(sheet, cols);
    if (findCol(headers, FIELD_ALIASES.SKU) >= 0) {
      valid.push(name);
    }
  }
  return valid;
}

export function buildSnapshot(wb: XLSX.WorkBook, sheets: string[]): Snapshot {
  const snapshot: Snapshot = new Map();

  for (const sheetName of sheets) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const { rows, cols } = getSheetDimensions(sheet);
    if (rows < 2) continue;

    const headers = getHeaderRow(sheet, cols);
    const colIdx: Record<string, number> = {};
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      colIdx[field] = findCol(headers, aliases);
    }

    const skuCol = colIdx.SKU;
    if (skuCol < 0) continue;

    const missing = new Set(
      COMPARED_FIELDS.filter((f) => (colIdx[f] ?? -1) < 0)
    );

    for (let r = 1; r < rows; r++) {
      const skuRaw = skuCol < cols ? getCellValueAt(sheet, r, skuCol) : undefined;
      const sku = normVal(skuRaw);
      if (!sku || !looksLikeSku(sku)) continue;

      const rec: Record_ = {
        sku,
        sheet: sheetName,
        row_idx: r,
        _missing_fields: missing,
      };
      for (const field of Object.keys(FIELD_ALIASES)) {
        const c = colIdx[field];
        rec[field] = c >= 0 && c < cols ? normVal(getCellValueAt(sheet, r, c)) : "";
      }
      const key = `${sku}|${sheetName}|${rec["Colour Name"] ?? ""}`;
      if (!snapshot.has(key)) snapshot.set(key, rec);
    }
  }

  return snapshot;
}
