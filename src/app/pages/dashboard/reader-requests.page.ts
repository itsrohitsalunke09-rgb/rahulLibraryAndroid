import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher, IonRefresherContent,
  IonTitle, IonToolbar, ModalController, RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { IssueBookModal, IssueChoice } from '../catalog/issue-book.modal';
import { formatDate } from '../../core/dates';
import { ReaderRequest } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { SwipeTabsDirective } from '../../core/swipe-tabs.directive';
import { FilterCard, FilterCardsComponent } from '../../core/filter-cards.component';
import { PermissionsStore } from '../../core/permissions.store';
import { UiService, errorMessage } from '../../core/ui.service';

/**
 * Students' requests for catalog books and suggestions of books to buy, newest first (staff).
 * A request is met with Issue book (which clears it); Done clears a suggestion once considered.
 */
@Component({
  selector: 'app-reader-requests',
  templateUrl: 'reader-requests.page.html',
  styleUrls: ['reader-requests.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonRefresher, IonRefresherContent,
    FilterCardsComponent, IonList, IonItem, IonLabel, PageSkeletonComponent, SwipeTabsDirective,
  ],
})
export class ReaderRequestsPage implements ViewWillEnter {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private modals = inject(ModalController);
  /** Done needs the Done permission, Delete needs Delete; Issue book needs Register, as in the Catalog. */
  protected perms = inject(PermissionsStore);

  readonly all = signal<ReaderRequest[] | null>(null);
  readonly error = signal('');
  readonly kind = signal<ReaderRequest['kind']>('REQUEST');
  /** Open ones first (newest first), then the done ones. */
  readonly shown = computed(() => (this.all() ?? []).filter(r => r.kind === this.kind())
    .sort((a, b) => Number(!!a.doneAt) - Number(!!b.doneAt)));
  /** Only open ones count, as on the Dashboard. */
  readonly count = (kind: ReaderRequest['kind']) => (this.all() ?? []).filter(r => r.kind === kind && !r.doneAt).length;
  /** Open requests and suggestions as filter cards; "–" until loaded. */
  readonly cards = computed<FilterCard[]>(() => [
    { value: 'REQUEST', label: 'Requests', count: this.all() ? this.count('REQUEST') : null, tone: 'out' },
    { value: 'SUGGESTION', label: 'Suggestions', count: this.all() ? this.count('SUGGESTION') : null },
  ]);
  readonly clearing = signal<number | null>(null);
  readonly formatDate = formatDate;

  ionViewWillEnter() {
    this.load();
  }

  refresh(event: RefresherCustomEvent) {
    this.load(() => event.target.complete());
  }

  setKind(value: unknown) {
    if (value === 'REQUEST' || value === 'SUGGESTION') {
      this.kind.set(value);
    }
  }

  /** Opens the Issue screen with the book and the requesting student chosen; issuing also marks the request done. */
  issue(r: ReaderRequest) {
    this.clearing.set(r.id);
    forkJoin([this.api.book(r.bookId!), this.api.searchStudents(r.studentName)]).subscribe({
      next: async ([book, students]) => {
        if (book.availableCopies < 1) {
          this.clearing.set(null);
          this.ui.toast(`No copy of "${book.title}" is on the shelf right now.`);
          return;
        }
        const student = students.find(s => s.id === r.studentId);
        const modal = await this.modals.create({ component: IssueBookModal, componentProps: { book, student } });
        await modal.present();
        const { data, role } = await modal.onWillDismiss<IssueChoice>();
        if (role !== 'issue' || !data) {
          this.clearing.set(null);
          return;
        }
        this.api.issueBook(book.id, data.student.id, data.days).pipe(
          // The request is met only if it went to the student who asked.
          // Without Done, or if marking fails, the request stays open; the book is still issued.
          switchMap(() => data.student.id === r.studentId && this.perms.can('DONE')
            ? this.api.markReaderRequestDone(r.id).pipe(catchError(() => of(null)))
            : of(null)),
        ).subscribe({
          next: updated => {
            this.clearing.set(null);
            if (updated) {
              this.all.update(list => (list ?? []).map(x => x.id === r.id ? updated : x));
            }
            this.ui.toast(`Issued to ${data.student.fullName}.`);
          },
          error: err => {
            this.clearing.set(null);
            this.ui.error(err, 'Could not issue the book.');
          },
        });
      },
      error: err => {
        this.clearing.set(null);
        this.ui.error(err, 'Could not open the book.');
      },
    });
  }

  /** Done keeps it on the list, marked done (the student still sees it); Delete removes it. */
  async done(r: ReaderRequest, remove = false) {
    const what = r.kind === 'REQUEST' ? 'request' : 'suggestion';
    const asked = remove
      ? this.ui.confirm(`Delete this ${what}?`, `"${r.title}" from ${r.studentName} will be deleted.`, 'Delete', true)
      : this.ui.confirm(`Mark this ${what} done?`, `"${r.title}" from ${r.studentName} stays listed as done.`, 'Done');
    if (!(await asked)) {
      return;
    }
    this.clearing.set(r.id);
    const call: Observable<ReaderRequest | null> = remove
      ? this.api.clearReaderRequest(r.id).pipe(map(() => null))
      : this.api.markReaderRequestDone(r.id);
    call.subscribe({
      next: updated => {
        this.clearing.set(null);
        this.all.update(list => updated
          ? (list ?? []).map(x => x.id === r.id ? updated : x)
          : (list ?? []).filter(x => x.id !== r.id));
        this.ui.toast(`${what[0].toUpperCase()}${what.slice(1)} ${remove ? 'deleted' : 'marked done'}.`);
      },
      error: err => {
        this.clearing.set(null);
        this.ui.error(err, `Could not ${remove ? 'delete' : 'mark done'} the ${what}.`);
      },
    });
  }

  private load(done?: () => void) {
    this.api.readerRequests().subscribe({
      next: list => {
        this.error.set('');
        this.all.set(list);
        done?.();
      },
      error: err => {
        this.error.set(errorMessage(err, 'Could not load requests and suggestions.'));
        done?.();
      },
    });
  }
}
