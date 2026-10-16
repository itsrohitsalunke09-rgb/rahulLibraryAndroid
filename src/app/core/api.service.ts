import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  Book, BookCategory, BookCategoryRequest, BookImportResult, BookIssue, BookRequest, Dashboard, IssueCounts, IssueStatus, Page,
  ProfileUpdate, Role, UserAccount, UserRequest
} from './models';

/** Thin wrapper over the Spring Boot API (same endpoints the website uses). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ---- Dashboard ----
  dashboard() {
    return this.http.get<Dashboard>(`${this.base}/dashboard`);
  }

  // ---- Books ----
  books(q: string, page: number, size = 20) {
    let params = new HttpParams()
      .set('page', page).set('size', size).set('sort', 'title').set('direction', 'asc');
    if (q) {
      params = params.set('q', q);
    }
    return this.http.get<Page<Book>>(`${this.base}/books/paged`, { params });
  }

  book(id: number) {
    return this.http.get<Book>(`${this.base}/books/${id}`);
  }

  saveBook(book: BookRequest, id?: number) {
    return id
      ? this.http.put<Book>(`${this.base}/books/${id}`, book)
      : this.http.post<Book>(`${this.base}/books`, book);
  }

  deleteBook(id: number) {
    return this.http.delete<void>(`${this.base}/books/${id}`);
  }

  /** Book category master, sorted by category number. */
  categories() {
    return this.http.get<BookCategory[]>(`${this.base}/categories`);
  }

  saveCategory(category: BookCategoryRequest, id?: number) {
    return id
      ? this.http.put<BookCategory>(`${this.base}/categories/${id}`, category)
      : this.http.post<BookCategory>(`${this.base}/categories`, category);
  }

  deleteCategory(id: number) {
    return this.http.delete<void>(`${this.base}/categories/${id}`);
  }

  /** Bulk-add books from an .xlsx sheet (admin and librarian only). */
  importBooks(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<BookImportResult>(`${this.base}/books/import`, form);
  }

  bookIssues(bookId: number) {
    return this.http.get<BookIssue[]>(`${this.base}/books/${bookId}/issues`);
  }

  // ---- Issues ----
  /** status: undefined = all. A search query ignores the status filter (backend behaviour). */
  issues(page: number, size = 20, status?: IssueStatus, q?: string) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (!status && !q) {
      params = params.append('sort', 'issueDate,desc').append('sort', 'id,desc');
    }
    if (status) {
      params = params.set('status', status);
    }
    if (q) {
      params = params.set('q', q);
    }
    return this.http.get<Page<BookIssue>>(`${this.base}/issues`, { params });
  }

  /** Every copy currently out (not returned), overdue ones included. */
  issuesOut(page: number, size = 20) {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<BookIssue>>(`${this.base}/issues/issued`, { params });
  }

  issueCounts() {
    return this.http.get<IssueCounts>(`${this.base}/issues/counts`);
  }

  myIssues(page: number, size = 20) {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<BookIssue>>(`${this.base}/issues/mine`, { params });
  }

  issueBook(bookId: number, studentId: number, days: number) {
    return this.http.post<BookIssue>(`${this.base}/issues`, { bookId, studentId, days });
  }

  returnBook(issueId: number) {
    return this.http.post<BookIssue>(`${this.base}/issues/${issueId}/return`, {});
  }

  // ---- Users ----
  users(page: number, size = 20, role?: Role) {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', 'fullName,asc');
    if (role) {
      params = params.set('role', role);
    }
    return this.http.get<Page<UserAccount>>(`${this.base}/users`, { params });
  }

  /** Active students whose name, username, email or phone starts with q. */
  searchStudents(q: string) {
    return this.http.get<UserAccount[]>(`${this.base}/users/students`, { params: { q } });
  }

  saveUser(user: UserRequest, id?: number) {
    return id
      ? this.http.put<UserAccount>(`${this.base}/users/${id}`, user)
      : this.http.post<UserAccount>(`${this.base}/users`, user);
  }

  deleteUser(id: number) {
    return this.http.delete<void>(`${this.base}/users/${id}`);
  }

  updateProfile(profile: ProfileUpdate) {
    return this.http.put<UserAccount>(`${this.base}/users/profile`, profile);
  }
}
