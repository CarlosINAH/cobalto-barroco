import "server-only";
import type { Budget, Project } from "@/lib/db";
import { LOGO_JPEG_B64, LOGO_W, LOGO_H } from "@/lib/constancia-logo";

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
// Puntuación Unicode común → su byte en WinAnsi (CP1252).
const WINANSI: Record<number, number> = {
  0x2013: 0x96, 0x2014: 0x97, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2026: 0x85,
  0x20ac: 0x80, 0x2122: 0x99, 0x00a0: 0x20,
};
function esc(s: string): string {
  let o = "";
  for (const ch of s) {
    let c = ch.codePointAt(0)!;
    if (c > 255) c = WINANSI[c] ?? 0x3f; // 0x3f = "?"
    o += String.fromCharCode(c);
  }
  return o.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** #RRGGBB → [r,g,b] en 0..1. */
function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}
const f3 = (n: number) => n.toFixed(3);

/** Dimensiones de un JPEG baseline (lee el marcador SOF). */
function parseJpegDims(buf: Buffer): { iw: number; ih: number } {
  let i = 2;
  while (i < buf.length - 8) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { ih: (buf[i + 5] << 8) | buf[i + 6], iw: (buf[i + 7] << 8) | buf[i + 8] };
    }
    i += 2 + ((buf[i + 2] << 8) | buf[i + 3]);
  }
  return { iw: 1, ih: 1 };
}

interface DocImage { name: string; b64: string; w: number; h: number }

