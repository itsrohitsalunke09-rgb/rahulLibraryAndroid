import { MonthReport } from './models';

export type Orientation = 'landscape' | 'portrait';

/** A4 in PDF points, [width, height]. */
const A4: Record<Orientation, [number, number]> = { landscape: [842, 595], portrait: [595, 842] };
const MARGIN = 24;
/** Space above the tables (library name, title) and below them (total expense). */
const HEAD = 66;
const FOOT = 40;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "6", "5.5", "7.25": prices without a currency sign, for the narrow cells. */
export function shortPrice(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
}

/** The register as a grid of cell texts, before any drawing. */
export interface RegisterTable {
  /** First row: column headings. */
  header: string[];
  /** Body rows: one per newspaper (landscape) or per date (portrait). */
  body: string[][];
  /** Last row: totals; its last cell is the month's total. */
  totals: string[];
}

/**
 * Lays out a month as a table. Landscape: newspapers down, dates across. Portrait: dates down,
 * newspapers across — narrower columns, so it suits up to about a dozen papers.
 * Cells hold the price paid that day, blank when no copy came; totals per paper, per day and overall.
 */
export function registerTable(report: MonthReport, orientation: Orientation): RegisterTable {
  const [year, month] = report.month.split('-').map(Number);
  const days = daysIn(report.month);
  const price = (p: number | null | undefined) => (p == null ? '' : shortPrice(p));
  const dayTotals = Array.from({ length: days }, (_, d) =>
    report.rows.reduce((sum, row) => sum + (row.prices[d] ?? 0), 0));
  const total = shortPrice(report.totalAmount);

  if (orientation === 'landscape') {
    return {
      header: ['Newspaper', ...Array.from({ length: days }, (_, d) => String(d + 1)), 'Total Rs.'],
      body: report.rows.map(row => [row.name, ...Array.from({ length: days }, (_, d) => price(row.prices[d])), shortPrice(row.amount)]),
      totals: ['Day total', ...dayTotals.map(t => (t ? shortPrice(t) : '')), total],
    };
  }
  return {
    header: ['Date', ...report.rows.map(row => row.name), 'Day total Rs.'],
    body: Array.from({ length: days }, (_, d) => [
      `${d + 1} ${WEEKDAYS[new Date(year, month - 1, d + 1).getDay()]}`,
      ...report.rows.map(row => price(row.prices[d])),
      dayTotals[d] ? shortPrice(dayTotals[d]) : '',
    ]),
    totals: ['Total Rs.', ...report.rows.map(row => shortPrice(row.amount)), total],
  };
}

/** Smallest row height (points) that still reads well; decides how many months share a page. */
const MIN_ROW = 13;
/** Each month's own heading line above its table. */
const BLOCK_TITLE = 20;
const BLOCK_GAP = 10;
const MAX_MONTHS_PER_PAGE = 3;

function daysIn(month: string): number {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m, 0).getDate();
}

/** Height (points) a month needs at the smallest readable row size, heading included. */
export function monthMinHeight(report: MonthReport, orientation: Orientation): number {
  const body = orientation === 'landscape' ? report.rows.length : daysIn(report.month);
  // Portrait headings are wrapped newspaper names, about two and a half rows tall.
  const header = orientation === 'landscape' ? 1.4 : 2.5;
  return BLOCK_TITLE + (header + body + 1) * MIN_ROW;
}

/**
 * Groups months onto pages, oldest first: as many as fit at a readable size, up to three.
 * A month that alone is too tall still gets its own page (its rows just get smaller).
 */
export function packPages<T extends { report: MonthReport }>(months: T[], orientation: Orientation): T[][] {
  const usable = A4[orientation][1] - HEAD - FOOT;
  const pages: T[][] = [];
  let page: T[] = [];
  let used = 0;
  for (const m of months) {
    const need = monthMinHeight(m.report, orientation);
    if (page.length && (page.length === MAX_MONTHS_PER_PAGE || used + BLOCK_GAP + need > usable)) {
      pages.push(page);
      page = [];
      used = 0;
    }
    used += (page.length ? BLOCK_GAP : 0) + need;
    page.push(m);
  }
  if (page.length) {
    pages.push(page);
  }
  return pages;
}

// ---- A small vector PDF writer ----------------------------------------------------------------

/** Character widths (1/1000 em) of PDF's built-in Helvetica and Helvetica-Bold, for ASCII 32–126. */
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611,
  611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

/** Text PDF's built-in fonts can draw (plain ASCII); anything else, like Marathi, is drawn as a picture. */
export function isPlainText(s: string): boolean {
  return /^[\x20-\x7e]*$/.test(s);
}

