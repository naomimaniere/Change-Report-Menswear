import {
  Snapshot,
  Record_,
  ChangeRow,
  COMPARED_FIELDS,
  CHANGE_TYPE_FOR_FIELD,
} from "./constants";

function firstWord(s: string): string {
  if (!s) return "";
  const parts = s.split(/\s+/);
  return parts[0]?.toLowerCase() ?? "";
}

export function buildChangeLog(snapOld: Snapshot, snapNew: Snapshot): ChangeRow[] {
  // Group records by SKU
  const bySkuOld = new Map<string, Record_[]>();
  const bySkuNew = new Map<string, Record_[]>();

  for (const rec of snapOld.values()) {
    if (!bySkuOld.has(rec.sku)) bySkuOld.set(rec.sku, []);
    bySkuOld.get(rec.sku)!.push(rec);
  }
  for (const rec of snapNew.values()) {
    if (!bySkuNew.has(rec.sku)) bySkuNew.set(rec.sku, []);
    bySkuNew.get(rec.sku)!.push(rec);
  }

  const rows: ChangeRow[] = [];

  const emitFieldChanges = (o: Record_, n: Record_) => {
    if (o.sheet !== n.sheet) {
      rows.push({
        SKU: n.sku,
        "Product Name": n["Product Name"] || o["Product Name"] || "",
        "Change Type": "Moved Release",
        Field: "Sheet",
        "Old Value": o.sheet,
        "New Value": n.sheet,
        "Old Sheet": o.sheet,
        "New Sheet": n.sheet,
        Colour: n["Colour Name"] || o["Colour Name"] || "",
        Supplier: n.Supplier || o.Supplier || "",
      });
    }
    for (const field of COMPARED_FIELDS) {
      if (n._missing_fields?.has(field) || o._missing_fields?.has(field)) continue;
      const ov = o[field] ?? "";
      const nv = n[field] ?? "";
      if (ov !== nv) {
        rows.push({
          SKU: n.sku,
          "Product Name": n["Product Name"] || "",
          "Change Type": CHANGE_TYPE_FOR_FIELD[field],
          Field: field,
          "Old Value": ov,
          "New Value": nv,
          "Old Sheet": o.sheet,
          "New Sheet": n.sheet,
          Colour: n["Colour Name"] || "",
          Supplier: n.Supplier || "",
        });
      }
    }
  };

  const allSkus = new Set([...bySkuOld.keys(), ...bySkuNew.keys()]);

  for (const sku of allSkus) {
    let olds = [...(bySkuOld.get(sku) ?? [])];
    let news = [...(bySkuNew.get(sku) ?? [])];

    // Pass 1: exact (sheet, colour) match
    {
      let i = 0;
      while (i < olds.length) {
        const o = olds[i];
        const matchIdx = news.findIndex(
          (n) => n.sheet === o.sheet && (n["Colour Name"] ?? "") === (o["Colour Name"] ?? "")
        );
        if (matchIdx >= 0) {
          emitFieldChanges(o, news[matchIdx]);
          news.splice(matchIdx, 1);
          olds.splice(i, 1);
        } else {
          i++;
        }
      }
    }

    // Pass 2: same-sheet, fuzzy colour (first word)
    {
      let i = 0;
      while (i < olds.length) {
        const o = olds[i];
        const oFw = firstWord(o["Colour Name"] ?? "");
        const matchIdx = news.findIndex(
          (n) =>
            n.sheet === o.sheet &&
            oFw &&
            firstWord(n["Colour Name"] ?? "") === oFw
        );
        if (matchIdx >= 0) {
          emitFieldChanges(o, news[matchIdx]);
          news.splice(matchIdx, 1);
          olds.splice(i, 1);
        } else {
          i++;
        }
      }
    }

    // Pass 3: same-sheet, positional (sorted by original row order)
    {
      const oSheets = new Set(olds.map((r) => r.sheet));
      const nSheets = new Set(news.map((r) => r.sheet));
      const sharedSheets = [...oSheets].filter((s) => nSheets.has(s));

      for (const sheetName of sharedSheets) {
        const oIn = olds
          .filter((r) => r.sheet === sheetName)
          .sort((a, b) => (a.row_idx ?? 0) - (b.row_idx ?? 0));
        const nIn = news
          .filter((r) => r.sheet === sheetName)
          .sort((a, b) => (a.row_idx ?? 0) - (b.row_idx ?? 0));
        const pairs = Math.min(oIn.length, nIn.length);
        for (let k = 0; k < pairs; k++) {
          emitFieldChanges(oIn[k], nIn[k]);
          const oRemoveIdx = olds.indexOf(oIn[k]);
          if (oRemoveIdx >= 0) olds.splice(oRemoveIdx, 1);
          const nRemoveIdx = news.indexOf(nIn[k]);
          if (nRemoveIdx >= 0) news.splice(nRemoveIdx, 1);
        }
      }
    }

    // Pass 4: cross-sheet pairing = Moved Release
    while (olds.length > 0 && news.length > 0) {
      const o = olds[0];
      let matchIdx = news.findIndex((n) => (n["Colour Name"] ?? "") === (o["Colour Name"] ?? ""));
      if (matchIdx < 0) matchIdx = 0;
      emitFieldChanges(o, news[matchIdx]);
      news.splice(matchIdx, 1);
      olds.shift();
    }

    // Anything left in olds = Removed
    for (const o of olds) {
      rows.push({
        SKU: o.sku,
        "Product Name": o["Product Name"] || "",
        "Change Type": "Removed",
        Field: "",
        "Old Value": "",
        "New Value": "",
        "Old Sheet": (o.original_sheet ?? o.sheet) as string,
        "New Sheet": "",
        Colour: o["Colour Name"] || "",
        Supplier: o.Supplier || "",
      });
    }
    // Anything left in news = Added (or Cancelled if landed on Cancelled)
    for (const n of news) {
      const ctype = n.sheet === "Cancelled" ? "Cancelled" : "Added";
      rows.push({
        SKU: n.sku,
        "Product Name": n["Product Name"] || "",
        "Change Type": ctype,
        Field: "",
        "Old Value": "",
        "New Value": "",
        "Old Sheet": "",
        "New Sheet": n.sheet,
        Colour: n["Colour Name"] || "",
        Supplier: n.Supplier || "",
      });
    }
  }

  return rows;
}
