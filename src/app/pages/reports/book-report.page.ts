import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher, IonRefresherContent, IonTitle,
  IonToolbar, ModalController, RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { DEFAULT_ABOUT } from '../../core/about-content';
import { ApiService } from '../../core/api.service';
import { Reader, bookMoves, bubbleSpan, mixed, readers } from '../../core/book-moves';
import { localIsoDate } from '../../core/dates';
import { BookIssue, ReaderCount } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { AvatarHuePipe, InitialsPipe } from '../../core/pipes';
import { bookMovesPdf } from '../../core/register-pdf';
import { saveFile } from '../../core/save-file';
import { UiService, errorMessage } from '../../core/ui.service';
import { StudentBooksModal } from './student-books.modal';

/**
 * पुस्तकांची देवाण घेवाण. On top, this year's readers: a circle per student, bigger for more books.
 * Below, a month of books given and returned, one line per student (tap for their books), and the
 * month's register as a PDF.
 */
@Component({
  selector: 'app-book-report',
  templateUrl: 'book-report.page.html',
  styleUrls: ['../config/periodical-register.page.scss', '../config/periodical-report.page.scss', 'book-report.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonRefresher, IonRefresherContent,
    IonList, IonItem, IonLabel, InitialsPipe, AvatarHuePipe, PageSkeletonComponent,
  ],
})
export class BookReportPage implements ViewWillEnter {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private modals = inject(ModalController);

  readonly today = localIsoDate();
  readonly thisYear = Number(this.today.slice(0, 4));
  readonly thisMonth = this.today.slice(0, 7);
  readonly month = signal(this.thisMonth);
  readonly issues = signal<BookIssue[] | null>(null);
  readonly error = signal('');
  readonly exporting = signal(false);

  /** This year's books per student, the most first; null until loaded. */
  readonly yearReaders = signal<ReaderCount[] | null>(null);
  /** The circles, big and small mixed together. */
  readonly cloud = computed(() => mixed(this.yearReaders() ?? []));
  /** The circle tapped, to show whose it is. */
  readonly picked = signal<ReaderCount | null>(null);

  readonly moves = computed(() => bookMoves(this.issues() ?? [], this.month()));
  readonly given = computed(() => this.moves().filter(m => m.kind === 'out').length);
  readonly readers = computed(() => readers(this.moves()));

  /** Grid cells a circle spans, against the year's busiest reader. */
  span(books: number) {
    return bubbleSpan(books, this.yearReaders()?.[0]?.books ?? 1);
  }

  ionViewWillEnter() {
    this.load();
    this.loadYear();
  }

  refresh(event: RefresherCustomEvent) {
    let pending = 2;
    const settled = () => --pending || event.target.complete();
    this.load(settled);
    this.loadYear(settled);
  }

  pick(reader: ReaderCount) {
    this.picked.update(current => (current?.studentId === reader.studentId ? null : reader));
  }

  /** A student's books for the month, in a popup. */
  async open(reader: Reader) {
    const modal = await this.modals.create({
      component: StudentBooksModal,
      componentProps: { reader, monthName: this.monthName(this.month()) },
    });
    await modal.present();
  }

  /** "October 2026". */
  monthName(month: string) {
    return new Date(month + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  shift(months: number) {
    const [y, m] = this.month().split('-').map(Number);
    const d = new Date(y, m - 1 + months, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (next <= this.thisMonth) {
      this.month.set(next);
      this.load();
    }
  }

  async exportPdf() {
    if (this.exporting() || !this.moves().length) {
      return;
    }
    this.exporting.set(true);
    try {
      this.ui.toast('Saving PDF… it will appear in Download.');
      const where = await saveFile(await bookMovesPdf(this.readers(), this.monthName(this.month()), DEFAULT_ABOUT.title),
        `book-transactions-${this.month()}.pdf`, 'application/pdf');
      this.ui.toast(`PDF saved to ${where}`);
    } catch (err) {
      this.ui.toast(err instanceof HttpErrorResponse ? errorMessage(err, 'Could not create the PDF.')
        : (err as Error)?.message || 'Could not create the PDF.', 'error');
    } finally {
      this.exporting.set(false);
    }
  }

  private loadYear(done?: () => void) {
    this.api.readersInYear(this.thisYear).subscribe({
      next: list => { this.yearReaders.set(list); done?.(); },
      error: err => { this.error.set(errorMessage(err, 'Could not load this year’s readers.')); done?.(); },
    });
  }

  private load(done?: () => void) {
    const month = this.month();
    this.issues.set(null);
    this.error.set('');
    this.api.issuesMovedInMonth(month).subscribe({
      next: list => {
        if (month === this.month()) {
          this.issues.set(list);
        }
        done?.();
      },
      error: err => {
        this.error.set(errorMessage(err, 'Could not load the month.'));
        done?.();
      },
    });
  }
}
