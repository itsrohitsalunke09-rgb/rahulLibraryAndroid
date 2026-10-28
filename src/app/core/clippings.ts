import { Clipping } from './models';

/** Clippings whose title or years contain the search text. */
export function searchClippings(items: Clipping[], query: string): Clipping[] {
  const q = query.toLowerCase();
  return q ? items.filter(c => `${c.title} ${yearsLabel(c)}`.toLowerCase().includes(q)) : items;
}

/** "1990 – 2005", or "2001" for a single year. */
export function yearsLabel(c: Pick<Clipping, 'yearFrom' | 'yearTo'>): string {
  return c.yearFrom === c.yearTo ? String(c.yearFrom) : `${c.yearFrom} – ${c.yearTo}`;
}
