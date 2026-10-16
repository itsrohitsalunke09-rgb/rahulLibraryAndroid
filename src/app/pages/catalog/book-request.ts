import { Book, BookRequest } from '../../core/models';

/** Book fields as edited in a form: number fields arrive as strings ('' when cleared). */
export type BookFormModel = { [K in keyof BookRequest]: BookRequest[K] | string | null | undefined };

/** Form values for an existing book (or an empty new one). */
export function bookFormFrom(book?: Book): BookFormModel {
  if (!book) {
    return { title: '', author: '', totalCopies: 1 };
  }
  const { id, availableCopies, ...fields } = book;
  return { ...fields };
}

/** Validates the form; returns the request to send, or an error message to show. */
export function toBookRequest(form: BookFormModel): { request: BookRequest } | { error: string } {
  const title = text(form.title);
  const author = text(form.author);
  const totalCopies = num(form.totalCopies);
  if (!title || !author) {
    return { error: 'Title and author are required.' };
  }
  if (!totalCopies || totalCopies < 1) {
    return { error: 'Total copies must be at least 1.' };
  }
  return {
    request: {
      title,
      author,
      totalCopies,
      category: text(form.category),
      description: text(form.description),
      date: text(form.date),
      registrationNumber: text(form.registrationNumber),
      publication: text(form.publication),
      publicationYear: num(form.publicationYear),
      pageCount: num(form.pageCount),
      seller: text(form.seller),
      receiptNumber: text(form.receiptNumber),
      price: num(form.price),
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
