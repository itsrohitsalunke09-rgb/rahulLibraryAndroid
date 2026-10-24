import { signal } from '@angular/core';
import { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';
import { Observable, Subscription } from 'rxjs';
import { Freshness } from './freshness';
import { Page } from './models';
import { errorMessage } from './ui.service';

/** Rows per infinite-scroll page. */
export const PAGE_SIZE = 20;
/** Most rows reloaded in one request when the user comes back to a long, scrolled list. */
const MAX_REVISIT_ROWS = 100;

/**
 * State for an infinite-scrolling list backed by a Spring `Page` endpoint.
 * `fetch(page, size)` returns the requested page; `reset()` starts over (e.g. after a search change).
 */
export class PagedList<T> {
  readonly items = signal<T[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly finished = signal(false);
  readonly error = signal('');
  /** True once the first page has arrived, so templates can tell "empty" from "not loaded yet". */
  readonly loaded = signal(false);

  /** Next page index, counted in PAGE_SIZE pages. */
  private page = 0;
  private request?: Subscription;
  /** Callback of the request in flight; run if that request is cancelled, so its spinner still completes. */
  private pendingDone?: () => void;
  private freshness = new Freshness();

  constructor(
    private fetch: (page: number, size: number) => Observable<Page<T>>,
    private errorText = 'Could not load the list.'
  ) {}

  reset(done?: () => void) {
    this.load(0, PAGE_SIZE, done);
  }

  /**
   * For ionViewWillEnter: reloads only if the list is stale (see Freshness). The rows already
   * shown stay on screen meanwhile and are reloaded in one request, so the scroll position holds.
   * Returns whether it reloaded.
   */
  revisit(): boolean {
    if (this.loading() || !this.freshness.isStale()) {
      return false;
    }
    const shown = Math.ceil(this.items().length / PAGE_SIZE) * PAGE_SIZE;
    this.load(0, Math.min(Math.max(shown, PAGE_SIZE), MAX_REVISIT_ROWS));
    return true;
  }

  /** ion-infinite-scroll handler. */
  more(event: InfiniteScrollCustomEvent) {
    if (this.finished() || this.loading()) {
      event.target.complete();
      return;
    }
    this.load(this.page, PAGE_SIZE, () => event.target.complete());
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

  /** `size` is a multiple of PAGE_SIZE, so later pages still line up with what is loaded. */
  private load(page: number, size: number, done?: () => void) {
    const replace = page === 0;
    if (replace) {
      this.request?.unsubscribe();
      // An unfinished infinite-scroll event never fires again, so finish the cancelled one.
      this.pendingDone?.();
      this.finished.set(false);
      this.freshness.mark();
    }
    this.loading.set(true);
    this.pendingDone = done;
    this.request = this.fetch(page, size).subscribe({
      next: result => {
        this.pendingDone = undefined;
        this.items.update(list => (replace ? result.content : [...list, ...result.content]));
        this.total.set(result.totalElements);
        this.finished.set(result.last || result.content.length === 0);
        this.page = page + size / PAGE_SIZE;
        this.error.set('');
        this.loading.set(false);
        this.loaded.set(true);
        done?.();
      },
      error: err => {
        this.pendingDone = undefined;
        if (replace) {
          this.freshness.invalidate();
        }
        this.error.set(errorMessage(err, this.errorText));
        this.loading.set(false);
        this.loaded.set(true);
        done?.();
      }
    });
  }
}
