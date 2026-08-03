import * as XLSX from "xlsx";

export interface Item {
  code: string;
  name: string;
  price: string;
  unit: string;
  isConsultar: boolean;
}

export interface Subcategory {
  name: string;
  items: Item[];
}

export interface Category {
  name: string;
  subcategories: Subcategory[];
}

export interface PriceList {
  date: string;
  categories: Category[];
}

// Maps (xlsxSection, xlsxSubsection|null) -> [pdfMain, pdfSub, mainOrder, subOrder]
const MAPPING: Record<string, [string, string, number, number]> = {
  "ACHURAS|FRESCAS":               ["ACHURAS", "Frescas", 4, 1],
  "ACHURAS|PREPARADAS":            ["ACHURAS", "Preparadas", 4, 2],
  "AUTOSERVICIO|null":             ["AUTOSERVICIO Y ALMACÉN", "__auto__", 9, 0],
  "AUTOSERVICIO|CARNE VACUNA":     ["CARNE VACUNA", "Cortes Envasados al Vacío Premium", 1, 3],
  "AUTOSERVICIO|PESCADOS Y MARISCOS": ["PESCADOS Y MARISCOS", "Pescados y Mariscos", 6, 1],
  "AUTOSERVICIO|REBOZADOS":        ["REBOZADOS", "__rebozados_auto__", 8, 0],
  "AUTOSERVICIO|ALMACEN":          ["AUTOSERVICIO Y ALMACÉN", "Almacén", 9, 5],
  "CARNE AVIAR|BOLSAS FIL.PM/PE":  ["CARNE AVIAR (POLLO)", "Bolsas y Filet", 3, 2],
  "CARNE AVIAR|CAJA FILET":        ["CARNE AVIAR (POLLO)", "Cajas y Cajones", 3, 3],
  "CARNE AVIAR|CAJA PATA MUSLO":   ["CARNE AVIAR (POLLO)", "Cajas y Cajones", 3, 3],
  "CARNE AVIAR|CAJON ALITAS":      ["CARNE AVIAR (POLLO)", "Cajas y Cajones", 3, 3],
  "CARNE AVIAR|CAJON POLLO":       ["CARNE AVIAR (POLLO)", "Cajas y Cajones", 3, 3],
  "CARNE AVIAR|POLLOS":            ["CARNE AVIAR (POLLO)", "Pollo", 3, 1],
  "CARNE PORCINA|CORTES CERDO":    ["CARNE PORCINA", "Cortes de Cerdo", 2, 1],
  "CARNE VACUNA|CORTES ENV.PREMIUN": ["CARNE VACUNA", "Cortes Envasados al Vacío Premium", 1, 3],
  "CARNE VACUNA|CORTES ENVASADOS": ["CARNE VACUNA", "Cortes Envasados", 1, 4],
  "CARNE VACUNA|CORTES MAYORISTA": ["CARNE VACUNA", "Cortes Mayorista", 1, 5],
  "CARNE VACUNA|CORTES NOVILLO":   ["CARNE VACUNA", "Cortes de Novillo", 1, 2],
  "CARNE VACUNA|CORTES TERNERA":   ["CARNE VACUNA", "Cortes de Ternera", 1, 1],
  "CARNE VACUNA|SUBPRODUCTO TERNERA": ["CARNE VACUNA", "Subproductos", 1, 6],
  "CHACINADOS|EMBUTIDOS":          ["CHACINADOS", "Embutidos", 5, 1],
  "CHACINADOS|NO EMBUTIDOS":       ["CHACINADOS", "No Embutidos", 5, 2],
  "ELABORADOS|BOLSAS ELABORADOS":  ["ELABORADOS", "Paquetes", 7, 2],
  "ELABORADOS|CAJAS ELABORADOS":   ["ELABORADOS", "Cajas", 7, 3],
  "ELABORADOS|EN PLANTA":          ["ELABORADOS", "En Planta", 7, 1],
  "ELABORADOS|PAQUETE ELABORADOS": ["ELABORADOS", "Paquetes", 7, 2],
  "REBOZADOS|BANDEJAS REBOZADOS":  ["REBOZADOS", "Bandejas", 8, 1],
  "REBOZADOS|BOLSAS REBOZADOS":    ["REBOZADOS", "Bolsas", 8, 2],
  "REBOZADOS|CAJAS REBOZADOS":     ["REBOZADOS", "Cajas", 8, 3],
};

