import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonRefresher, IonRefresherContent, IonTitle, IonToolbar,
  RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { DEFAULT_ABOUT } from '../../core/about-content';
import { ApiService } from '../../core/api.service';
import { bookMoves, moveDays } from '../../core/book-moves';
import { formatDate, localIsoDate } from '../../core/dates';
import { BookIssue } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { MarathiPipe } from '../../core/pipes';
import { bookMovesPdf } from '../../core/register-pdf';
import { saveFile } from '../../core/save-file';
import { UiService, errorMessage } from '../../core/ui.service';

/**
 * पुस्तकांची देवाण घेवाण: a month of books given and returned, as day cells (green on days books
 * moved) and a list, with the month's register as a PDF.
 */
@Component({
  selector: 'app-book-report',
  templateUrl: 'book-report.page.html',
  styleUrls: ['../config/periodical-register.page.scss', '../config/periodical-report.page.scss', 'book-report.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonRefresher, IonRefresherContent,
    MarathiPipe, PageSkeletonComponent,
  ],
})
export class BookReportPage implements ViewWillEnter {
  private api = inject(ApiService);
  private ui = inject(UiService);

  readonly today = localIsoDate();
  readonly thisMonth = this.today.slice(0, 7);
  readonly month = signal(this.thisMonth);
  readonly issues = signal<BookIssue[] | null>(null);
  readonly error = signal('');
  readonly exporting = signal(false);
  readonly formatDate = formatDate;

  readonly moves = computed(() => bookMoves(this.issues() ?? [], this.month()));
  readonly days = computed(() => moveDays(this.moves(), this.month(), this.today));
  readonly given = computed(() => this.moves().filter(m => m.kind === 'out').length);
  /** Newest first in the list; the PDF keeps date order. */
  readonly newestFirst = computed(() => [...this.moves()].reverse());

  ionViewWillEnter() {
    this.load();
  }

  refresh(event: RefresherCustomEvent) {
    this.load(() => event.target.complete());
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
      const where = await saveFile(await bookMovesPdf(this.moves(), this.monthName(this.month()), DEFAULT_ABOUT.title),
        `book-transactions-${this.month()}.pdf`, 'application/pdf');
      this.ui.toast(`PDF saved to ${where}`);
    } catch (err) {
      this.ui.toast(err instanceof HttpErrorResponse ? errorMessage(err, 'Could not create the PDF.')
        : (err as Error)?.message || 'Could not create the PDF.', 'error');
    } finally {
      this.exporting.set(false);
    }
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
