import { MonthReport } from './models';
import { PdfPage, bookMovesPdf, bookMovesTable, buildPdf, deflate, isPlainText, magazineTable, packPages, registerTable, shortPrice, textWidth } from './register-pdf';

/** The PDF's objects by number, with stream contents unpacked. */
function readPdf(pdf: Uint8Array) {
  const text = new TextDecoder('latin1').decode(pdf);
  const xrefAt = Number(/startxref\n(\d+)/.exec(text)![1]);
  const count = Number(/xref\n0 (\d+)/.exec(text.slice(xrefAt))![1]);
  const offsets = text.slice(xrefAt).split('\n').slice(3, 3 + count - 1).map(e => Number(e.slice(0, 10)));
  const streamOf = async (n: number) => {
    const at = offsets[n - 1];
    const len = Number(/\/Length (\d+)/.exec(text.slice(at))![1]);
    const start = text.indexOf('stream\n', at) + 7;
    return deflate(pdf.slice(start, start + len), 'decompress');
  };
  return { text, xrefAt, count, offsets, streamOf };
}

describe('buildPdf', () => {
  const page = new PdfPage(595, 842);
  page.line(24, 100, 571, 100);
  page.fill(500, 120, 40, 20, 0.82);
  page.text('Total (Rs.)', 24, 130, 12, { bold: true });
  page.image({ width: 2, height: 1, pixels: Uint8Array.from([0, 255]) }, 30, 200, 20, 10);
  const second = new PdfPage(842, 595);
  second.text('6', 100, 100, 9, { align: 'center' });

  it('points every cross-reference entry at its object', async () => {
    const pdf = readPdf(await buildPdf([page, second]));
    expect(pdf.text.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.text.slice(pdf.xrefAt, pdf.xrefAt + 4)).toBe('xref');
    pdf.offsets.forEach((o, i) => expect(pdf.text.startsWith(`${i + 1} 0 obj\n`, o)).toBe(true));
  });

  it('writes text and lines as vector drawing in the built-in fonts, one page size each', async () => {
    const pdf = readPdf(await buildPdf([page, second]));
    expect(pdf.text).toContain('/BaseFont /Helvetica ');
    expect(pdf.text).toContain('/BaseFont /Helvetica-Bold');
    expect(pdf.text).toContain('/MediaBox [0 0 595 842]');
    expect(pdf.text).toContain('/MediaBox [0 0 842 595]');
    const content = new TextDecoder('latin1').decode(await pdf.streamOf(6));
    expect(content).toContain('(Total \\(Rs.\\)) Tj');
    expect(content).toContain('/F2 12 Tf');
    expect(content).toContain('24 742 m 571 742 l S');
    expect(content).toContain('0.82 g 500 702 40 20 re f');
  });

  it('stores pictures losslessly as greyscale', async () => {
    const pdf = readPdf(await buildPdf([page, second]));
    expect(pdf.text).toContain('/ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode');
    expect(Array.from(await pdf.streamOf(7))).toEqual([0, 255]);
  });
});

describe('text helpers', () => {
  it('tells plain text from Marathi', () => {
    expect(isPlainText('The Times of India')).toBe(true);
    expect(isPlainText('सकाळ')).toBe(false);
  });

  it('measures Helvetica text', () => {
    expect(textWidth('10', 10)).toBeCloseTo(11.12);
    expect(textWidth('i', 10)).toBeLessThan(textWidth('W', 10));
  });
});

describe('registerTable', () => {
  // February 2026: 28 days, Sundays on the 1st, 8th, 15th and 22nd.
  const prices = (fill: (day: number) => number | null) => Array.from({ length: 28 }, (_, d) => fill(d + 1));
  const report: MonthReport = {
    month: '2026-02', from: '2026-02-01', to: '2026-02-28', totalIssues: 29, totalAmount: 196,
    rows: [
      { periodicalId: 1, name: 'सकाळ', frequency: 'DAILY', issues: 28, amount: 176, missingDays: 0, prices: prices(d => (d % 7 === 1 ? 8 : 6)) },
      { periodicalId: 2, name: 'लोकराज्य', frequency: 'MONTHLY', issues: 1, amount: 20, missingDays: null, prices: prices(d => (d === 5 ? 20 : null)) },
    ],
  };

  it('landscape: a row per newspaper, a column per date, totals at the end', () => {
    const t = registerTable(report, 'landscape');
    expect(t.header.length).toBe(30);
    expect(t.header[0]).toBe('Newspaper');
    expect(t.body[0].slice(0, 3)).toEqual(['सकाळ', '8', '6']);
    expect(t.body[1][5]).toBe('20');
    expect(t.body[1][4]).toBe('');
    expect(t.body[0][29]).toBe('176');
    expect(t.totals[5]).toBe('26');
    expect(t.totals[29]).toBe('196');
  });

  it('portrait: a row per date with its weekday, a column per newspaper', () => {
    const t = registerTable(report, 'portrait');
    expect(t.header).toEqual(['Date', 'सकाळ', 'लोकराज्य', 'Day total Rs.']);
    expect(t.body.length).toBe(28);
    expect(t.body[0]).toEqual(['1 Sun', '8', '', '8']);
    expect(t.body[4]).toEqual(['5 Thu', '6', '20', '26']);
    expect(t.totals).toEqual(['Total Rs.', '176', '20', '196']);
  });
});

