import { jpegToPdf, shortPrice } from './register-pdf';

describe('jpegToPdf', () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
  const pdf = jpegToPdf(jpeg, 2105, 1488);
  const text = new TextDecoder('latin1').decode(pdf);

  it('is a one-page A4 landscape PDF with the image at full page', () => {
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/MediaBox [0 0 842 595]');
    expect(text).toContain('/Width 2105 /Height 1488');
    expect(text).toContain(`/Length ${jpeg.length}`);
  });

  it('points every cross-reference entry at its object', () => {
    const xrefAt = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(xrefAt, xrefAt + 4)).toBe('xref');
    const entries = text.slice(xrefAt).split('\n').slice(3, 8);
    entries.forEach((entry, i) => {
      const offset = Number(entry.slice(0, 10));
      expect(text.startsWith(`${i + 1} 0 obj\n`, offset)).toBe(true);
    });
  });

  it('keeps the image bytes unchanged', () => {
    const start = text.indexOf('stream\n') + 'stream\n'.length;
    expect(Array.from(pdf.slice(start, start + jpeg.length))).toEqual(Array.from(jpeg));
  });
});

describe('shortPrice', () => {
  it('drops a ₹ sign and needless decimals', () => {
    expect(shortPrice(6)).toBe('6');
    expect(shortPrice(5.5)).toBe('5.5');
    expect(shortPrice(7.25)).toBe('7.25');
  });
});
