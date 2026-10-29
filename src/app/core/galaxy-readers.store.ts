import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { ReaderCount } from './models';
import { errorMessage } from './ui.service';

const KEY = 'rahul-library.galaxy-readers';

/**
 * This year's readers (books per student) for the Reading Galaxy and its banner. Kept on the phone so the
 * galaxy shows at once, from the last copy; refreshed from the server when the app starts and when the
 * galaxy opens.
 */
@Injectable({ providedIn: 'root' })
export class GalaxyReadersStore {
  private api = inject(ApiService);

  readonly year = new Date().getFullYear();
  /** null until there is a saved copy or the first answer from the server. */
  readonly readers = signal<ReaderCount[] | null>(loadSaved(this.year));
  readonly error = signal('');
  private loading = false;

  refresh(done?: () => void) {
    if (this.loading) {
      done?.();
      return;
    }
    this.loading = true;
    this.api.readersInYear(this.year).subscribe({
      next: list => {
        this.loading = false;
        this.readers.set(list);
        this.error.set('');
        save(this.year, list);
        done?.();
      },
      error: err => {
        this.loading = false;
        // With a saved copy on screen, stay quiet; without one, say why the galaxy is empty.
        if (!this.readers()) {
          this.error.set(errorMessage(err, 'Could not load this year’s readers.'));
        }
        done?.();
      },
    });
  }
}

/** The saved copy for this year, if any (a copy from last year is ignored). */
export function loadSaved(year: number): ReaderCount[] | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { year: number; readers: ReaderCount[] } | null;
    return saved?.year === year && Array.isArray(saved.readers) ? saved.readers : null;
  } catch {
    return null;
  }
}

function save(year: number, readers: ReaderCount[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ year, readers }));
  } catch {
    // Storage full or unavailable: the galaxy still works, it just loads from the server next time.
  }
}