describe('packPages', () => {
  /** A month with the given number of newspapers (prices don't matter for packing). */
  const month = (m: string, papers: number) => ({
    report: {
      month: m, from: '', to: '', totalIssues: 0, totalAmount: 0,
      rows: Array.from({ length: papers }, (_, i) => ({
        periodicalId: i, name: `Paper ${i}`, frequency: 'DAILY' as const, issues: 0, amount: 0, missingDays: 0, prices: [],
      })),
    } as MonthReport,
    monthName: m,
  });

  it('puts up to three months with a few newspapers on one landscape page', () => {
    const months = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map(m => month(m, 8));
    const pages = packPages(months, 'landscape');
    expect(pages.map(p => p.map(x => x.monthName))).toEqual([['2026-06', '2026-07', '2026-08'], ['2026-09', '2026-10']]);
  });

  it('puts fewer months per page when there are many newspapers', () => {
    expect(packPages([month('2026-09', 20), month('2026-10', 20)], 'landscape').length).toBe(2);
    expect(packPages([month('2026-09', 40)], 'landscape')).toEqual([[month('2026-09', 40)]]);
  });

  it('gives each month its own portrait page, since dates run down the page', () => {
    expect(packPages([month('2026-09', 3), month('2026-10', 3)], 'portrait').length).toBe(2);
  });
});

describe('shortPrice', () => {
  it('drops needless decimals', () => {
    expect(shortPrice(6)).toBe('6');
    expect(shortPrice(5.5)).toBe('5.5');
    expect(shortPrice(7.25)).toBe('7.25');
  });
});

describe('magazineTable', () => {
  it('puts each month’s issue numbers in its cell, the yearly price last, issue counts and the price total below', () => {
    const t = magazineTable([
      { periodicalId: 1, name: 'India Today', frequency: 'WEEKLY', subscriptionAmount: 1500, receipts: [
        { id: 2, issueNo: 41, receivedOn: '2026-10-12', periodFrom: '2026-10-12', periodTo: '2026-10-18' },
        { id: 1, issueNo: 40, receivedOn: '2026-10-05', periodFrom: '2026-10-05', periodTo: '2026-10-11' },
        { id: 3, issueNo: 1, receivedOn: '2025-12-29', periodFrom: '2025-12-29', periodTo: '2026-01-04' },
      ] },
      { periodicalId: 2, name: 'Lokrajya', frequency: 'MONTHLY', receipts: [
        { id: 4, issueNo: null, receivedOn: '2026-02-05', periodFrom: '2026-02-05', periodTo: '2026-02-05' },
      ] },
    ], 2026);
    expect(t.header).toEqual(['Magazine', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Price Rs.']);
    expect(t.body[0][10]).toBe('40,41');
    expect(t.body[0][13]).toBe('1500');
    expect(t.body[1][13]).toBe('');
    expect(t.body[1][2]).toBe('*');
    expect(t.totals[10]).toBe('2');
    expect(t.totals[1]).toBe('');
    expect(t.totals[0]).toBe('Total');
    expect(t.totals[13]).toBe('1500');
  });

  it('marksACombinedIssueJod', () => {
    const t = magazineTable([
      { periodicalId: 5, name: 'Chitralekha', frequency: 'FORTNIGHTLY', receipts: [
        { id: 1, issueNo: 18, receivedOn: '2026-09-01', periodFrom: '2026-09-01', periodTo: '2026-09-30' },
        { id: 2, issueNo: 19, receivedOn: '2026-10-01', periodFrom: '2026-10-01', periodTo: '2026-10-15' },
      ] },
    ], 2026);
    expect(t.body[0][9]).toBe('जोड 18');
    expect(t.body[0][10]).toBe('19');
  });
});

describe('bookMovesTable', () => {
  it('lists books student by student, the name once, with reg. no. and issued and returned dates', () => {
    const issue = (id: number, studentName: string) => ({ id, bookId: id, bookTitle: 'Book ' + id, author: 'A', studentId: id, studentName,
      issuedByName: 'Admin', issueDate: '2026-10-02', dueDate: '2026-10-16', status: 'ISSUED' as const, registrationNumber: 'R-' + id });
    const kunal = { ...issue(1, 'Kunal'), returnDate: '2026-10-09' };
    const t = bookMovesTable([
      { studentId: 1, studentName: 'Kunal', given: 2, returned: 1, books: [
        { issue: kunal, moves: [{ date: '2026-10-02', kind: 'out', issue: kunal }, { date: '2026-10-09', kind: 'back', issue: kunal }] },
        { issue: issue(2, 'Kunal'), moves: [{ date: '2026-10-05', kind: 'out', issue: issue(2, 'Kunal') }] },
      ] },
    ]);
    expect(t.header).toEqual(['Student', 'Book', 'Reg. no.', 'Issued on', 'Returned on']);
    expect(t.body).toEqual([['Kunal (2)', 'Book 1', 'R-1', '2 Oct 2026', '9 Oct 2026'], ['', 'Book 2', 'R-2', '2 Oct 2026', '']]);
    expect(t.totals).toEqual(['Total', '2 books, 1 student', '', '2 given', '1 back']);
    expect(t.widths?.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});

describe('bookMovesPdf', () => {
  it('saves the year as portrait A4 pages', async () => {
    const issue = { id: 1, bookId: 1, bookTitle: 'Yayati', author: 'A', studentId: 1, studentName: 'Kunal More',
      issuedByName: 'Admin', issueDate: '2026-03-02', dueDate: '2026-03-16', status: 'ISSUED' as const };
    const bytes = await bookMovesPdf([{ studentId: 1, studentName: 'Kunal More', given: 1, returned: 0,
      books: [{ issue, moves: [{ date: '2026-03-02', kind: 'out', issue }] }] }], '2026', 'Rahul Library');
    const text = new TextDecoder('latin1').decode(bytes);
    expect(text).toContain('/MediaBox [0 0 595 842]');
    expect(text).not.toContain('/MediaBox [0 0 842 595]');
  });
});