/** Width in points of plain text in Helvetica. */
export function textWidth(s: string, size: number, bold = false): number {
  const widths = bold ? HELVETICA_BOLD : HELVETICA;
  let units = 0;
  for (const ch of s) {
    units += widths[ch.charCodeAt(0) - 32] ?? 556;
  }
  return (units * size) / 1000;
}

/** A greyscale picture (one byte per pixel, 0 = black) placed on a page. */
export interface GrayImage {
  width: number;
  height: number;
  pixels: Uint8Array;
}

type Align = 'left' | 'center' | 'right';

/**
 * One PDF page being drawn. Coordinates are in points from the top-left, like a screen;
 * they're flipped to PDF's bottom-left origin when written.
 */
export class PdfPage {
  readonly ops: string[] = [];
  readonly images: GrayImage[] = [];

  constructor(readonly width: number, readonly height: number) {}

  line(x1: number, y1: number, x2: number, y2: number, width = 0.5) {
    this.ops.push(`${n(width)} w ${n(x1)} ${n(this.height - y1)} m ${n(x2)} ${n(this.height - y2)} l S`);
  }

  /** A rectangle filled with grey (0 = black, 1 = white). */
  fill(x: number, y: number, w: number, h: number, gray: number) {
    this.ops.push(`${n(gray)} g ${n(x)} ${n(this.height - y - h)} ${n(w)} ${n(h)} re f 0 g`);
  }

  /**
   * Plain text in Helvetica, vertically centred on y. It shrinks (down to 5 pt) and then is cut
   * with "..." to fit maxW.
   */
  text(s: string, x: number, y: number, size: number, opts: { bold?: boolean; align?: Align; maxW?: number } = {}) {
    if (!s) {
      return;
    }
    const bold = !!opts.bold;
    let t = s;
    let fs = size;
    if (opts.maxW) {
      while (fs > 5 && textWidth(t, fs, bold) > opts.maxW) {
        fs -= 0.5;
      }
      while (t.length > 1 && textWidth(t, fs, bold) > opts.maxW) {
        t = t.slice(0, -4) + '...';
      }
    }
    const w = textWidth(t, fs, bold);
    const left = opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x;
    const baseline = y + fs * 0.35;
    const escaped = t.replace(/[\\()]/g, c => '\\' + c);
    this.ops.push(`BT /${bold ? 'F2' : 'F1'} ${n(fs)} Tf ${n(left)} ${n(this.height - baseline)} Td (${escaped}) Tj ET`);
  }

  /** A picture w × h points with its top-left corner at (x, y). */
  image(img: GrayImage, x: number, y: number, w: number, h: number) {
    this.images.push(img);
    this.ops.push(`q ${n(w)} 0 0 ${n(h)} ${n(x)} ${n(this.height - y - h)} cm /Im${this.images.length - 1} Do Q`);
  }
}

/** A number for the PDF: at most two decimals, no trailing zeros. */
function n(v: number): string {
  return String(Math.round(v * 100) / 100);
}

/** zlib-compresses bytes (PDF's FlateDecode) with the browser's built-in compressor. */
export async function deflate(bytes: Uint8Array, mode: 'compress' | 'decompress' = 'compress'): Promise<Uint8Array> {
  const transform = mode === 'compress' ? new CompressionStream('deflate') : new DecompressionStream('deflate');
  const writer = transform.writable.getWriter();
  writer.write(bytes as BufferSource).then(() => writer.close());
  const chunks: Uint8Array[] = [];
  const reader = transform.readable.getReader();
  for (let r = await reader.read(); !r.done; r = await reader.read()) {
    chunks.push(r.value);
  }
  const out = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/**
 * Writes the pages as a PDF: lines and plain text as real vector graphics in the built-in
 * Helvetica fonts (sharp at any zoom), pictures as lossless compressed greyscale images.
 */
export async function buildPdf(pages: PdfPage[]): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const add = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? enc.encode(part) : part;
    parts.push(bytes);
    length += bytes.length;
  };
  const startObject = (id: number) => {
    offsets[id] = length;
    add(`${id} 0 obj\n`);
  };
  const object = (id: number, body: string) => {
    startObject(id);
    add(`${body}\nendobj\n`);
  };
  const stream = (id: number, dict: string, data: Uint8Array) => {
    startObject(id);
    add(`<< ${dict} /Length ${data.length} >>\nstream\n`);
    add(data);
    add('\nendstream\nendobj\n');
  };

  // Objects: 1 catalog, 2 page list, 3–4 fonts, then per page: page, content, its pictures.
  let next = 5;
  const layout = pages.map(page => {
    const ids = { page: next, content: next + 1, images: page.images.map((_, i) => next + 2 + i) };
    next += 2 + page.images.length;
    return ids;
  });

  add('%PDF-1.4\n%âãÏÓ\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Kids [${layout.map(l => `${l.page} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  object(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  object(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  for (const [p, page] of pages.entries()) {
    const ids = layout[p];
    const xobjects = ids.images.map((id, i) => `/Im${i} ${id} 0 R`).join(' ');
    object(ids.page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(page.width)} ${n(page.height)}] `
      + `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${xobjects} >> >> /Contents ${ids.content} 0 R >>`);
    stream(ids.content, '/Filter /FlateDecode', await deflate(enc.encode(page.ops.join('\n'))));
    for (const [i, img] of page.images.entries()) {
      stream(ids.images[i], `/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} `
        + '/ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode', await deflate(img.pixels));
    }
  }

  const xref = length;
  add(`xref\n0 ${next}\n0000000000 65535 f \n${offsets.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`);
  add(`trailer\n<< /Size ${next} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const pdf = new Uint8Array(length);
  let at = 0;
  for (const p of parts) {
    pdf.set(p, at);
    at += p.length;
  }
  return pdf;
}

