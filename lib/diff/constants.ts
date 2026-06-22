// Field name -> list of acceptable header aliases (case-insensitive)
export const FIELD_ALIASES: Record<string, string[]> = {
  SKU: ["SKU", "Parent SKU"],
  "Product Name": ["PRODUCT NAME", "NAME"],
  "Revised Product Name": ["REVISED PRODUCT NAME"],
  "Colour Name": ["COLOUR NAME", "COLOUR", "COLOR NAME", "COLOR"],
  Supplier: ["SUPPLIER"],
  "PO Number": ["PO NUMBER", "PO#", "PO"],
  "MBF Fabric Code/Colour": ["MBF FABRIC CODE / COLOUR", "MBF FABRIC CODE/COLOUR"],
  "MBF Fabric Comp": ["MBF FABRIC COMP"],
  "Contrast Fabric Code/Colour": [
    "CONTRAST FABRIC CODE / COLOUR",
    "CONTRAST FABRIC CODE/COLOUR",
  ],
  "Contrast Fabric Comp": ["CONTRAST FABRIC COMP"],
  "Lining Fabric Code/Colour": [
    "LINING FABRIC CODE / COLOUR",
    "LINING FABRIC CODE/COLOUR",
    "LIINING FABRIC CODE / COLOUR",
  ],
  "Lining Fabric Comp": ["LINING FABRIC COMP", "LIINING FABRIC COMP"],
};

export const COMPARED_FIELDS = [
  "Product Name",
  "Revised Product Name",
  "Colour Name",
  "Supplier",
  "PO Number",
  "MBF Fabric Code/Colour",
  "MBF Fabric Comp",
  "Contrast Fabric Code/Colour",
  "Contrast Fabric Comp",
  "Lining Fabric Code/Colour",
  "Lining Fabric Comp",
] as const;

export const CHANGE_TYPE_FOR_FIELD: Record<string, string> = {
  "Product Name": "Product Name Change",
  "Revised Product Name": "Product Name Change",
  "Colour Name": "Colour Change",
  Supplier: "Supplier Change",
  "PO Number": "PO Number Change",
  "MBF Fabric Code/Colour": "Fabric Change",
  "MBF Fabric Comp": "Fabric Change",
  "Contrast Fabric Code/Colour": "Fabric Change",
  "Contrast Fabric Comp": "Fabric Change",
  "Lining Fabric Code/Colour": "Fabric Change",
  "Lining Fabric Comp": "Fabric Change",
};

export const EXCEL_ERROR_VALUES = new Set([
  "#REF!",
  "#N/A",
  "#NAME?",
  "#DIV/0!",
  "#VALUE!",
  "#NULL!",
  "#NUM!",
  "#GETTING_DATA",
]);

export const NON_PRODUCT_SHEETS = new Set([
  "pricing matrix",
  "suppliers",
  "freight",
  "template",
  "production tracker",
  "return updates",
  "next sku",
  "restock checks",
  "_lookups",
  "__mdv_change_snapshot",
]);

export const SKIP_SHEET_PATTERNS = [
  "sheet1", "sheet2", "sheet3", "sheet4", "sheet5",
  "sheet6", "sheet7", "sheet8", "sheet9", "sheet10",
  "sheet11", "sheet12", "sheet13", "sheet14", "sheet15",
  "sheet16", "sheet17", "sheet18", "sheet19", "sheet20",
];

export const STOPWORDS = new Set([
  "selling", "the", "and", "of", "for", "a", "an", "to", "in", "on",
  "with", "pt1", "pt2", "part", "1", "2", "3",
]);

export const SHEET_ALIAS_MIN_ABSOLUTE = 5;
export const SHEET_ALIAS_MIN_PROPORTION = 0.6;

export type ChangeRow = {
  SKU: string;
  "Product Name": string;
  "Change Type": string;
  Field: string;
  "Old Value": string;
  "New Value": string;
  "Old Sheet": string;
  "New Sheet": string;
  Colour: string;
  Supplier: string;
};

export type Record_ = {
  sku: string;
  sheet: string;
  row_idx: number;
  _missing_fields: Set<string>;
  original_sheet?: string;
  [key: string]: any;
};

export type Snapshot = Map<string, Record_>; // composite key "sku|sheet|colour" -> record
