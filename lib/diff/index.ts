import * as XLSX from "xlsx";
import { discoverProductSheets, buildSnapshot } from "./snapshot";
import { detectSheetAliases, applySheetAliases } from "./sheet-aliases";
import { buildChangeLog } from "./change-log";
import { buildOutputWorkbook } from "./output";
import { ChangeRow } from "./constants";

export type DiffResult = {
  rows: ChangeRow[];
  countsByType: Record<string, number>;
  aliases: Record<string, string>;
  reasons: Record<string, string>;
  oldSheetCount: number;
  newSheetCount: number;
  oldRecordCount: number;
  newRecordCount: number;
};

/**
 * Run the full diff between two workbook ArrayBuffers.
 * Returns analysis + the formatted output XLSX as ArrayBuffer.
 */
export function runDiff(
  oldBuffer: ArrayBuffer,
  newBuffer: ArrayBuffer,
  oldLabel: string,
  newLabel: string
): { result: DiffResult; outputXlsx: ArrayBuffer } {
  // Parse workbooks (cellStyles:false speeds parsing of huge formatted files)
  const wbOld = XLSX.read(oldBuffer, { type: "array", cellStyles: false, cellDates: false });
  const wbNew = XLSX.read(newBuffer, { type: "array", cellStyles: false, cellDates: false });

  const oldSheets = discoverProductSheets(wbOld);
  const newSheets = discoverProductSheets(wbNew);

  const snapOld = buildSnapshot(wbOld, oldSheets);
  const snapNew = buildSnapshot(wbNew, newSheets);

  const { aliases, reasons } = detectSheetAliases(snapOld, snapNew);
  const snapOldAliased = applySheetAliases(snapOld, aliases);

  const rows = buildChangeLog(snapOldAliased, snapNew);

  const countsByType: Record<string, number> = {};
  for (const r of rows) {
    countsByType[r["Change Type"]] = (countsByType[r["Change Type"]] ?? 0) + 1;
  }

  const outputXlsx = buildOutputWorkbook(rows, oldLabel, newLabel, aliases);

  return {
    result: {
      rows,
      countsByType,
      aliases,
      reasons,
      oldSheetCount: oldSheets.length,
      newSheetCount: newSheets.length,
      oldRecordCount: snapOld.size,
      newRecordCount: snapNew.size,
    },
    outputXlsx,
  };
}
