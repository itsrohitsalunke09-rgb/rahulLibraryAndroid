import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { markDataChanged } from './freshness';
import {
  Book, BookCategory, BookCategoryRequest, BookImportResult, BookIssue, BookRequest, Dashboard, IssueCounts, IssueStatus, NewsStory, NewsStoryRequest, Page,
  ProfileUpdate, Role, UnlinkedCategory, UserAccount, UserRequest
} from './models';

/** Thin wrapper over the Spring Boot API (same endpoints the website uses). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ---- Dashboard ----
  /** With a year, the out / overdue numbers count only issues made in that year. */
  dashboard(year?: number | null) {
    const params = year ? new HttpParams().set('year', year) : undefined;
    return this.http.get<Dashboard>(`${this.base}/dashboard`, { params });
  }

  // ---- Books ----
  /** Catalog page in registration-number order (1, 2, 10…); books without one come last. */
  books(q: string, page: number, size = 20) {
    let params = new HttpParams()
      .set('page', page).set('size', size).set('sort', 'registrationNumber').set('direction', 'asc');
    if (q) {
      params = params.set('q', q);
    }
    return this.http.get<Page<Book>>(`${this.base}/books/paged`, { params });
  }

  book(id: number) {
    return this.http.get<Book>(`${this.base}/books/${id}`);
  }

  saveBook(book: BookRequest, id?: number) {
    return changes(id
      ? this.http.put<Book>(`${this.base}/books/${id}`, book)
      : this.http.post<Book>(`${this.base}/books`, book));
  }

  deleteBook(id: number) {
    return changes(this.http.delete<void>(`${this.base}/books/${id}`));
  }

  /** Book category master, sorted by category number. */
  categories() {
    return this.http.get<BookCategory[]>(`${this.base}/categories`);
  }

  /** Categories typed on books that match no master category yet, with book counts. */
  unlinkedCategories() {
    return this.http.get<UnlinkedCategory[]>(`${this.base}/categories/unlinked`);
  }

  saveCategory(category: BookCategoryRequest, id?: number) {
    return changes(id
      ? this.http.put<BookCategory>(`${this.base}/categories/${id}`, category)
      : this.http.post<BookCategory>(`${this.base}/categories`, category));
  }

  deleteCategory(id: number) {
    return changes(this.http.delete<void>(`${this.base}/categories/${id}`));
  }

  /** Bulk-add books from an .xlsx sheet (admin and librarian only). */
  importBooks(file: File) {
    const form = new FormData();
    form.append('file', file);
    return changes(this.http.post<BookImportResult>(`${this.base}/books/import`, form));
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

  /** Issues made in the given year (by issued date), newest first; optionally only one status. */
  issuesInYear(year: number, page: number, size = 20, status?: IssueStatus) {
    let params = new HttpParams().set('page', page).set('size', size).set('year', year);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Page<BookIssue>>(`${this.base}/issues`, { params });
  }

  /** Years that have issues, latest first, for the Issues year filter. */
  issueYears() {
    return this.http.get<number[]>(`${this.base}/issues/years`);
  }

  /** Every copy currently out (not returned), overdue ones included. */
  issuesOut(page: number, size = 20, year?: number | null) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (year) {
      params = params.set('year', year);
    }
    return this.http.get<Page<BookIssue>>(`${this.base}/issues/issued`, { params });
  }

  /** Tab counts; with a year, only issues made in that year. */
  issueCounts(year?: number | null) {
    const params = year ? new HttpParams().set('year', year) : undefined;
    return this.http.get<IssueCounts>(`${this.base}/issues/counts`, { params });
  }

  myIssues(page: number, size = 20) {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<BookIssue>>(`${this.base}/issues/mine`, { params });
  }

  issueBook(bookId: number, studentId: number, days: number) {
    return changes(this.http.post<BookIssue>(`${this.base}/issues`, { bookId, studentId, days }));
  }

  returnBook(issueId: number) {
    return changes(this.http.post<BookIssue>(`${this.base}/issues/${issueId}/return`, {}));
  }

  // ---- Users ----
  /** q matches the start of the name, username, email or phone, in any role or active state. */
  users(page: number, size = 20, role?: Role, q?: string) {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', 'fullName,asc');
    if (role) {
      params = params.set('role', role);
    }
    if (q) {
      params = params.set('q', q);
    }
    return this.http.get<Page<UserAccount>>(`${this.base}/users`, { params });
  }

  /** Active students whose name, username, email or phone starts with q. */
  searchStudents(q: string) {
    return this.http.get<UserAccount[]>(`${this.base}/users/students`, { params: { q } });
  }

  saveUser(user: UserRequest, id?: number) {
    return changes(id
      ? this.http.put<UserAccount>(`${this.base}/users/${id}`, user)
      : this.http.post<UserAccount>(`${this.base}/users`, user));
  }

  deleteUser(id: number) {
    return changes(this.http.delete<void>(`${this.base}/users/${id}`));
  }

  /** The user's Aadhaar card photo (staff only); 404 when none was added. */
  aadhaarPhoto(userId: number) {
    return this.http.get(`${this.base}/users/${userId}/aadhaar`, { responseType: 'blob' });
  }

  /** Stores or replaces the Aadhaar card photo; photo is the already-shrunk image. */
  saveAadhaarPhoto(userId: number, photo: Blob) {
    const form = new FormData();
    form.append('photo', photo, 'aadhaar.jpg');
    return this.http.put<void>(`${this.base}/users/${userId}/aadhaar`, form);
  }

  deleteAadhaarPhoto(userId: number) {
    return this.http.delete<void>(`${this.base}/users/${userId}/aadhaar`);
  }

  updateProfile(profile: ProfileUpdate) {
    return changes(this.http.put<UserAccount>(`${this.base}/users/profile`, profile));
  }

  // ---- News ----
  /** q matches part of the headline. */
  news(page: number, size = 10, q?: string) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q) {
      params = params.set('q', q);
    }
    return this.http.get<Page<NewsStory>>(`${this.base}/news`, { params });
  }

  /** Creates a story, or updates it when id is given; photo is the already-shrunk image, if changed. */
  saveStory(story: NewsStoryRequest, photo?: Blob | null, id?: number) {
    const form = new FormData();
    form.append('story', new Blob([JSON.stringify(story)], { type: 'application/json' }));
    if (photo) {
      form.append('photo', photo, 'photo.jpg');
    }
    return changes(id
      ? this.http.put<NewsStory>(`${this.base}/news/${id}`, form)
      : this.http.post<NewsStory>(`${this.base}/news`, form));
  }

  deleteStory(id: number) {
    return changes(this.http.delete<void>(`${this.base}/news/${id}`));
  }

  /** The version in the URL keeps a replaced photo from being served stale from cache. */
  storyPhoto(id: number, version: number) {
    return this.http.get(`${this.base}/news/${id}/photo?v=${version}`, { responseType: 'blob' });
  }
}

/** Marks cached tab data stale once a write succeeds, so other tabs reload on the next visit. */
function changes<T>(request: Observable<T>): Observable<T> {
  return request.pipe(tap({ next: () => markDataChanged() }));
}