// ---- The register page -------------------------------------------------------------------------

/** Pixels per point for Marathi text pictures: still crisp at 800% zoom. */
const PICTURE_SCALE = 8;
const DEVANAGARI = '"Noto Sans Devanagari", Roboto, sans-serif';
let measureCanvas: CanvasRenderingContext2D | undefined;

function canvasFont(size: number, bold: boolean) {
  return `${bold ? 700 : 400} ${size}px ${DEVANAGARI}`;
}

/** Width in points of any text: Helvetica metrics for plain text, the phone's own fonts for Marathi. */
function measure(s: string, size: number, bold: boolean): number {
  if (isPlainText(s)) {
    return textWidth(s, size, bold);
  }
  measureCanvas ??= document.createElement('canvas').getContext('2d')!;
  measureCanvas.font = canvasFont(size, bold);
  return measureCanvas.measureText(s).width;
}

/**
 * Marathi text as a sharp greyscale picture. Drawn by the phone's text engine, which joins
 * Devanagari letters correctly; PDF's built-in fonts can't.
 */
function textPicture(s: string, size: number, bold: boolean): { img: GrayImage; w: number; h: number } {
  const w = measure(s, size, bold) + 2;
  const h = size * 1.5;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * PICTURE_SCALE);
  canvas.height = Math.ceil(h * PICTURE_SCALE);
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.scale(PICTURE_SCALE, PICTURE_SCALE);
  g.fillStyle = '#000000';
  g.font = canvasFont(size, bold);
  g.textBaseline = 'middle';
  g.fillText(s, 1, h / 2);
  const rgba = g.getImageData(0, 0, canvas.width, canvas.height).data;
  const pixels = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = rgba[i * 4];
  }
  return { img: { width: canvas.width, height: canvas.height, pixels }, w, h };
}

/** Any text centred vertically on y: plain text as vector text, Marathi as a picture. */
function drawText(page: PdfPage, s: string, x: number, y: number, size: number,
                  opts: { bold?: boolean; align?: Align; maxW?: number } = {}) {
  if (!s) {
    return;
  }
  if (isPlainText(s)) {
    page.text(s, x, y, size, opts);
    return;
  }
  const pic = textPicture(s, size, !!opts.bold);
  const shrink = opts.maxW && pic.w > opts.maxW ? opts.maxW / pic.w : 1;
  const w = pic.w * shrink;
  const h = pic.h * shrink;
  const left = opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x;
  page.image(pic.img, left, y - h / 2, w, h);
}

/** Splits text into at most maxLines lines that fit maxW (the last line may be shrunk to fit). */
function wrap(text: string, size: number, bold: boolean, maxW: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (measure(next, size, bold) <= maxW || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  const kept = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    kept[maxLines - 1] += ' ' + lines.slice(maxLines).join(' ');
  }
  return kept;
}

/**
 * One A4 page holding one or more months, each as a heading plus its table, in black and white;
 * the rows stretch so the page is filled, and each month's total is highlighted.
 */