const MAIN_CATEGORIES = new Set([
  "ACHURAS", "CARNE AVIAR", "CARNE PORCINA", "CARNE VACUNA",
  "CHACINADOS", "ELABORADOS", "REBOZADOS",
]);

const AUTO_SUBSECTIONS = new Set([
  "CARNE VACUNA", "PESCADOS Y MARISCOS", "REBOZADOS", "ALMACEN",
]);

// Keyword classification for bare AUTOSERVICIO items
const AUTO_SUBCAT_KEYWORDS: [string, string[]][] = [
  ["Congelados y Precocidos", ["PAPA", "FRY ESSENTIALS", "GREEN LIFE", "MEDALLON VEGG", "LAMWESTON", "BUTLER", "RAPIPAP"]],
  ["Pastas",                  ["FIDEO", "ÑOQUI", "RAVIOLE", "SORRENTINO"]],
  ["Empanadas y Tartas",      ["EMPANADA", "TARTA"]],
  ["Fiambres y Embutidos",    ["FIAMBRE", "MORTADELA", "SALCHICHON", "SALCHICH", "QUESO DE CERDO"]],
];

function classifyAuto(name: string): string {
  const upper = name.toUpperCase();
  for (const [cat, keywords] of AUTO_SUBCAT_KEYWORDS) {
    if (keywords.some((k) => upper.includes(k))) return cat;
  }
  return "Almacén";
}

function classifyRebozadosAuto(name: string): string {
  const upper = name.toUpperCase();
  // Bandejas = sold by kg bulk; Bolsas = individual packaged
  const bandejas = ["REBOZADOS X KG", "TIRITAS", "BOCADITOS", "X 1KG CALISA", "X 1kG CALISA"];
  if (bandejas.some((k) => upper.includes(k.toUpperCase()))) return "Bandejas";
  return "Bolsas";
}

function parseCode(raw: string): string {
  const m = raw.match(/\(\s*([^)]+)\s*\)/);
  return m ? m[1].trim().replace(/^0+(?=\d{4,})/, "") : "";
}