class Painter {
  pages: string[] = [];
  images: DocImage[] = [];
  private cur = "";
  private imgSeq = 0;
  y = 740;
  newPage() {
    if (this.cur) this.pages.push(this.cur);
    this.cur = "";
    this.y = 740;
  }
  text(x: number, y: number, size: number, str: string, bold = false, color = "#000000") {
    const [r, g, b] = rgb(color);
    this.cur += `${f3(r)} ${f3(g)} ${f3(b)} rg BT /F${bold ? 2 : 1} ${size} Tf ${x} ${y} Td (${esc(str)}) Tj ET\n`;
  }
  rtext(xRight: number, y: number, size: number, str: string, bold = false, color = "#000000") {
    this.text(xRight - textWidth(str, size), y, size, str, bold, color);
  }
  ctext(xCenter: number, y: number, size: number, str: string, bold = false, color = "#000000") {
    this.text(xCenter - textWidth(str, size) / 2, y, size, str, bold, color);
  }
  line(x1: number, y1: number, x2: number, y2: number, color = "#000000", w = 0.5) {
    const [r, g, b] = rgb(color);
    this.cur += `${f3(r)} ${f3(g)} ${f3(b)} RG ${w} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
  }
  rect(x: number, y: number, w: number, h: number, color: string) {
    const [r, g, b] = rgb(color);
    this.cur += `${f3(r)} ${f3(g)} ${f3(b)} rg ${x} ${y} ${w} ${h} re f\n`;
  }
  /** Dibuja un JPEG (base64) escalado a w×h con esquina inferior-izq en (x,y). */
  image(b64: string, x: number, y: number, w: number, h: number) {
    const { iw, ih } = parseJpegDims(Buffer.from(b64, "base64"));
    const name = `Im${++this.imgSeq}`;
    this.images.push({ name, b64, w: iw, h: ih });
    this.cur += `q ${w} 0 0 ${h} ${x} ${y} cm /${name} Do Q\n`;
  }
  end(): string[] {
    if (this.cur) this.pages.push(this.cur);
    return this.pages;
  }
}

function serialize(pagesContent: string[], images: DocImage[] = []): Buffer {
  const bodies: Record<number, string> = {
    1: `<< /Type /Catalog /Pages 2 0 R >>`,
    3: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
    4: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
  };
  // Objetos de imagen (JPEG / DCTDecode).
  let n = 5;
  const imgRes: string[] = [];
  for (const im of images) {
    const jpeg = Buffer.from(im.b64, "base64").toString("latin1");
    bodies[n] = `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${Buffer.byteLength(jpeg, "latin1")} >>\nstream\n${jpeg}\nendstream`;
    imgRes.push(`/${im.name} ${n} 0 R`);
    n++;
  }
  const xobj = imgRes.length ? ` /XObject << ${imgRes.join(" ")} >>` : "";

  const pageObjNums: number[] = [];
  const contentObjs: { num: number; content: string }[] = [];
  const pageObjs: { num: number; contentNum: number }[] = [];
  for (const c of pagesContent) {
    const contentNum = n++;
    const pageNum = n++;
    contentObjs.push({ num: contentNum, content: c });
    pageObjs.push({ num: pageNum, contentNum });
    pageObjNums.push(pageNum);
  }
  const total = n - 1;
  bodies[2] = `<< /Type /Pages /Kids [${pageObjNums.map((p) => `${p} 0 R`).join(" ")}] /Count ${pageObjNums.length} >>`;
  for (const p of pageObjs)
    bodies[p.num] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xobj} >> /Contents ${p.contentNum} 0 R >>`;
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
  // La cotización al contratista lista solo CONCEPTOS (los materiales, recetas
  // y personal son el armado interno). Si aún no hay conceptos, se usan todas
  // las partidas como respaldo. El P.U. del concepto ya incluye indirectos y
  // utilidad.
  const soloConceptos = budget.lineas.filter((l) => l.conceptId);
  const lineas = soloConceptos.length ? soloConceptos : budget.lineas;
  const subtotal = lineas.reduce((a, l) => a + l.pu * l.cantidad, 0);
  const t = { subtotal, iva: subtotal * budget.factorIva, total: subtotal * (1 + budget.factorIva) };
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
  for (const l of lineas) {
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

  return serialize(p.end(), p.images);
}

/** Datos para una constancia de trabajo. */
export interface ConstanciaData {
  participante: string;
  proyecto: string;
  ubicacion: string;
  periodo: string;
  firmanteNombre: string;
  firmanteCargo: string;
  fecha?: string;
  /** Firma dibujada (JPEG base64, lienzo 600×200). */
  firmaJpegB64?: string;
}

const NAVY = "#1B2A5E";
const GRAY = "#6E7480";

/** Construye el PDF de una constancia de trabajo (formato Cobalto Barroco). */
export function buildConstanciaPdf(d: ConstanciaData): Buffer {
  const p = new Painter();
  p.newPage();
  // Barra lateral azul (guiño a la franja del machote).
  p.rect(0, 0, 34, 792, NAVY);
  const cx = 323; // centro del área de contenido (34..612)

  // Logo (arriba, sobre el título)
  const logoW = 176, logoH = (logoW * LOGO_H) / LOGO_W;
  p.image(LOGO_JPEG_B64, cx - logoW / 2, 702, logoW, logoH);

  p.ctext(cx, 672, 17, "C O N S T A N C I A   D E   T R A B A J O", true, NAVY);
  p.ctext(cx, 654, 11, "RESTAURACIÓN ARTÍSTICA & ARQUITECTÓNICA.", false, NAVY);
  p.line(cx - 150, 642, cx + 150, 642, NAVY, 0.7);

  p.ctext(cx, 600, 11, "Por medio de la presente, Cobalto Barroco hace constar que:", false, NAVY);
  p.ctext(cx, 578, 16, d.participante || "—", true, NAVY);
  p.ctext(cx, 548, 11, "Participó en los trabajos correspondientes al proyecto:", false, NAVY);
  p.ctext(cx, 526, 14, d.proyecto || "—", true, NAVY);
  if (d.ubicacion) p.ctext(cx, 498, 11, `Ubicación: ${d.ubicacion}`, false, NAVY);
  if (d.periodo) p.ctext(cx, 482, 11, `Periodo: ${d.periodo}`, false, NAVY);
  p.ctext(cx, 446, 11, "Se expide la presente constancia para los fines que a", false, NAVY);
  p.ctext(cx, 430, 11, "la persona interesada convengan.", false, NAVY);
  if (d.fecha) p.ctext(cx, 404, 10, `Ciudad de México, a ${d.fecha}.`, false, GRAY);

  // Firma dibujada (si existe), sobre la línea.
  if (d.firmaJpegB64) p.image(d.firmaJpegB64, cx - 90, 262, 180, 60);
  p.line(cx - 110, 258, cx + 110, 258, NAVY, 0.7);
  p.ctext(cx, 242, 12, d.firmanteNombre || "", true, NAVY);
  if (d.firmanteCargo) p.ctext(cx, 228, 10, d.firmanteCargo, false, GRAY);

  // Pie de contacto
  p.text(70, 150, 9, "cobaltobarroco@gmail.com", false, NAVY);
  p.text(70, 136, 9, "55-27-51-44-39  //  55-14-88-25-09", false, NAVY);
  p.text(70, 122, 9, "@cobaltobarroco", false, NAVY);

  return serialize(p.end(), p.images);
}
