import { Component, ElementRef, Input, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import {
  InfiniteScrollCustomEvent, IonButton, IonButtons, IonContent, IonHeader, IonInfiniteScroll, IonInfiniteScrollContent, IonItem,
  IonLabel, IonList, IonTitle, IonToolbar, ModalController,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { formatDate } from '../../core/dates';
import { PlanetKind, planetHue, planetName } from '../../core/galaxy';
import { Book, BookIssue, ReaderCount, UserAccount, issueStatus } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { PAGE_SIZE } from '../../core/paged-list';
import { YearSelectComponent } from '../../core/year-select.component';
import { SwipeTabsDirective } from '../../core/swipe-tabs.directive';
import { PermissionsStore } from '../../core/permissions.store';
import { MarathiPipe } from '../../core/pipes';
import { UiService, errorMessage } from '../../core/ui.service';
import { BookFinderModal } from '../catalog/book-finder.modal';
import { IssueBookModal, IssueChoice } from '../catalog/issue-book.modal';
import { UserFormModal } from '../people/user-form.modal';

/**
 * A student's reading profile: counts, favourite category and books. From the Reading Galaxy it covers
 * one year and their place among readers; from Registers › सभासद (with `account`) it covers all years
 * and adds Edit account and Issue a book.
 */
@Component({
  selector: 'app-reader-profile',
  templateUrl: 'reader-profile.modal.html',
  styleUrls: ['planets.scss', 'reader-profile.modal.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonInfiniteScroll,
    IonInfiniteScrollContent,
    MarathiPipe, PageSkeletonComponent, YearSelectComponent, SwipeTabsDirective,
  ],
})
export class ReaderProfileModal implements OnInit {
  @Input({ required: true }) reader!: ReaderCount;
  /** 1 = the year's top reader; unset from सभासद. */
  @Input() rank?: number;
  @Input() readers?: number;
  /** The year shown; unset = all years (सभासद). */
  @Input() year?: number;
  /** The student's body in the galaxy (Sun, planet or dwarf planet, by rank). */
  @Input() kind: PlanetKind = 'other';
  /** From सभासद: the student's account, for Edit account and Issue a book. */
  @Input() account?: UserAccount;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);
  protected perms = inject(PermissionsStore);
  /** A book was issued or the account saved, so the list behind should reload. */
  private changed = false;
  readonly formatDate = formatDate;
  readonly planetName = planetName;
  get hue() {
    return planetHue(this.reader.studentId);
  }

  readonly books = signal<BookIssue[] | null>(null);
  readonly error = signal('');
  readonly status = issueStatus;
  /** Books in each state: Issued, Overdue, Returned. */
  /** The year the list and the Issued / Returned counts cover (by issue date): the Galaxy's year, else this year. */
  readonly shownYear = signal(new Date().getFullYear());
  /** The tapped count card: only books in that state; null = all of the year's books. */
  readonly filter = signal<StatusFilter | null>(null);
  private readonly yearBooks = computed(() =>
    (this.books() ?? []).filter(b => b.issueDate.startsWith(String(this.shownYear()))));
  /** Issued and Returned for the chosen year; Overdue across all years (a late book needs chasing whatever its year). */
  readonly count = computed(() => {
    const year = this.yearBooks();
    return { all: year.length, issued: year.filter(b => b.status === 'ISSUED').length,
      overdue: (this.books() ?? []).filter(b => b.status === 'OVERDUE').length,
      returned: year.filter(b => b.status === 'RETURNED').length };
  });
  readonly favourite = computed(() => favouriteCategory(this.yearBooks()));
  readonly listed = computed(() => {
    const f = this.filter();
    if (f === 'OVERDUE') {
      return (this.books() ?? []).filter(b => b.status === 'OVERDUE');
    }
    return f ? this.yearBooks().filter(b => b.status === f) : this.yearBooks();
  });
  /** Rows on screen: 20 at first, 20 more each time the list is scrolled to its end (as in the Catalog). */
  readonly showing = signal(PAGE_SIZE);
  /** The list part that slides on a swipe. */
  readonly txList = viewChild<ElementRef<HTMLElement>>('txList');
  readonly shownBooks = computed(() => this.listed().slice(0, this.showing()));

  more(event: InfiniteScrollCustomEvent) {
    this.showing.update(n => n + PAGE_SIZE);
    event.target.complete();
  }

  setYear(year: number) {
    this.shownYear.set(year);
    this.showing.set(PAGE_SIZE);
  }

  /** A sideways swipe on the list: All → Issued → Overdue → Returned, as the cards read. */
  swipeTo(tab: string) {
    this.filter.set(tab === 'ISSUED' || tab === 'OVERDUE' || tab === 'RETURNED' ? tab : null);
    this.showing.set(PAGE_SIZE);
  }

  /** Tap a card to list only those books; tap it again for all. */
  toggle(f: StatusFilter) {
    this.filter.set(this.filter() === f ? null : f);
    this.showing.set(PAGE_SIZE);
  }

  ngOnInit() {
    if (this.year) {
      this.shownYear.set(this.year);
    }
    this.loadBooks();
  }

  close() {
    this.modals.dismiss(null, this.changed ? 'changed' : 'cancel');
  }

  /** Find the book by reg. no. or title, then the usual Issue screen with this student chosen. */
  async issueBook() {
    const finder = await this.modals.create({ component: BookFinderModal });
    await finder.present();
    const { data: book, role } = await finder.onWillDismiss<Book>();
    if (role !== 'pick' || !book) {
      return;
    }
    const modal = await this.modals.create({ component: IssueBookModal, componentProps: { book, student: this.account } });
    await modal.present();
    const { data, role: chosen } = await modal.onWillDismiss<IssueChoice>();
    if (chosen !== 'issue' || !data) {
      return;
    }
    this.api.issueBook(book.id, data.student.id, data.days).subscribe({
      next: () => {
        this.changed = true;
        this.ui.toast(`Issued to ${data.student.fullName}.`);
        this.loadBooks();
      },
      error: err => this.ui.error(err, 'Could not issue the book.'),
    });
  }

  async editAccount() {
    const modal = await this.modals.create({ component: UserFormModal, componentProps: { user: this.account } });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<UserAccount>();
    if (role === 'deleted') {
      this.modals.dismiss(null, 'changed');
    } else if (role === 'saved' && data) {
      this.changed = true;
      this.account = data;
      this.reader = { ...this.reader, studentName: data.fullName };
    }
  }

  private loadBooks() {
    // Every year at once: the year chip and the all-years Overdue count filter it here.
    this.api.studentIssues(this.reader.studentId).subscribe({
      next: list => {
        this.showing.set(PAGE_SIZE);
        this.books.set(list);
      },
      error: err => this.error.set(errorMessage(err, 'Could not load the books.')),
    });
  }
}

/** The count cards that filter the list. */
type StatusFilter = 'ISSUED' | 'OVERDUE' | 'RETURNED';

/** The category the student read most from, if their books have categories. */
export function favouriteCategory(books: Pick<BookIssue, 'category'>[]): string | null {
  const counts = new Map<string, number>();
  for (const b of books) {
    const c = b.category?.trim();
    if (c) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  for (const [c, n] of counts) {
    if (best === null || n > counts.get(best)!) {
      best = c;
    }
  }
  return best;
}
