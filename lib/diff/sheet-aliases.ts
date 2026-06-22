import {
  Snapshot,
  STOPWORDS,
  SHEET_ALIAS_MIN_ABSOLUTE,
  SHEET_ALIAS_MIN_PROPORTION,
} from "./constants";

function tokenizeSheetName(name: string): Set<string> {
  const tokens = name
    .toLowerCase()
    .split(/[\s\-_().,]+/)
    .filter(Boolean);
  const result = new Set<string>();
  for (const t of tokens) {
    if (STOPWORDS.has(t)) continue;
    if (!t) continue;
    // Keep 4-digit year/season codes; drop other pure digits
    if (/^\d+$/.test(t) && t.length !== 4) continue;
    result.add(t);
  }
  return result;
}

function nameSimilarity(a: string, b: string): number {
  const ta = tokenizeSheetName(a);
  const tb = tokenizeSheetName(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  const intersection = [...ta].filter((x) => tb.has(x)).length;
  const union = new Set([...ta, ...tb]).size;
  return intersection / union;
}

export type AliasMap = {
  aliases: Record<string, string>; // old sheet -> canonical (new) name
  reasons: Record<string, string>;
};

export function detectSheetAliases(snapOld: Snapshot, snapNew: Snapshot): AliasMap {
  const oldSkusBySheet = new Map<string, Set<string>>();
  const newSkusBySheet = new Map<string, Set<string>>();

  for (const rec of snapOld.values()) {
    if (!oldSkusBySheet.has(rec.sheet)) oldSkusBySheet.set(rec.sheet, new Set());
    oldSkusBySheet.get(rec.sheet)!.add(rec.sku);
  }
  for (const rec of snapNew.values()) {
    if (!newSkusBySheet.has(rec.sheet)) newSkusBySheet.set(rec.sheet, new Set());
    newSkusBySheet.get(rec.sheet)!.add(rec.sku);
  }

  const aliases: Record<string, string> = {};
  const reasons: Record<string, string> = {};
  const usedNew = new Set<string>();

  // Pass 1: exact-name match
  for (const o of oldSkusBySheet.keys()) {
    if (newSkusBySheet.has(o)) {
      aliases[o] = o;
      usedNew.add(o);
    }
  }

  // Pass 2: hybrid SKU + name similarity
  for (const [oSheet, oSkus] of oldSkusBySheet) {
    if (oSheet in aliases) continue;
    let bestN: string | null = null;
    let bestTotal = 0;
    let bestReason = "";

    for (const [nSheet, nSkus] of newSkusBySheet) {
      if (usedNew.has(nSheet)) continue;
      const overlap = [...oSkus].filter((s) => nSkus.has(s)).length;
      const minSize = Math.min(oSkus.size, nSkus.size);
      const skuScore = minSize > 0 ? overlap / minSize : 0;
      const nameScore = nameSimilarity(oSheet, nSheet);

      let accepts = false;
      let reason = "";

      if (overlap >= SHEET_ALIAS_MIN_ABSOLUTE && skuScore >= SHEET_ALIAS_MIN_PROPORTION) {
        accepts = true;
        reason = `sku overlap ${overlap}/${minSize} (${Math.round(skuScore * 100)}%)`;
      } else if (nameScore >= 0.4 && overlap >= 3) {
        accepts = true;
        reason = `name sim ${Math.round(nameScore * 100)}% + ${overlap} SKU overlap`;
      } else if (nameScore >= 0.6 && overlap >= 1) {
        accepts = true;
        reason = `name sim ${Math.round(nameScore * 100)}% + ${overlap} SKU overlap`;
      }

      if (accepts) {
        const total = skuScore + nameScore;
        if (total > bestTotal) {
          bestTotal = total;
          bestN = nSheet;
          bestReason = reason;
        }
      }
    }

    if (bestN) {
      aliases[oSheet] = bestN;
      reasons[oSheet] = bestReason;
      usedNew.add(bestN);
    }
  }

  return { aliases, reasons };
}

export function applySheetAliases(
  snapOld: Snapshot,
  aliases: Record<string, string>
): Snapshot {
  const out: Snapshot = new Map();
  for (const [key, rec] of snapOld) {
    const canonical = aliases[rec.sheet] ?? rec.sheet;
    const newRec = { ...rec, sheet: canonical, original_sheet: rec.sheet };
    const newKey = `${rec.sku}|${canonical}|${rec["Colour Name"] ?? ""}`;
    if (!out.has(newKey)) out.set(newKey, newRec);
  }
  return out;
}
