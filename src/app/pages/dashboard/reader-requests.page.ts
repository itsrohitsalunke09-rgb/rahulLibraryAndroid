import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher, IonRefresherContent,
  IonSegment, IonSegmentButton, IonTitle, IonToolbar, ModalController, RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { IssueBookModal, IssueChoice } from '../catalog/issue-book.modal';
import { formatDate } from '../../core/dates';
import { ReaderRequest } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
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
    IonSegment, IonSegmentButton, IonList, IonItem, IonLabel, PageSkeletonComponent,
  ],
})
export class ReaderRequestsPage implements ViewWillEnter {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private modals = inject(ModalController);
  /** Done needs the Update permission, Delete needs Delete; Issue book needs Register, as in the Catalog. */
  protected perms = inject(PermissionsStore);

  readonly all = signal<ReaderRequest[] | null>(null);
  readonly error = signal('');
  readonly kind = signal<ReaderRequest['kind']>('REQUEST');
  readonly shown = computed(() => (this.all() ?? []).filter(r => r.kind === this.kind()));
  readonly count = (kind: ReaderRequest['kind']) => (this.all() ?? []).filter(r => r.kind === kind).length;
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

  /** Opens the Issue screen with the book and the requesting student chosen; issuing also clears the request. */
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
          // A failed clear leaves the request listed; the book is still issued.
          switchMap(() => data.student.id === r.studentId
            ? this.api.clearReaderRequest(r.id).pipe(map(() => true), catchError(() => of(false)))
            : of(false)),
        ).subscribe({
          next: cleared => {
            this.clearing.set(null);
            if (cleared) {
              this.all.update(list => (list ?? []).filter(x => x.id !== r.id));
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

  /** Done and Delete both remove it from the list; they differ only in wording. */
  async done(r: ReaderRequest, remove = false) {
    const what = r.kind === 'REQUEST' ? 'request' : 'suggestion';
    const asked = remove
      ? this.ui.confirm(`Delete this ${what}?`, `"${r.title}" from ${r.studentName} will be deleted.`, 'Delete', true)
      : this.ui.confirm(`Mark this ${what} done?`, `"${r.title}" from ${r.studentName} will be removed from the list.`, 'Done');
    if (!(await asked)) {
      return;
    }
    this.clearing.set(r.id);
    this.api.clearReaderRequest(r.id).subscribe({
      next: () => {
        this.clearing.set(null);
        this.all.update(list => (list ?? []).filter(x => x.id !== r.id));
        this.ui.toast(`${what[0].toUpperCase()}${what.slice(1)} ${remove ? 'deleted' : 'marked done'}.`);
      },
      error: err => {
        this.clearing.set(null);
        this.ui.error(err, `Could not clear the ${what}.`);
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