function cleanName(raw: string): string {
  // Remove code prefix like (00084) or (285)
  let name = raw.replace(/^\s*\([^)]+\)\s*/, "").trim();

  // Remove trailing unit patterns (xKG, X KG, xUNID, etc.)
  name = name.replace(/\s+[xX]\s*[Kk][Gg]\s*$/i, "").trim();
  name = name.replace(/\s+[xX]\s*[Uu][Nn][Ii][Dd](?:ad(?:es)?)?\s*$/i, "").trim();
  name = name.replace(/\s+[xX][Kk][Gg]\s*$/i, "").trim();

  // Expand common abbreviations before title-casing
  name = name
    .replace(/\bC\/H\b/gi, "con Hueso")
    .replace(/\bS\/H\b/gi, "sin Hueso")
    .replace(/\bT\.ENV\b/gi, "Ternera Envasada")
    .replace(/\bENV\.?\b/gi, "Envasada")
    .replace(/\bPREMIUN\b/gi, "Premium")
    .replace(/\bxKG\b/gi, "")
    .replace(/\bX KG\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Title case
  const lowercase = new Set(["de", "del", "la", "el", "los", "las", "y", "a", "en", "con", "sin", "para", "por", "al"]);
  name = name
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      if (i === 0 || !lowercase.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(" ");

  return name;
}

function parsePrice(raw: string): { price: string; unit: string; isConsultar: boolean } {
  // raw: "$ 7.100,00 x kg" or "$ 1,00 x kg"
  const parts = raw.trim().split(/\s+x\s+/i);
  const priceStr = parts[0]?.trim() ?? "";
  const unitRaw = parts[1]?.trim() ?? "kg";

  // Determine unit display
  let unit = "x Kg";
  if (/unidad/i.test(unitRaw)) unit = "x Unidad";
  else if (/kg/i.test(unitRaw)) unit = "x Kg";

  // Detect consultar: price is exactly $ 1,00
  const isConsultar = /^\$\s*1,00$/.test(priceStr);

  return { price: priceStr, unit, isConsultar };
}

export function parseXlsx(buffer: Buffer): PriceList {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: (string | null)[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: false,
  }) as (string | null)[][];

  type RawItem = {
    section: string;
    subsection: string | null;
    code: string;
    name: string;
    price: string;
    unit: string;
    isConsultar: boolean;
  };

  const rawItems: RawItem[] = [];
  let section = "";
  let subsection: string | null = null;
  let insideAutoservicio = false;

  for (const row of rows) {
    const colA = row[0] ? String(row[0]).trim() : null;
    const colAI = row[34] ? String(row[34]).trim() : null;

    if (!colA) continue;

    // Skip header / separator rows
    if (colA === "All" || colA === "Producto" || colA.startsWith("Lista de P")) continue;

    if (!colAI) {
      // Section header row
      const upper = colA.toUpperCase();
      if (upper === "AUTOSERVICIO") {
        if (!insideAutoservicio) {
          section = "AUTOSERVICIO";
          insideAutoservicio = true;
        }
        subsection = null;
      } else if (insideAutoservicio && AUTO_SUBSECTIONS.has(upper)) {
        subsection = upper;
      } else if (MAIN_CATEGORIES.has(upper)) {
        section = upper;
        subsection = null;
        insideAutoservicio = false;
      } else if (section) {
        // Subsection of current main category
        subsection = colA;
      }
    } else {
      // Item row
      if (!section) continue;
      const { price, unit, isConsultar } = parsePrice(colAI);
      rawItems.push({
        section,
        subsection,
        code: parseCode(colA),
        name: cleanName(colA),
        price,
        unit,
        isConsultar,
      });
    }
  }

  // Group items into PDF categories
  // key: "mainCat|||subCat", value: { mainOrder, subOrder, items }
  const groups = new Map<string, { mainOrder: number; subOrder: number; mainCat: string; subCat: string; items: Item[] }>();

  for (const item of rawItems) {
    const subsection = item.subsection?.toUpperCase() ?? null;
    const mapKey = `${item.section}|${subsection}`;
    const mapping = MAPPING[mapKey];

    let mainCat: string;
    let subCat: string;
    let mainOrder: number;
    let subOrder: number;

    if (mapping) {
      [mainCat, subCat, mainOrder, subOrder] = mapping;

      // Handle special auto-classify cases
      if (subCat === "__auto__") {
        subCat = classifyAuto(item.name);
        // Assign subOrder for auto subcategories
        const autoOrder: Record<string, number> = {
          "Congelados y Precocidos": 1,
          "Pastas": 2,
          "Empanadas y Tartas": 3,
          "Fiambres y Embutidos": 4,
          "Almacén": 5,
        };
        subOrder = autoOrder[subCat] ?? 9;
      } else if (subCat === "__rebozados_auto__") {
        subCat = classifyRebozadosAuto(item.name);
        subOrder = subCat === "Bandejas" ? 1 : 2;
      }
    } else {
      // Unknown mapping - skip
      continue;
    }

    const groupKey = `${mainCat}|||${subCat}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, { mainOrder, subOrder, mainCat, subCat, items: [] });
    }
    groups.get(groupKey)!.items.push({
      code: item.code,
      name: item.name,
      price: item.price,
      unit: item.unit,
      isConsultar: item.isConsultar,
    });
  }

  // Sort and build final structure
  const sorted = [...groups.values()].sort((a, b) =>
    a.mainOrder !== b.mainOrder ? a.mainOrder - b.mainOrder : a.subOrder - b.subOrder
  );

  const categoryMap = new Map<string, Category>();
  for (const group of sorted) {
    if (!categoryMap.has(group.mainCat)) {
      categoryMap.set(group.mainCat, { name: group.mainCat, subcategories: [] });
    }
    const cat = categoryMap.get(group.mainCat)!;
    // Merge into existing subcategory if already exists
    const existing = cat.subcategories.find((s) => s.name === group.subCat);
    if (existing) {
      existing.items.push(...group.items);
    } else {
      cat.subcategories.push({ name: group.subCat, items: group.items });
    }
  }

  const today = new Date();
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const dateStr = `${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}`;

  return {
    date: dateStr,
    categories: [...categoryMap.values()],
  };
}
