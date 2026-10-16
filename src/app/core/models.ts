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
  category?: string;
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

export type BookRequest = Omit<Book, 'id' | 'availableCopies'>;

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
