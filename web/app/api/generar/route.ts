import { NextRequest, NextResponse } from "next/server";
import { parseXlsx } from "@/lib/parseXlsx";
import { buildPdf } from "@/lib/buildPdf";
import { saveLatestList } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("archivo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      return NextResponse.json({ error: "El archivo debe ser .xlsx o .xls" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const data = parseXlsx(buffer);
    saveLatestList(data);
    const pdfBuffer = await buildPdf(data);

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Lista_de_Precios_Carnes_Premium.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al procesar el archivo" }, { status: 500 });
  }
}
