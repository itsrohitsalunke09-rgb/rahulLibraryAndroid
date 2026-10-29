import { Component, computed, inject, signal, viewChild } from '@angular/core';
import {
  AlertController, IonBackButton, IonBadge, IonButtons, IonContent, IonHeader, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel,
  IonList, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonTitle,
  IonToolbar, ModalController, RefresherCustomEvent, ViewWillEnter
} from '@ionic/angular';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { searchClippings, yearsLabel } from '../../core/clippings';
import { Book, Clipping, FREQUENCY_LABELS, PeriodicalSummary, byFrequency } from '../../core/models';
import { PagedList } from '../../core/paged-list';
import { MarathiPipe } from '../../core/pipes';
import { UiService, errorMessage } from '../../core/ui.service';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { BookDetailModal } from './book-detail.modal';
import { BookFormModal } from './book-form.modal';
import { PermissionsStore } from '../../core/permissions.store';
import { ImportBooksModal } from './import-books.modal';

@Component({
  selector: 'app-catalog',
  templateUrl: 'catalog.page.html',
  styleUrls: ['catalog.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonSearchbar, IonContent, IonRefresher, IonRefresherContent, IonList,
    IonSegment, IonSegmentButton, IonItem, IonLabel, IonBadge, IonInfiniteScroll, IonInfiniteScrollContent, MarathiPipe,
    PageSkeletonComponent
  ],
})
export class CatalogPage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);
  private alerts = inject(AlertController);
  private ui = inject(UiService);
  protected auth = inject(AuthService);
  /** What this role may do (Roles & permissions). */
  protected perms = inject(PermissionsStore);
  private searchbar = viewChild<IonSearchbar>('bookSearch');
  private router = inject(Router);
  private readonly openRequests = signal(new Set<number>());

  readonly query = signal('');
  readonly books = new PagedList<Book>((page, size) => this.api.books(this.query(), page, size), 'Could not load books.');

  /** Books by default; the others list the subscribed newspapers and magazines, and the कात्रणे. */
  readonly tab = signal<'books' | 'papers' | 'clippings'>('books');
  /** null until loaded. */
  readonly papers = signal<PeriodicalSummary[] | null>(null);
  readonly papersError = signal('');
  /** Daily, weekly, fortnightly, monthly: a card each. */
  readonly paperGroups = computed(() => byFrequency(this.papers() ?? []));
  protected readonly labels = FREQUENCY_LABELS;
  /** null until loaded. */
  readonly clippings = signal<Clipping[] | null>(null);
  readonly clippingsError = signal('');
  readonly clippingQuery = signal('');
  readonly shownClippings = computed(() => searchClippings(this.clippings() ?? [], this.clippingQuery()));
  protected readonly yearsLabel = yearsLabel;

  ionViewWillEnter() {
    // Reload only when stale, so availability is current without refetching on every tab switch.
    this.books.revisit();
    // Fresh each visit: staff may have marked a request done since, which lets the student ask again.
    if (!this.auth.isStaff()) {
      this.loadOpenRequests();
    }
  }

  setTab(value: unknown) {
    this.tab.set(value === 'papers' || value === 'clippings' ? value : 'books');
    if (this.tab() === 'papers' && !this.papers()) {
      this.loadPapers();
    }
    if (this.tab() === 'clippings' && !this.clippings()) {
      this.loadClippings();
    }
  }

  refresh(event: RefresherCustomEvent) {
    if (this.tab() === 'books') {
      this.books.refresh(event);
    } else if (this.tab() === 'papers') {
      this.loadPapers(() => event.target.complete());
    } else {
      this.loadClippings(() => event.target.complete());
    }
  }

  private loadClippings(done?: () => void) {
    this.clippingsError.set('');
    this.api.clippings().subscribe({
      next: list => { this.clippings.set(list); done?.(); },
      error: err => { this.clippingsError.set(errorMessage(err, 'Could not load the कात्रणे.')); done?.(); },
    });
  }

  private loadPapers(done?: () => void) {
    this.papersError.set('');
    this.api.subscribedPeriodicals().subscribe({
      next: list => { this.papers.set(list); done?.(); },
      error: err => { this.papersError.set(errorMessage(err, 'Could not load newspapers and magazines.')); done?.(); },
    });
  }

  /** A student suggests a book the catalog doesn't have; the title starts as what they searched. */
  async suggest() {
    const alert = await this.alerts.create({
      header: 'Suggest a book',
      subHeader: 'The librarian will see it on the Dashboard.',
      inputs: [
        { name: 'title', placeholder: 'Title *', value: this.query(), attributes: { maxlength: 200 } },
        { name: 'author', placeholder: 'Author (optional)', attributes: { maxlength: 200 } },
        { name: 'note', type: 'textarea', placeholder: 'Why this book? (optional)', attributes: { maxlength: 300 } },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Send',
          handler: (v: { title: string; author: string; note: string }) => {
            if (!v.title?.trim()) {
              this.ui.toast('Enter the book\u2019s title.', 'error');
              return false;
            }
            this.api.suggestBook({ title: v.title.trim(), author: v.author?.trim() || undefined, note: v.note?.trim() || undefined }).subscribe({
              next: () => {
                this.ui.toast('Thanks! Your suggestion is sent to the librarian.');
                this.showMine('SUGGESTED');
              },
              error: err => this.ui.error(err, 'Could not send the suggestion.'),
            });
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  search(value: string | null | undefined) {
    this.query.set((value ?? '').trim());
    this.books.reset();
  }

  async open(book: Book) {
    // An issue or an edit updates just this row, the moment it happens.
    const onChange = (changed: Book) => this.books.replace(b => b.id === changed.id, changed);
    const alreadyRequested = this.openRequests().has(book.id);
    const modal = await this.modals.create({ component: BookDetailModal, componentProps: { book, onChange, alreadyRequested } });
    await modal.present();
    const { role } = await modal.onWillDismiss<Book>();
    if (role === 'deleted') {
      this.books.remove(b => b.id === book.id);
    } else if (role === 'requested') {
      this.openRequests.update(ids => new Set(ids).add(book.id));
      this.showMine('REQUESTED');
    }
  }

  /** Students: the books they have an open (not yet done) request for, so Book details won't ask again. */
  private loadOpenRequests() {
    this.api.myReaderRequests().subscribe({
      next: list => this.openRequests.set(new Set(list
        .filter(r => r.kind === 'REQUEST' && !r.doneAt && r.bookId != null)
        .map(r => r.bookId!))),
      // Not fatal: the server still refuses a second request (409).
      error: () => {},
    });
  }

  /** After a request or suggestion: clear the search and open My books on the matching tab. */
  private showMine(tab: 'REQUESTED' | 'SUGGESTED') {
    const box = this.searchbar();
    if (box) {
      box.value = '';
    }
    this.search('');
    this.router.navigate(['/tabs/my-books'], { queryParams: { tab } });
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
