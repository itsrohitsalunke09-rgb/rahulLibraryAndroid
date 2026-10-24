import { Book } from '../../core/models';
import { KEEP_TEXT_CATEGORY, bookFormFrom, toBookRequest } from './book-request';

const book: Book = { id: 9, title: 'Gitanjali', author: 'Tagore', totalCopies: 2, availableCopies: 1 };

describe('toBookRequest', () => {
  it('requires a title and an author', () => {
    expect(toBookRequest({ ...bookFormFrom(), title: '  ', author: 'Tagore' })).toEqual({ error: 'Title and author are required.' });
  });

  it('requires at least one copy', () => {
    const form = { ...bookFormFrom(), title: 'Gitanjali', author: 'Tagore' };
    expect(toBookRequest({ ...form, totalCopies: '0' })).toEqual({ error: 'Total copies must be at least 1.' });
    expect(toBookRequest({ ...form, totalCopies: '' })).toEqual({ error: 'Total copies must be at least 1.' });
  });

  it('sends a master category by id, trims text and turns number fields into numbers', () => {
    const form = { ...bookFormFrom(book), title: ' Gitanjali ', categoryChoice: '4', category: 'Poetry', price: '120.5', pageCount: '' };
    const result = toBookRequest(form);
    expect('request' in result && result.request).toMatchObject({
      title: 'Gitanjali', totalCopies: 2, categoryId: 4, category: undefined, price: 120.5, pageCount: undefined
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
