import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBadge, IonContent, IonHeader, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel,
  IonList, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonSkeletonText, IonTitle,
  IonToolbar, ModalController, RefresherCustomEvent, ViewWillEnter
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Book, FREQUENCY_LABELS, PeriodicalSummary, byFrequency } from '../../core/models';
import { PagedList } from '../../core/paged-list';
import { MarathiPipe } from '../../core/pipes';
import { errorMessage } from '../../core/ui.service';
import { BookDetailModal } from './book-detail.modal';
import { BookFormModal } from './book-form.modal';
import { ImportBooksModal } from './import-books.modal';

@Component({
  selector: 'app-catalog',
  templateUrl: 'catalog.page.html',
  styleUrls: ['catalog.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonSearchbar, IonContent, IonRefresher, IonRefresherContent, IonList,
    IonSegment, IonSegmentButton, IonItem, IonLabel, IonBadge, IonInfiniteScroll, IonInfiniteScrollContent, IonSkeletonText, MarathiPipe
  ],
})
export class CatalogPage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);
  protected auth = inject(AuthService);

  readonly query = signal('');
  readonly books = new PagedList<Book>((page, size) => this.api.books(this.query(), page, size), 'Could not load books.');

  /** Books by default; the other tab lists the subscribed newspapers and magazines. */
  readonly tab = signal<'books' | 'papers'>('books');
  /** null until loaded. */
  readonly papers = signal<PeriodicalSummary[] | null>(null);
  readonly papersError = signal('');
  /** Daily, weekly, fortnightly, monthly: a card each. */
  readonly paperGroups = computed(() => byFrequency(this.papers() ?? []));
  protected readonly labels = FREQUENCY_LABELS;

  ionViewWillEnter() {
    // Reload only when stale, so availability is current without refetching on every tab switch.
    this.books.revisit();
  }

  setTab(value: unknown) {
    this.tab.set(value === 'papers' ? 'papers' : 'books');
    if (this.tab() === 'papers' && !this.papers()) {
      this.loadPapers();
    }
  }

  refresh(event: RefresherCustomEvent) {
    if (this.tab() === 'books') {
      this.books.refresh(event);
    } else {
      this.loadPapers(() => event.target.complete());
    }
  }

  private loadPapers(done?: () => void) {
    this.papersError.set('');
    this.api.subscribedPeriodicals().subscribe({
      next: list => { this.papers.set(list); done?.(); },
      error: err => { this.papersError.set(errorMessage(err, 'Could not load newspapers and magazines.')); done?.(); },
    });
  }

  search(value: string | null | undefined) {
    this.query.set((value ?? '').trim());
    this.books.reset();
  }

  async open(book: Book) {
    const modal = await this.modals.create({ component: BookDetailModal, componentProps: { book } });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<Book>();
    if (role === 'deleted') {
      this.books.remove(b => b.id === book.id);
    } else if (role === 'changed' && data) {
      this.books.replace(b => b.id === data.id, data);
    }
  }

  async add() {
    const modal = await this.modals.create({ component: BookFormModal });
    await modal.present();
    const { role } = await modal.onWillDismiss<Book>();
    if (role === 'saved') {
      this.books.reset();
    }
  }

  async importExcel() {
    const modal = await this.modals.create({ component: ImportBooksModal });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'imported') {
      this.books.reset();
    }
  }
}
