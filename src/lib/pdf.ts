import "server-only";
import type { Budget, Project, CVEntry } from "@/lib/db";
import { LOGO_JPEG_B64, LOGO_W, LOGO_H } from "@/lib/constancia-logo";
import {
  PAINTING_B64,
  WATERMARK_B64, WATERMARK_W, WATERMARK_H,
  ICON_MAIL_B64, ICON_MAIL_W, ICON_MAIL_H,
  ICON_PHONE_B64, ICON_PHONE_W, ICON_PHONE_H,
  ICON_IG_B64, ICON_IG_W, ICON_IG_H,
} from "@/lib/constancia-assets";

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

// Anchos Helvetica (por 1000 em) de la fuente estándar (AFM), para medir el
// texto y ajustar líneas/alineación con precisión. Antes se usaba 500 para casi
// toda letra, lo que SUBESTIMABA las mayúsculas y hacía que el texto se saliera
// del margen derecho.
const HELV: Record<string, number> = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556, "8": 556, "9": 556,
  ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556, "@": 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
  K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  "[": 278, "\\": 278, "]": 278, "^": 469, _: 556, "`": 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
  k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  "{": 334, "|": 260, "}": 334, "~": 584, "°": 400, "·": 278, "–": 556, "—": 1000,
};
function charW(ch: string): number {
  const w = HELV[ch];
  if (w != null) return w;
  // Letras acentuadas (á, ñ, …): usan el ancho de su letra base.
  const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return HELV[base] ?? 556;
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
  text(x: number, y: number, size: number, str: string, bold = false, color = "#000000", italic = false) {
    const [r, g, b] = rgb(color);
    // F1 normal · F2 negrita · F3 cursiva · F4 negrita cursiva.
    const fn = italic ? (bold ? 4 : 3) : bold ? 2 : 1;
    this.cur += `${f3(r)} ${f3(g)} ${f3(b)} rg BT /F${fn} ${size} Tf ${x} ${y} Td (${esc(str)}) Tj ET\n`;
  }
  rtext(xRight: number, y: number, size: number, str: string, bold = false, color = "#000000", italic = false) {
    this.text(xRight - textWidth(str, size), y, size, str, bold, color, italic);
  }
  ctext(xCenter: number, y: number, size: number, str: string, bold = false, color = "#000000", italic = false) {
    this.text(xCenter - textWidth(str, size) / 2, y, size, str, bold, color, italic);
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
    5: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>`,
    6: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>`,
  };
  // Objetos de imagen (JPEG / DCTDecode).
  let n = 7;
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
    bodies[p.num] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >>${xobj} >> /Contents ${p.contentNum} 0 R >>`;
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

/** Construye el PDF del currículum de la empresa (participación en proyectos). */
export function buildCVPdf(entries: CVEntry[]): Buffer {
  const p = new Painter();
  p.newPage();
  const L = 56, R = 556, W = R - L, BOT = 56;

  // Envuelve un texto en líneas que caben en `maxW` (parte también palabras
  // más largas que el ancho para no desbordar el margen derecho).
  function wrap(s: string, size: number, maxW: number): string[] {
    const out: string[] = [];
    let cur = "";
    for (const word of s.split(/\s+/)) {
      let w = word;
      // Palabra sola más ancha que la línea: córtala por caracteres.
      while (textWidth(w, size) > maxW && w.length > 1) {
        let i = 1;
        while (i < w.length && textWidth(w.slice(0, i + 1), size) <= maxW) i++;
        if (cur) { out.push(cur); cur = ""; }
        out.push(w.slice(0, i));
        w = w.slice(i);
      }
      const t = cur ? `${cur} ${w}` : w;
      if (textWidth(t, size) > maxW && cur) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  }

  let y = 700;
  // Salta de página cuando no cabe la siguiente línea de alto `h`.
  const nl = (h: number) => { if (y - h < BOT) { p.newPage(); y = 752; } };
  // Dibuja un párrafo (puede ocupar varias líneas), verificando página en cada una.
  const para = (txt: string, size: number, indent: number, color: string, bold: boolean, lead: number) => {
    for (const ln of wrap(txt, size, W - indent)) { nl(lead); p.text(L + indent, y, size, ln, bold, color); y -= lead; }
  };

  // Encabezado con logo (compacto, arriba a la izquierda).
  const logoH = 48, logoW = (logoH * LOGO_W) / LOGO_H;
  p.image(LOGO_JPEG_B64, L, 724, logoW, logoH);
  const tx = L + logoW + 16;
  p.text(tx, 760, 20, "CURRÍCULUM", true, NAVY);
  p.text(tx, 744, 9, "Cobalto Barroco · Restauración artística y arquitectónica", false, GRAY);
  p.text(tx, 732, 9, `Participación en proyectos · ${entries.length} intervenciones`, false, GRAY);
  p.line(L, 716, R, 716, NAVY, 0.7);

  // Agrupa por año (desc).
  const years = [...new Set(entries.map((e) => e.anio))].sort((a, b) => b - a);
  for (const year of years) {
    nl(24);
    p.rect(L, y - 4, W, 18, "#F2EEE4");
    p.text(L + 6, y, 12, String(year), true, NAVY);
    y -= 24;

    for (const e of entries.filter((x) => x.anio === year)) {
      const titulo = `${e.clave ? e.clave + " · " : ""}${e.titulo}`;
      const fechaW = e.fecha ? textWidth(e.fecha, 9) + 12 : 0;
      const tLines = wrap(titulo, 10, W - fechaW);
      for (const [i, ln] of tLines.entries()) {
        nl(13);
        p.text(L, y, 10, ln, true, "#2C2C2C");
        if (i === 0 && e.fecha) p.rtext(R, y, 9, e.fecha, false, GRAY);
        y -= 13;
      }
      const meta = [e.sitio, e.lugar, e.tipoBien, e.clasificacion].filter(Boolean).join(" · ");
      if (meta) para(meta, 8.5, 0, NAVY, false, 11);
      if (e.descripcion) para(e.descripcion, 8.5, 10, "#555555", false, 11);
      if (e.colaboracion) para(e.colaboracion, 8, 10, GRAY, false, 12);
      y -= 8;
    }
  }

  if (entries.length === 0) p.text(L, y, 10, "Sin intervenciones registradas todavía.", false, GRAY);
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

  // ── Franja lateral con la pintura barroca (igual que el machote) ──
  const STRIP = 157;               // ancho de la franja (puntos)
  const paintH = (STRIP * 2341) / 420; // alto manteniendo proporción
  p.image(PAINTING_B64, 0, 792 - paintH, STRIP, paintH); // ancla arriba

  // ── Marca de agua de acanto (tenue, inferior derecha) ──
  const wmW = 215, wmH = (wmW * WATERMARK_H) / WATERMARK_W;
  p.image(WATERMARK_B64, 600 - wmW, 22, wmW, wmH);

  // Centro del área de contenido (a la derecha de la franja).
  const cx = (STRIP + 612) / 2; // ≈ 384.5

  // ── Logo (CB + Cobalto Barroco + acanto), centrado arriba ──
  const logoW = 248, logoH = (logoW * LOGO_H) / LOGO_W;
  p.image(LOGO_JPEG_B64, cx - logoW / 2, 714 - logoH, logoW, logoH);

  // ── Título y subtítulo ──
  p.ctext(cx, 562, 16, "C O N S T A N C I A   D E   T R A B A J O", true, NAVY);
  p.ctext(cx, 544, 11.5, "RESTAURACIÓN ARTÍSTICA & ARQUITECTÓNICA.", false, NAVY);

  // ── Cuerpo (centrado, con ajuste dinámico para textos largos) ──
  const MAXW = 2 * (cx - STRIP) - 24; // ancho seguro sin invadir la franja
  function wrapC(s: string, size: number): string[] {
    const out: string[] = [];
    let cur = "";
    for (const w of (s || "").split(/\s+/)) {
      const t = cur ? `${cur} ${w}` : w;
      if (textWidth(t, size) > MAXW && cur) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur);
    return out.length ? out : ["—"];
  }
  let yc = 486;
  const cline = (
    txt: string, size: number,
    bold = false, color = NAVY, italic = false, lead = size + 6,
  ) => {
    for (const ln of wrapC(txt, size)) {
      p.ctext(cx, yc, size, ln, bold, color, italic);
      yc -= lead;
    }
  };

  // "Por medio de la presente, " (normal) + cita en cursiva, en una línea centrada.
  {
    const a = "Por medio de la presente, ";
    const b = "Cobalto Barroco hace constar que:";
    const wa = textWidth(a, 11), wb = textWidth(b, 11);
    const x0 = cx - (wa + wb) / 2;
    p.text(x0, yc, 11, a, false, NAVY, false);
    p.text(x0 + wa, yc, 11, b, false, NAVY, true);
    yc -= 17;
  }
  cline(d.participante || "—", 12.5, true, NAVY); // nombre en negrita
  yc -= 8;
  cline("Participó en los trabajos correspondientes al proyecto:", 11);
  cline(d.proyecto || "—", 12.5, true, NAVY, true); // proyecto en negrita cursiva
  yc -= 14;
  if (d.ubicacion) cline(`Ubicación: ${d.ubicacion}`, 11);
  if (d.periodo) cline(`Periodo: ${d.periodo}`, 11);
  yc -= 16;
  cline("Se expide la presente constancia para los fines que a", 11, false, NAVY, false, 16);
  cline("la persona interesada convengan.", 11);

  // ── Firma ──
  if (d.firmaJpegB64) p.image(d.firmaJpegB64, cx - 90, 206, 180, 58);
  p.line(cx - 122, 203, cx + 122, 203, NAVY, 0.8);
  p.ctext(cx, 184, 12, d.firmanteNombre || "[NOMBRE Y FIRMA]", false, NAVY);
  p.ctext(cx, 168, 11, d.firmanteCargo || "[CARGO]", false, NAVY);

  // ── Pie de contacto, con íconos ──
  const foot = GRAY;
  const ix = 206, tx = 228, isz = 11;
  const drawIcon = (b64: string, iw: number, ih: number, yBase: number) => {
    const h = isz, w = (h * iw) / ih;
    p.image(b64, ix, yBase - 2, w, h);
  };
  drawIcon(ICON_MAIL_B64, ICON_MAIL_W, ICON_MAIL_H, 110);
  p.text(tx, 110, 9, "cobaltobarroco@gmail.com", false, foot);
  drawIcon(ICON_PHONE_B64, ICON_PHONE_W, ICON_PHONE_H, 88);
  p.text(tx, 88, 9, "55-27-51-44-39 // 55-14-88-25-09", false, foot);
  drawIcon(ICON_IG_B64, ICON_IG_W, ICON_IG_H, 66);
  p.text(tx, 66, 9, "@cobaltobarroco", false, foot);

  return serialize(p.end(), p.images);
}
