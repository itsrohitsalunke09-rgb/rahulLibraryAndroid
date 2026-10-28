import { Book, BookRequest } from '../../core/models';

/** Category dropdown value for an old text-only category that is not in the master. */
export const KEEP_TEXT_CATEGORY = 'text';

/**
 * Book fields as edited in a form: number fields arrive as strings ('' when cleared).
 * `categoryChoice` is the Category dropdown: a master category id, '' for none, or KEEP_TEXT_CATEGORY.
 */
export type BookFormModel = { [K in keyof BookRequest]: BookRequest[K] | string | null | undefined } & {
  categoryChoice: string;
};

/** Form values for an existing book (or an empty new one). */
export function bookFormFrom(book?: Book): BookFormModel {
  if (!book) {
    return { title: '', author: '', totalCopies: 1, categoryChoice: '' };
  }
  const { id, availableCopies, ...fields } = book;
  return { ...fields, categoryChoice: categoryChoiceOf(book) };
}

/** The old text category of a book that is not linked to the master, if any. */
export function unlinkedCategory(book?: Book): string {
  return book && book.categoryId == null && book.category?.trim() ? book.category.trim() : '';
}

function categoryChoiceOf(book: Book): string {
  if (book.categoryId != null) {
    return String(book.categoryId);
  }
  return unlinkedCategory(book) ? KEEP_TEXT_CATEGORY : '';
}

/** Validates the form; returns the request to send, or an error message to show. */
export function toBookRequest(form: BookFormModel): { request: BookRequest } | { error: string } {
  const title = text(form.title);
  const author = text(form.author);
  const totalCopies = num(form.totalCopies);
  if (!title || !author) {
    return { error: 'Title and author are required.' };
  }
  if (!totalCopies || !Number.isInteger(totalCopies) || totalCopies < 1 || totalCopies > 10000) {
    return { error: 'Total copies must be a whole number from 1 to 10,000.' };
  }
  // Optional numbers: checked only when filled in.
  const year = num(form.publicationYear);
  const thisYear = new Date().getFullYear();
  if (year !== undefined && (!Number.isInteger(year) || year < 1000 || year > thisYear)) {
    return { error: `Publication year must be between 1000 and ${thisYear}.` };
  }
  const pages = num(form.pageCount);
  if (pages !== undefined && (!Number.isInteger(pages) || pages < 1 || pages > 100000)) {
    return { error: 'Pages must be a whole number, 1 or more.' };
  }
  const price = num(form.price);
  if (price !== undefined && (price < 0 || price > 1000000)) {
    return { error: 'Price must be between 0 and 10,00,000.' };
  }
  const notNumber = (['publicationYear', 'pageCount', 'price'] as const)
    .find(k => text(form[k]) !== undefined && num(form[k]) === undefined);
  if (notNumber) {
    return { error: 'Year, pages and price must be numbers.' };
  }
  const choice = form.categoryChoice;
  return {
    request: {
      title,
      author,
      totalCopies,
      // A master category is sent by id; an old text category is kept as text.
      categoryId: choice && choice !== KEEP_TEXT_CATEGORY ? Number(choice) : undefined,
      category: choice === KEEP_TEXT_CATEGORY ? text(form.category) : undefined,
      description: text(form.description),
      date: text(form.date),
      registrationNumber: text(form.registrationNumber),
      publication: text(form.publication),
      publicationYear: year,
      pageCount: pages,
      seller: text(form.seller),
      receiptNumber: text(form.receiptNumber),
      price,
    }
  };
}

function text(value: unknown): string | undefined {
  const s = value == null ? '' : String(value).trim();
  return s || undefined;
}

function num(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
