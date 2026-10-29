import { Book } from '../../core/models';
import { KEEP_TEXT_CATEGORY, bookFormFrom, toBookRequest } from './book-request';
import { publicationYears } from './book-form.modal';

const book: Book = { id: 9, title: 'Gitanjali', author: 'Tagore', availableCopies: 1 };

describe('toBookRequest', () => {
  it('requires a title and an author', () => {
    expect(toBookRequest({ ...bookFormFrom(), title: '  ', author: 'Tagore' })).toEqual({ error: 'Title and author are required.' });
  });

  it('checks the year, pages and price only when filled in', () => {
    const form = { ...bookFormFrom(), title: 'Gitanjali', author: 'Tagore' };
    const year = new Date().getFullYear();
    expect(toBookRequest({ ...form, publicationYear: String(year + 1) })).toEqual({ error: `Publication year must be between 1000 and ${year}.` });
    expect(toBookRequest({ ...form, pageCount: '-3' })).toEqual({ error: 'Pages must be a whole number, 1 or more.' });
    expect(toBookRequest({ ...form, price: '-1' })).toEqual({ error: 'Price must be between 0 and 10,00,000.' });
    expect(toBookRequest({ ...form, price: 'abc' })).toEqual({ error: 'Year, pages and price must be numbers.' });
    expect('request' in toBookRequest({ ...form, publicationYear: '1913', pageCount: '', price: '' })).toBe(true);
  });

  it('sends a master category by id, trims text and turns number fields into numbers', () => {
    const form = { ...bookFormFrom(book), title: ' Gitanjali ', categoryChoice: '4', category: 'Poetry', price: '120.5', pageCount: '' };
    const result = toBookRequest(form);
    expect('request' in result && result.request).toMatchObject({
      title: 'Gitanjali', categoryId: 4, category: undefined, price: 120.5, pageCount: undefined
    });
  });

  it('keeps an old text category as text', () => {
    const old = { ...book, category: ' Marathi Literature ', categoryId: null };
    const form = bookFormFrom(old);
    expect(form.categoryChoice).toBe(KEEP_TEXT_CATEGORY);
    const result = toBookRequest(form);
    expect('request' in result && result.request).toMatchObject({ categoryId: undefined, category: 'Marathi Literature' });
  });

  it('sends no category when none is chosen', () => {
    const result = toBookRequest({ ...bookFormFrom(book), categoryChoice: '' });
    expect('request' in result && result.request).toMatchObject({ categoryId: undefined, category: undefined });
  });
});

describe('publicationYears', () => {
  it('runsFromThisYearBackTo1800AndKeepsAnOlderYear', () => {
    const years = publicationYears(2026);
    expect(years[0]).toBe(2026);
    expect(years[years.length - 1]).toBe(1800);
    expect(publicationYears(2026, 1750).at(-1)).toBe(1750);
    expect(publicationYears(2026, 1913).length).toBe(years.length);
  });
});