export function drawRegisterPage(months: { report: MonthReport; monthName: string }[], library: string,
                                 orientation: Orientation, title = 'Newspaper & magazine register'): PdfPage {
  const [pageW, pageH] = A4[orientation];
  const page = new PdfPage(pageW, pageH);
  const period = months.length === 1 ? months[0].monthName : `${months[0].monthName} to ${months[months.length - 1].monthName}`;

  drawText(page, library, MARGIN, 24, 17, { bold: true, maxW: pageW - 2 * MARGIN });
  drawText(page, `${title} - ${period}`, MARGIN, 46, 11);

  // Lay out each month (column positions, header lines), then share the height between all rows.
  const blocks = months.map(m => {
    const t = registerTable(m.report, orientation);
    const cols = t.header.length;
    const firstW = orientation === 'landscape' ? 132 : 46;
    const lastW = orientation === 'landscape' ? 50 : 56;
    const innerW = (pageW - 2 * MARGIN - firstW - lastW) / (cols - 2);
    const colX = [MARGIN, MARGIN + firstW];
    for (let c = 1; c < cols - 1; c++) {
      colX.push(colX[c] + innerW);
    }
    colX.push(pageW - MARGIN);
    const headFont = Math.max(6.5, Math.min(9.5, innerW * 0.3));
    const headLines = t.header.map((h, c) => (orientation === 'portrait' && c > 0
      ? wrap(h, headFont, true, colX[c + 1] - colX[c] - 4, 3) : [h]));
    const headH = Math.max(20, Math.max(...headLines.map(l => l.length)) * headFont * 1.3 + 8);
    return { ...m, t, cols, innerW, colX, headFont, headLines, headH, rows: t.body.length + 1 };
  });
  const tablesTop = HEAD + 6;
  const fixed = blocks.reduce((sum, b) => sum + BLOCK_TITLE + b.headH, 0) + BLOCK_GAP * (blocks.length - 1);
  const rowH = (pageH - tablesTop - FOOT - fixed) / blocks.reduce((sum, b) => sum + b.rows, 0);

  let top = tablesTop;
  for (const b of blocks) {
    const { t, cols, colX, headLines, headH, headFont, rows } = b;
    const colW = (c: number) => colX[c + 1] - colX[c];
    const cellFont = Math.max(5.5, Math.min(12, rowH * 0.5, b.innerW * 0.34));
    drawText(page, b.monthName, MARGIN, top + BLOCK_TITLE / 2, 11.5, { bold: true });

    const tableTop = top + BLOCK_TITLE;
    const rowY = (r: number) => tableTop + headH + r * rowH;
    const tableBottom = rowY(rows);

    // The month's total (bottom-right cell) is the one thing highlighted.
    page.fill(colX[cols - 1], rowY(rows - 1), colW(cols - 1), rowH, 0.82);

    // Grid: thin lines, heavier around the header and totals.
    page.line(MARGIN, tableTop, pageW - MARGIN, tableTop, 0.8);
    for (let r = 0; r <= rows; r++) {
      const heavy = r === 0 || r === rows - 1 || r === rows;
      page.line(MARGIN, rowY(r), pageW - MARGIN, rowY(r), heavy ? 0.8 : 0.3);
    }
    colX.forEach((x, c) => page.line(x, tableTop, x, tableBottom, c === 0 || c === cols - 1 || c === cols ? 0.8 : 0.3));

    // Text: first column left (names / dates), totals column right, the rest centred.
    const cell = (s: string, c: number, y: number, size: number, bold: boolean) => {
      const maxW = colW(c) - 5;
      if (c === 0) {
        drawText(page, s, colX[c] + 3, y, size, { bold, maxW });
      } else if (c === cols - 1) {
        drawText(page, s, colX[c + 1] - 3, y, size, { bold, align: 'right', maxW });
      } else {
        drawText(page, s, colX[c] + colW(c) / 2, y, size, { bold, align: 'center', maxW });
      }
    };
    headLines.forEach((lines, c) => {
      const lineH = headFont * 1.3;
      const first = tableTop + headH / 2 - ((lines.length - 1) * lineH) / 2;
      lines.forEach((l, i) => cell(l, c, first + i * lineH, headFont, true));
    });
    t.body.forEach((cells, r) => {
      cells.forEach((s, c) => cell(s, c, rowY(r) + rowH / 2, c === 0 ? Math.min(cellFont * 1.05, 11) : cellFont, c === 0 || c === cols - 1));
    });
    t.totals.forEach((s, c) => cell(s, c, rowY(rows - 1) + rowH / 2, c === cols - 1 ? cellFont * 1.15 : cellFont, true));

    top = tableBottom + BLOCK_GAP;
  }

  // Footer: the expense for everything on this page.
  const amount = months.reduce((sum, m) => sum + m.report.totalAmount, 0);
  const footY = pageH - FOOT / 2;
  drawText(page, `Total expense for ${period}: Rs. ${amount.toLocaleString('en-IN')}`, MARGIN, footY, 13, { bold: true });
  drawText(page, 'Blank cell = no copy that day', pageW - MARGIN, footY, 8, { align: 'right' });
  return page;
}

/**
 * The register for one or more months as one A4 PDF: months packed up to three to a page when
 * they fit at a readable size, oldest first. Ready to save.
 */
export function registerPdf(months: { report: MonthReport; monthName: string }[], library: string, orientation: Orientation,
                            title?: string): Promise<Uint8Array> {
  return buildPdf(packPages(months, orientation).map(page => drawRegisterPage(page, library, orientation, title)));
}
