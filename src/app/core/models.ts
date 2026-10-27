export type Role = 'ADMIN' | 'LIBRARIAN' | 'STUDENT';
export type IssueStatus = 'ISSUED' | 'RETURNED' | 'OVERDUE';

export interface AuthUser {
  token: string;
  id: number;
  username: string;
  fullName: string;
  role: Role;
}

export interface UserAccount {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  role: Role;
  active: boolean;
}

export interface UserRequest {
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: Role;
  active: boolean;
  password?: string;
}

export interface ProfileUpdate {
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  password?: string;
}

export interface RegistrationRequest {
  fullName: string;
  dateOfBirth: string;
  address: string;
  phone: string;
  email: string;
  username: string;
  password: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  /** Category name; comes from the book category master when the book is linked to it. */
  category?: string;
  /** Linked master category (null for none or an old text-only category). */
  categoryId?: number | null;
  categoryNumber?: string | null;
  description?: string;
  totalCopies: number;
  availableCopies: number;
  date?: string;
  registrationNumber?: string;
  publication?: string;
  publicationYear?: number;
  pageCount?: number;
  seller?: string;
  receiptNumber?: string;
  price?: number;
}

export type BookRequest = Omit<Book, 'id' | 'availableCopies' | 'categoryNumber'>;

export interface BookIssue {
  id: number;
  bookId: number;
  bookTitle: string;
  author: string;
  studentId: number;
  studentName: string;
  issuedByName: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: IssueStatus;
  category?: string;
}

export interface Dashboard {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  overdueCopies: number;
  students: number;
  librarians: number;
}

export interface IssueCounts {
  all: number;
  issued: number;
  overdue: number;
  returned: number;
}

/** Book category master (Configuration). Books link to a category and show its name. */
export interface BookCategory {
  id: number;
  categoryNumber: string;
  name: string;
}

export type BookCategoryRequest = Omit<BookCategory, 'id'>;

/** Result of POST /books/import (Excel bulk import). */
export interface BookImportResult {
  totalRows: number;
  successful: number;
  failed: number;
  errors: string[];
  /** Rows added with a note, e.g. a category number that is not in the master. */
  warnings?: string[];
}

/** A category typed on books before the master existed that matches no master name. */
export interface UnlinkedCategory {
  name: string;
  books: number;
}

/** How a story's card and its full page are laid out. */
export type NewsTemplate = 'CLASSIC' | 'SIDE_PHOTO' | 'NOTICE' | 'PHOTO_BANNER';

export interface NewsStory {
  id: number;
  headline: string;
  body: string;
  /** ISO date (YYYY-MM-DD) the event happened. */
  eventDate: string;
  photoCaption?: string | null;
  hasPhoto: boolean;
  /** Bumps whenever the photo changes, so cached images refresh. */
  photoVersion: number;
  template: NewsTemplate;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsStoryRequest {
  headline: string;
  body: string;
  eventDate: string;
  photoCaption?: string | null;
  removePhoto: boolean;
  template: NewsTemplate;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export const STAFF_ROLES: Role[] = ['ADMIN', 'LIBRARIAN'];

/** Role as shown to people. */
export function roleLabel(role: Role | null): string {
  return role === 'ADMIN' ? 'Admin' : role === 'LIBRARIAN' ? 'Librarian' : 'Student';
}

/** Marathi titles get the Devanagari font. */
export function isMarathi(category?: string): boolean {
  return category === 'Marathi Literature';
}

/** How often a newspaper or magazine comes out. */
export type PeriodicalFrequency = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';

export const FREQUENCY_LABELS: Record<PeriodicalFrequency, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', FORTNIGHTLY: 'Fortnightly', MONTHLY: 'Monthly',
};

/** A subscribed newspaper or magazine as the catalog shows it (no price). */
export type PeriodicalSummary = Pick<Periodical, 'id' | 'name' | 'language' | 'frequency'>;

/** A newspaper or magazine the library takes (Configuration → Newspapers & magazines). */
export interface Periodical {
  id: number;
  name: string;
  language?: string | null;
  frequency: PeriodicalFrequency;
  /** Usual price of one copy, in rupees. */
  price: number;
  /** False once the subscription stops; its register history stays. */
  active: boolean;
}

export type PeriodicalRequest = Omit<Periodical, 'id'>;

/** One line of a day's arrival register. */
export interface RegisterRow {
  periodicalId: number;
  name: string;
  language?: string | null;
  frequency: PeriodicalFrequency;
  defaultPrice: number;
  arrived: boolean;
  price: number;
}

export interface DayRegister {
  date: string;
  rows: RegisterRow[];
}

export interface RegisterEntry {
  periodicalId: number;
  arrived: boolean;
  price: number | null;
}

export interface ReportRow {
  periodicalId: number;
  name: string;
  frequency: PeriodicalFrequency;
  issues: number;
  amount: number;
  /** Days so far this month a daily paper didn't come; null for weeklies and monthlies. */
  missingDays: number | null;
  /** Price paid on each day of the month (index 0 = the 1st); null when no copy came. */
  prices: (number | null)[];
}

export interface MonthReport {
  month: string;
  from: string;
  to: string;
  rows: ReportRow[];
  totalIssues: number;
  totalAmount: number;
}

/** "₹1,250.50" (Indian digit grouping). */
export function rupees(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 })
    .format(amount);
}
