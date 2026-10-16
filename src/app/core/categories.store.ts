import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Freshness } from './freshness';
import { BookCategory, BookCategoryRequest } from './models';
import { errorMessage } from './ui.service';

/**
 * The book category master, loaded once and shared by the Configuration screens
 * and the book forms' Category dropdown. Saves and deletes keep it current.
 */
@Injectable({ providedIn: 'root' })
export class CategoriesStore {
  private api = inject(ApiService);

  readonly items = signal<BookCategory[]>([]);
  readonly loaded = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  private freshness = new Freshness();

  /** Loads the list if it hasn't been loaded yet (or `force` to refresh). */
  load(force = false) {
    if ((this.loaded() && !force) || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.freshness.mark();
    this.api.categories().subscribe({
      next: list => {
        this.items.set(list);
        this.loaded.set(true);
        this.loading.set(false);
      },
      error: err => {
        this.freshness.invalidate();
        this.error.set(errorMessage(err, 'Could not load book categories.'));
        this.loading.set(false);
      }
    });
  }

  /** For ionViewWillEnter: reloads only if the list is stale (see Freshness). */
  revisit() {
    if (this.freshness.isStale()) {
      this.load(true);
    }
  }

  save(category: BookCategoryRequest, id?: number): Observable<BookCategory> {
    // Reload afterwards: the server owns the sort order (by category number).
    return this.api.saveCategory(category, id).pipe(tap(() => this.load(true)));
  }

  delete(id: number): Observable<void> {
    return this.api.deleteCategory(id).pipe(tap(() => this.items.update(list => list.filter(c => c.id !== id))));
  }
}
