import { signal } from '@angular/core';
import { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';
import { Observable, Subscription } from 'rxjs';
import { Page } from './models';
import { errorMessage } from './ui.service';

/**
 * State for an infinite-scrolling list backed by a Spring `Page` endpoint.
 * `fetch(page)` returns the requested page; `reset()` starts over (e.g. after a search change).
 */
export class PagedList<T> {
  readonly items = signal<T[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly finished = signal(false);
  readonly error = signal('');
  /** True once the first page has arrived, so templates can tell "empty" from "not loaded yet". */
  readonly loaded = signal(false);

  private page = 0;
  private request?: Subscription;

  constructor(private fetch: (page: number) => Observable<Page<T>>, private errorText = 'Could not load the list.') {}

  reset(done?: () => void) {
    this.request?.unsubscribe();
    this.page = 0;
    this.finished.set(false);
    this.load(true, done);
  }

  /** ion-infinite-scroll handler. */
  more(event: InfiniteScrollCustomEvent) {
    if (this.finished() || this.loading()) {
      event.target.complete();
      return;
    }
    this.load(false, () => event.target.complete());
  }

  /** ion-refresher handler. */
  refresh(event: RefresherCustomEvent) {
    this.reset(() => event.target.complete());
  }

  /** Replace one item in place after it was changed elsewhere (e.g. a book returned). */
  replace(match: (item: T) => boolean, updated: T) {
    this.items.update(list => list.map(item => (match(item) ? updated : item)));
  }

  remove(match: (item: T) => boolean) {
    this.items.update(list => list.filter(item => !match(item)));
    this.total.update(n => Math.max(0, n - 1));
  }

  private load(replace: boolean, done?: () => void) {
    this.loading.set(true);
    this.request = this.fetch(this.page).subscribe({
      next: page => {
        this.items.update(list => (replace ? page.content : [...list, ...page.content]));
        this.total.set(page.totalElements);
        this.finished.set(page.last || page.content.length === 0);
        this.page++;
        this.error.set('');
        this.loading.set(false);
        this.loaded.set(true);
        done?.();
      },
      error: err => {
        this.error.set(errorMessage(err, this.errorText));
        this.loading.set(false);
        this.loaded.set(true);
        done?.();
      }
    });
  }
}
