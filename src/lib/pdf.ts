import "server-only";
import type { Budget, Project } from "@/lib/db";
import { budgetTotals } from "@/lib/pu";

/**
 * Generador de PDF mínimo, sin dependencias (coherente con el stack: JS puro,
 * sin binarios nativos para el NAS ARM). Produce la cotización en una o más
 * páginas tamaño carta con la fuente estándar Helvetica (WinAnsi), que cubre
 * los acentos del español. No es una librería general: solo lo que la
 * cotización necesita (texto y líneas).
 */

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const money = (n: number) => mxn.format(Number.isFinite(n) ? n : 0);
const num = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 2 });

// Anchos Helvetica (por 1000 em) para los caracteres que alineamos a la derecha.
const W: Record<string, number> = { " ": 278, $: 556, ",": 278, ".": 278, "-": 333, "%": 889, "/": 278, ":": 278 };
function charW(ch: string): number {
  if (ch >= "0" && ch <= "9") return 556;
  return W[ch] ?? 500;
}
function textWidth(s: string, size: number): number {
  let w = 0;
  for (const ch of s) w += charW(ch);
  return (w / 1000) * size;
}

/** Convierte a Latin-1 (1 char = 1 byte) y escapa para una cadena literal PDF. */
function esc(s: string): string {
  let o = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    o += c <= 255 ? String.fromCharCode(c) : "?";
  }
  return o.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

class Painter {
  pages: string[] = [];
  private cur = "";
  y = 740;
  newPage() {
    if (this.cur) this.pages.push(this.cur);
    this.cur = "";
    this.y = 740;
  }
  text(x: number, y: number, size: number, str: string, bold = false) {
    this.cur += `BT /F${bold ? 2 : 1} ${size} Tf ${x} ${y} Td (${esc(str)}) Tj ET\n`;
  }
  rtext(xRight: number, y: number, size: number, str: string, bold = false) {
    this.text(xRight - textWidth(str, size), y, size, str, bold);
  }
  line(x1: number, y1: number, x2: number, y2: number) {
    this.cur += `0.5 w ${x1} ${y1} m ${x2} ${y2} l S\n`;
  }
  end(): string[] {
    if (this.cur) this.pages.push(this.cur);
    return this.pages;
  }
}

function serialize(pagesContent: string[]): Buffer {
  const pageObjNums: number[] = [];
  const contentObjs: { num: number; content: string }[] = [];
  const pageObjs: { num: number; contentNum: number }[] = [];
  let n = 5; // 1 catálogo, 2 pages, 3 Helvetica, 4 Helvetica-Bold
  for (const c of pagesContent) {
    const contentNum = n++;
    const pageNum = n++;
    contentObjs.push({ num: contentNum, content: c });
    pageObjs.push({ num: pageNum, contentNum });
    pageObjNums.push(pageNum);
  }
  const total = n - 1;
  const bodies: Record<number, string> = {
    1: `<< /Type /Catalog /Pages 2 0 R >>`,
    2: `<< /Type /Pages /Kids [${pageObjNums.map((p) => `${p} 0 R`).join(" ")}] /Count ${pageObjNums.length} >>`,
    3: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
    4: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
  };
  for (const p of pageObjs)
    bodies[p.num] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${p.contentNum} 0 R >>`;
  for (const c of contentObjs)
    bodies[c.num] = `<< /Length ${Buffer.byteLength(c.content, "latin1")} >>\nstream\n${c.content}\nendstream`;

  let pdf = `%PDF-1.4\n`;
  const offsets: number[] = [];
  for (let i = 1; i <= total; i++) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${bodies[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= total; i++)
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

/** Construye el PDF de la cotización de un presupuesto. */
export function buildCotizacionPdf(proyecto: Project, budget: Budget): Buffer {
  const t = budgetTotals(budget);
  const p = new Painter();
  p.newPage();

  // Encabezado
  p.text(56, 744, 20, "Cobalto Barroco", true);
  p.text(56, 728, 9, "Propuesta técnica y económica");
  p.rtext(556, 744, 9, `Proyecto: ${proyecto.nombre}`);
  if (budget.cliente) p.rtext(556, 732, 9, `Cliente: ${budget.cliente}`);
  p.rtext(556, 720, 9, new Date().toLocaleDateString("es-MX"));
  p.line(56, 710, 556, 710);

  const header = (yy: number) => {
    p.text(56, yy, 8, "CLAVE", true);
    p.text(100, yy, 8, "CONCEPTO", true);
    p.rtext(350, yy, 8, "UNIDAD", true);
    p.rtext(420, yy, 8, "CANT.", true);
    p.rtext(490, yy, 8, "P.U.", true);
    p.rtext(556, yy, 8, "IMPORTE", true);
    p.line(56, yy - 4, 556, yy - 4);
  };
  header(694);
  let y = 678;
  for (const l of budget.lineas) {
    if (y < 96) {
      p.newPage();
      header(730);
      y = 714;
    }
    p.text(56, y, 8.5, l.clave || "-");
    p.text(100, y, 8.5, trunc(l.concepto || l.descripcion || "", 56));
    p.rtext(350, y, 8.5, l.unidad || "");
    p.rtext(420, y, 8.5, num(l.cantidad));
    p.rtext(490, y, 8.5, money(l.pu));
    p.rtext(556, y, 8.5, money(l.pu * l.cantidad));
    y -= 16;
  }
  p.line(56, y + 4, 556, y + 4);
  y -= 16;
  p.rtext(490, y, 9, "Subtotal");
  p.rtext(556, y, 9, money(t.subtotal));
  y -= 14;
  p.rtext(490, y, 9, `IVA ${(budget.factorIva * 100).toFixed(0)}%`);
  p.rtext(556, y, 9, money(t.iva));
  y -= 18;
  p.rtext(490, y, 11, "TOTAL", true);
  p.rtext(556, y, 11, money(t.total), true);
  y -= 28;
  p.text(56, Math.max(y, 60), 8, "El presupuesto tiene una vigencia de 15 días. Precios en pesos mexicanos (MXN).");

  return serialize(p.end());
}
