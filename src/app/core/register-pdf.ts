import { MonthReport } from './models';

/** A4 landscape in PDF points. */
const PAGE_W = 842;
const PAGE_H = 595;
/** Canvas pixels per PDF point: sharp enough to print, small enough to share. */
const SCALE = 2.5;
const FONT = '"Noto Sans Devanagari", Roboto, sans-serif';

/** "6", "5.5", "7.25": prices without a currency sign, for the narrow day columns. */
export function shortPrice(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
}

/**
 * The month's register as a printable table: one row per newspaper/magazine, one column per
 * date with the price paid, totals per row, per day and for the month.
 * Drawn on a canvas because the phone's own text engine renders Marathi correctly, which
 * PDF libraries' built-in fonts can't.
 */
export function drawRegisterTable(report: MonthReport, library: string, monthName: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(PAGE_W * SCALE);
  canvas.height = Math.round(PAGE_H * SCALE);
  const g = canvas.getContext('2d')!;
  g.scale(SCALE, SCALE);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, PAGE_W, PAGE_H);

  const margin = 24;
  const days = report.rows[0]?.prices.length ?? new Date(+report.month.slice(0, 4), +report.month.slice(5, 7), 0).getDate();
  const nameW = 150;
  const totalW = 58;
  const dayW = (PAGE_W - 2 * margin - nameW - totalW) / days;
  const top = 74;
  const footer = 46;
  // shortcut: one page; rows shrink to fit, so beyond ~45 papers the text gets small. Split into pages if that happens.
  const rowH = Math.min(22, (PAGE_H - top - footer) / (report.rows.length + 2));
  const font = (size: number, weight = 400) => (g.font = `${weight} ${size}px ${FONT}`);
  const text = (s: string, x: number, y: number, align: CanvasTextAlign = 'left', maxW?: number) => {
    g.textAlign = align;
    g.textBaseline = 'middle';
    let t = s;
    if (maxW) {
      while (t.length > 1 && g.measureText(t).width > maxW) {
        t = t.slice(0, -2) + '…';
      }
    }
    g.fillText(t, x, y);
  };

  // Heading.
  g.fillStyle = '#16665d';
  font(17, 700);
  text(library, margin, 26);
  g.fillStyle = '#172e2a';
  font(12, 500);
  text(`Newspaper & magazine register · ${monthName}`, margin, 48);
  font(9);
  g.fillStyle = '#657773';
  text('Each cell is the price paid (₹) for the copy received that day; blank = not received.', PAGE_W - margin, 48, 'right');

  // Weekend shading and grid.
  const tableH = rowH * (report.rows.length + 2);
  const left = margin + nameW;
  const [year, month] = report.month.split('-').map(Number);
  for (let d = 0; d < days; d++) {
    if (new Date(year, month - 1, d + 1).getDay() === 0) {
      g.fillStyle = '#eef5f3';
      g.fillRect(left + d * dayW, top, dayW, tableH);
    }
  }
  g.fillStyle = '#d8e6e0';
  g.fillRect(margin, top, PAGE_W - 2 * margin, rowH);
  g.fillRect(margin, top + tableH - rowH, PAGE_W - 2 * margin, rowH);

  g.strokeStyle = '#9fb3ae';
  g.lineWidth = 0.5;
  for (let r = 0; r <= report.rows.length + 2; r++) {
    g.beginPath();
    g.moveTo(margin, top + r * rowH);
    g.lineTo(PAGE_W - margin, top + r * rowH);
    g.stroke();
  }
  const columns = [margin, left, ...Array.from({ length: days }, (_, d) => left + (d + 1) * dayW), PAGE_W - margin];
  for (const x of columns) {
    g.beginPath();
    g.moveTo(x, top);
    g.lineTo(x, top + tableH);
    g.stroke();
  }

  // Header row.
  const cellFont = Math.max(6, Math.min(9, rowH * 0.42, dayW * 0.36));
  g.fillStyle = '#172e2a';
  font(9, 700);
  text('Newspaper / नाव', margin + 5, top + rowH / 2, 'left', nameW - 8);
  text('Total ₹', PAGE_W - margin - 4, top + rowH / 2, 'right');
  font(cellFont, 700);
  for (let d = 0; d < days; d++) {
    text(String(d + 1), left + d * dayW + dayW / 2, top + rowH / 2, 'center');
  }

  // One row per newspaper/magazine.
  const dayTotals = new Array<number>(days).fill(0);
  report.rows.forEach((row, i) => {
    const y = top + (i + 1.5) * rowH;
    g.fillStyle = '#172e2a';
    font(Math.min(10, rowH * 0.5), 500);
    text(row.name, margin + 5, y, 'left', nameW - 8);
    font(cellFont);
    row.prices.forEach((p, d) => {
      if (p !== null) {
        dayTotals[d] += p;
        text(shortPrice(p), left + d * dayW + dayW / 2, y, 'center');
      }
    });
    font(Math.min(9.5, rowH * 0.48), 700);
    text(shortPrice(row.amount), PAGE_W - margin - 4, y, 'right');
  });

  // Day totals and the month's total.
  const lastY = top + tableH - rowH / 2;
  font(9, 700);
  text('Day total', margin + 5, lastY);
  font(cellFont, 700);
  dayTotals.forEach((t, d) => t && text(shortPrice(t), left + d * dayW + dayW / 2, lastY, 'center'));
  font(9.5, 700);
  text(shortPrice(report.totalAmount), PAGE_W - margin - 4, lastY, 'right');

  // Footer.
  const footY = top + tableH + 26;
  g.fillStyle = '#16665d';
  font(14, 700);
  text(`Total expense for ${monthName}: ₹${report.totalAmount.toLocaleString('en-IN')}`, margin, footY);
  g.fillStyle = '#657773';
  font(9);
  text(`${report.totalIssues} copies received`, PAGE_W - margin, footY, 'right');
  return canvas;
}

/**
 * The smallest valid PDF: one A4 landscape page showing one JPEG image full-page.
 * Written by hand to avoid a PDF library for what is a single picture.
 */
export function jpegToPdf(jpeg: Uint8Array, width: number, height: number): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const add = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? enc.encode(part) : part;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (n: number, body: string) => {
    offsets[n] = length;
    add(`${n} 0 obj\n${body}\nendobj\n`);
  };
  const content = `q ${PAGE_W} 0 0 ${PAGE_H} 0 0 cm /Im0 Do Q`;

  add('%PDF-1.4\n%âãÏÓ\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] `
    + '/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
  offsets[4] = length;
  add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB `
    + `/BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  add(jpeg);
  add('\nendstream\nendobj\n');
  object(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const xref = length;
  add(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`);
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const pdf = new Uint8Array(length);
  let at = 0;
  for (const p of parts) {
    pdf.set(p, at);
    at += p.length;
  }
  return pdf;
}

/** The month's register as PDF bytes, ready to save or share. */
export function registerPdf(report: MonthReport, library: string, monthName: string): Uint8Array {
  const canvas = drawRegisterTable(report, library, monthName);
  const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
  const jpeg = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return jpegToPdf(jpeg, canvas.width, canvas.height);
}
