import PDFDocument from "pdfkit";
import { PriceList, Item } from "./parseXlsx";

const C_BLACK  = "#1A1A1A";
const C_GRAY   = "#888888";
const C_LGRAY  = "#F7F7F7";
const C_RULE   = "#CCCCCC";
const C_ACCENT = "#4A6B8B";
const C_ORANGE = "#B87333";

const PAGE_W    = 595.28;
const PAGE_H    = 841.89;
const MARGIN    = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

const CONTENT_START = 44;
const CONTENT_END   = 800;

const COL_CODE  = 42;
const COL_UNIT  = 52;
const COL_PRICE = 108;
const COL_NAME  = CONTENT_W - COL_CODE - COL_PRICE - COL_UNIT;

const ROW_H   = 17;
const GAP_SUB = 10;
const GAP_CAT = 14;

function hRule(doc: PDFKit.PDFDocument, y: number, color = C_RULE) {
  doc.save()
    .moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y)
    .lineWidth(0.5).strokeColor(color).stroke()
    .restore();
}

function renderHeader(doc: PDFKit.PDFDocument) {
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C_BLACK)
    .text("CARNES PREMIUM", MARGIN, 18, { width: CONTENT_W, align: "center" });
  hRule(doc, 30);
}

function renderFooter(doc: PDFKit.PDFDocument, date: string, page: number, total: number) {
  hRule(doc, PAGE_H - 38);
  doc.font("Helvetica").fontSize(7.5).fillColor(C_GRAY)
    .text(
      `Emitido: ${date}  ·  Precios sujetos a modificación sin previo aviso  ·  Página ${page} de ${total}`,
      MARGIN, PAGE_H - 28, { width: CONTENT_W, align: "center" }
    );
}

function renderItemRow(doc: PDFKit.PDFDocument, item: Item, y: number, odd: boolean) {
  if (odd) {
    doc.save().rect(MARGIN, y, CONTENT_W, ROW_H).fill(C_LGRAY).restore();
  }

  const textY = y + (ROW_H - 8) / 2 + 0.5;
  const x0 = MARGIN + 3;

  doc.font("Helvetica").fontSize(7.5).fillColor(C_GRAY)
    .text(item.code, x0, textY, { width: COL_CODE - 4, lineBreak: false });

  doc.font("Helvetica").fontSize(8.5).fillColor(C_BLACK)
    .text(item.name, x0 + COL_CODE, textY, { width: COL_NAME - 6, lineBreak: false });

  const priceX = MARGIN + COL_CODE + COL_NAME;
  if (item.isConsultar) {
    doc.font("Helvetica-BoldOblique").fontSize(8).fillColor(C_ORANGE)
      .text("Consultar", priceX, textY, { width: COL_PRICE - 4, align: "right", lineBreak: false });
  } else {
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C_BLACK)
      .text(item.price, priceX, textY, { width: COL_PRICE - 4, align: "right", lineBreak: false });
  }

  doc.font("Helvetica").fontSize(7.5).fillColor(C_GRAY)
    .text(item.unit, priceX + COL_PRICE, textY, { width: COL_UNIT - 2, lineBreak: false });
}

export async function buildPdf(data: PriceList): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      autoFirstPage: false,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    function addPage(): number {
      doc.addPage();
      renderHeader(doc);
      return CONTENT_START;
    }

    // ── Page 1: cover + disclaimer + index + content start ──────────────────
    doc.addPage();
    renderHeader(doc);

    // Cover box
    const boxX = MARGIN + 15;
    const boxW = CONTENT_W - 30;
    const boxH = 86;
    const boxY = CONTENT_START + 2;

    doc.save()
      .roundedRect(boxX, boxY, boxW, boxH, 5)
      .lineWidth(1).strokeColor(C_RULE).stroke()
      .restore();

    doc.font("Helvetica-Bold").fontSize(30).fillColor(C_BLACK)
      .text("CARNES PREMIUM", boxX, boxY + 10, { width: boxW, align: "center" });
    doc.font("Helvetica-Oblique").fontSize(12).fillColor(C_GRAY)
      .text("Lista de Precios · Venta Local", boxX, boxY + 46, { width: boxW, align: "center" });
    doc.font("Helvetica").fontSize(9).fillColor(C_GRAY)
      .text("AVICAM", boxX, boxY + 66, { width: boxW, align: "center" });

    let y = boxY + boxH + 18;

    // Disclaimer
    doc.font("Helvetica-Oblique").fontSize(8).fillColor(C_GRAY)
      .text(
        `Todos los precios incluyen IVA · Sujetos a modificación sin previo aviso · "Consultar" indica precio a definir con el sector`,
        MARGIN, y, { width: CONTENT_W, align: "center" }
      );
    y += 22;

    // Index
    doc.font("Helvetica-Bold").fontSize(13).fillColor(C_BLACK)
      .text("Índice de Categorías", MARGIN, y, { width: CONTENT_W, align: "center" });
    y += 18;
    hRule(doc, y);
    y += 12;

    for (const cat of data.categories) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(C_BLACK)
        .text(cat.name, MARGIN, y);
      y += 13;
      const subNames = cat.subcategories.map((s) => s.name).join(" · ");
      doc.font("Helvetica-Oblique").fontSize(8).fillColor(C_ACCENT)
        .text(subNames, MARGIN, y, { width: CONTENT_W });
      y += doc.heightOfString(subNames, { width: CONTENT_W }) + 5;
    }

    y += 8;
    hRule(doc, y);
    y += 16;

    // ── Content: categories ──────────────────────────────────────────────────
    for (const cat of data.categories) {
      if (y + 50 > CONTENT_END) {
        y = addPage();
      }

      doc.font("Helvetica-Bold").fontSize(11).fillColor(C_BLACK)
        .text(cat.name, MARGIN, y);
      y += 16;
      hRule(doc, y);
      y += 12;

      for (const sub of cat.subcategories) {
        if (y + ROW_H * 2 + 16 > CONTENT_END) {
          y = addPage();
        }

        doc.font("Helvetica-Oblique").fontSize(9).fillColor(C_ACCENT)
          .text(sub.name, MARGIN + 2, y);
        y += 16;

        let rowIdx = 0;
        for (const item of sub.items) {
          if (y + ROW_H > CONTENT_END) {
            y = addPage();
            rowIdx = 0;
          }
          renderItemRow(doc, item, y, rowIdx % 2 === 1);
          y += ROW_H;
          rowIdx++;
        }
        y += GAP_SUB;
      }
      y += GAP_CAT;
    }

    // ── Stamp footers on all pages ───────────────────────────────────────────
    const range = doc.bufferedPageRange();
    const total = range.count;
    for (let i = 0; i < total; i++) {
      doc.switchToPage(range.start + i);
      renderFooter(doc, data.date, i + 1, total);
    }

    doc.flushPages();
    doc.end();
  });
}
