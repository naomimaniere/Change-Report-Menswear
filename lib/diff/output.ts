import * as XLSX from "xlsx-js-style";
import { ChangeRow } from "./constants";

const TYPE_ORDER: Record<string, number> = {
  Added: 1,
  Cancelled: 2,
  Removed: 3,
  "Moved Release": 4,
  "Product Name Change": 5,
  "Colour Change": 6,
  "Fabric Change": 7,
  "Supplier Change": 8,
  "PO Number Change": 9,
};

const TYPE_FILL_HEX: Record<string, string> = {
  Added: "D6EBD6",
  Cancelled: "F5D6D6",
  Removed: "F5D6D6",
  "Moved Release": "D6E4F5",
  "Product Name Change": "FFF1CC",
  "Colour Change": "FFE0CC",
  "Fabric Change": "FFE9F0",
  "Supplier Change": "E8DDF5",
  "PO Number Change": "E5E5E5",
};

const COLS: (keyof ChangeRow)[] = [
  "SKU",
  "Product Name",
  "Change Type",
  "Field",
  "Old Value",
  "New Value",
  "Old Sheet",
  "New Sheet",
  "Colour",
  "Supplier",
];

const COL_WIDTHS = [16, 38, 22, 26, 45, 45, 32, 32, 18, 30];

export function buildOutputWorkbook(
  rows: ChangeRow[],
  oldLabel: string,
  newLabel: string,
  aliases: Record<string, string>
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const sortedRows = [...rows].sort((a, b) => {
    const ao = TYPE_ORDER[a["Change Type"]] ?? 99;
    const bo = TYPE_ORDER[b["Change Type"]] ?? 99;
    if (ao !== bo) return ao - bo;
    if (a.SKU !== b.SKU) return a.SKU.localeCompare(b.SKU);
    return a.Field.localeCompare(b.Field);
  });

  const renamed = Object.entries(aliases).filter(([o, n]) => o !== n);
  const headerRow = renamed.length > 0 ? 5 : 4; // 1-indexed; data row starts here

  // Build the sheet's aoa (array of arrays) - we'll then apply styling cell by cell
  const aoa: any[][] = [];

  // Row 1 (title)
  aoa.push(["Menswear Change Log", ...Array(COLS.length - 1).fill("")]);
  // Row 2 (subtitle: file comparison)
  aoa.push([
    `Comparing  BASELINE: ${oldLabel}   vs   NEW: ${newLabel}`,
    ...Array(COLS.length - 1).fill(""),
  ]);
  // Row 3 (optional: renames)
  if (renamed.length > 0) {
    const renameText = renamed.map(([o, n]) => `"${o}" → "${n}"`).join("  ·  ");
    aoa.push([
      `Auto-detected sheet renames (not flagged as moves): ${renameText}`,
      ...Array(COLS.length - 1).fill(""),
    ]);
  }
  // Blank row
  aoa.push(Array(COLS.length).fill(""));
  // Header row
  aoa.push([...COLS]);
  // Data rows
  for (const r of sortedRows) {
    aoa.push(COLS.map((c) => r[c] ?? ""));
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws["!cols"] = COL_WIDTHS.map((w) => ({ wch: w }));

  // Merge title rows across all columns
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: COLS.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: COLS.length - 1 } },
  ];
  if (renamed.length > 0) {
    ws["!merges"].push({ s: { r: 2, c: 0 }, e: { r: 2, c: COLS.length - 1 } });
  }

  const thin = { style: "thin", color: { rgb: "C8C8C8" } };
  const cellBorder = { left: thin, right: thin, top: thin, bottom: thin };

  // Title styling
  const titleCellRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[titleCellRef]) {
    ws[titleCellRef].s = {
      font: { name: "Arial", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2F2F2F" } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }
  const subtitleCellRef = XLSX.utils.encode_cell({ r: 1, c: 0 });
  if (ws[subtitleCellRef]) {
    ws[subtitleCellRef].s = {
      font: { name: "Arial", sz: 10, italic: true, color: { rgb: "555555" } },
    };
  }
  if (renamed.length > 0) {
    const renameRef = XLSX.utils.encode_cell({ r: 2, c: 0 });
    if (ws[renameRef]) {
      ws[renameRef].s = {
        font: { name: "Arial", sz: 9, italic: true, color: { rgb: "777777" } },
      };
    }
  }

  // Header styling
  const headerRowIdx = headerRow - 1; // 0-indexed
  for (let c = 0; c < COLS.length; c++) {
    const ref = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    if (ws[ref]) {
      ws[ref].s = {
        font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4A4A4A" } },
        alignment: { horizontal: "left", vertical: "center", wrapText: true },
        border: cellBorder,
      };
    }
  }

  // Body styling
  for (let i = 0; i < sortedRows.length; i++) {
    const rowOffset = headerRowIdx + 1 + i;
    const row = sortedRows[i];
    for (let c = 0; c < COLS.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: rowOffset, c });
      if (!ws[ref]) continue;
      const baseStyle: any = {
        font: { name: "Arial", sz: 10 },
        alignment: { horizontal: "left", vertical: "top", wrapText: true },
        border: cellBorder,
      };
      // Change Type column gets the type-specific fill + bold
      if (c === 2) {
        const fillHex = TYPE_FILL_HEX[row["Change Type"]];
        if (fillHex) baseStyle.fill = { fgColor: { rgb: fillHex } };
        baseStyle.font = { ...baseStyle.font, bold: true };
      }
      ws[ref].s = baseStyle;
    }
  }

  // Freeze panes (under header)
  ws["!freeze"] = { xSplit: 0, ySplit: headerRow };
  // Pretty rows
  ws["!rows"] = [{ hpt: 22 }];
  if (renamed.length > 0) ws["!rows"].push({}, {}, { hpt: 16 });

  // Autofilter
  const lastDataRow = headerRowIdx + sortedRows.length;
  const lastColLetter = XLSX.utils.encode_col(COLS.length - 1);
  ws["!autofilter"] = {
    ref: `A${headerRow}:${lastColLetter}${Math.max(lastDataRow + 1, headerRow + 1)}`,
  };

  XLSX.utils.book_append_sheet(wb, ws, "Change Log");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return wbout;
}
