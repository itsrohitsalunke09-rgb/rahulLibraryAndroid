import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher, IonRefresherContent, IonTitle,
  AlertController, IonToolbar, ModalController, RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { DEFAULT_ABOUT } from '../../core/about-content';
import { ApiService } from '../../core/api.service';
import { bookMoves, readers } from '../../core/book-moves';
import { localIsoDate } from '../../core/dates';
import { planetHue, planetTiers } from '../../core/galaxy';
import { GalaxyReadersStore } from '../../core/galaxy-readers.store';
import { StudentSummary } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { RouterLink } from '@angular/router';
import { bookMovesPdf } from '../../core/register-pdf';
import { saveFile } from '../../core/save-file';
import { UiService, errorMessage } from '../../core/ui.service';
import { StudentBooksModal } from './student-books.modal';

/**
 * पुस्तकांची देवाण घेवाण. On top, the way into the Reading Galaxy (this year's readers as planets).
 * Below, every student who has had books, with their totals across all years (tap for their books),
 * and a year's register as a PDF.
 */
@Component({
  selector: 'app-book-report',
  templateUrl: 'book-report.page.html',
  styleUrls: ['../config/periodical-report.page.scss', 'planets.scss', 'book-report.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonRefresher, IonRefresherContent,
    IonList, IonItem, IonLabel, RouterLink, PageSkeletonComponent,
  ],
})
export class BookReportPage implements ViewWillEnter {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private modals = inject(ModalController);
  private alerts = inject(AlertController);

  readonly today = localIsoDate();
  readonly thisYear = Number(this.today.slice(0, 4));
  readonly thisMonth = this.today.slice(0, 7);
  /** Every student's totals across all years, the most books first; null until loaded. */
  readonly students = signal<StudentSummary[] | null>(null);
  readonly error = signal('');
  readonly exporting = signal(false);

  private galaxy = inject(GalaxyReadersStore);
  /** This year's books per student, the most first (for the Reading Galaxy banner); saved on the phone. */
  readonly yearReaders = this.galaxy.readers;

  /** The banner's top readers drawn as their bodies (the Sun first). */
  readonly tiers = computed(() => planetTiers(this.yearReaders() ?? []));
  readonly hue = planetHue;

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

  /** A student's books across all years, in a popup. */
  async open(student: StudentSummary) {
    const modal = await this.modals.create({ component: StudentBooksModal, componentProps: { student } });
    await modal.present();
  }

  /** Asks which year, then saves that year's books given and returned, student by student, as a portrait PDF. */
  async exportPdf() {
    if (this.exporting()) {
      return;
    }
    const alert = await this.alerts.create({
      header: 'Export PDF',
      subHeader: 'Which year?',
      inputs: [0, 1, 2].map(i => ({ type: 'radio' as const, label: String(this.thisYear - i), value: this.thisYear - i, checked: i === 0 })),
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save PDF', role: 'confirm' }],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{ values: number }>();
    if (role !== 'confirm' || !data?.values) {
      return;
    }
    const year = data.values;
    this.exporting.set(true);
    try {
      // The year's months up to now; an issue given in one month and returned in another comes back twice.
      const months = Array.from({ length: year === this.thisYear ? Number(this.thisMonth.slice(5)) : 12 },
        (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
      const lists = await Promise.all(months.map(m => firstValueFrom(this.api.issuesMovedInMonth(m))));
      const issues = [...new Map(lists.flat().map(issue => [issue.id, issue])).values()];
      const yearReaders = readers(bookMoves(issues, String(year)));
      if (!yearReaders.length) {
        this.ui.toast(`No books were given or returned in ${year}.`, 'error');
        return;
      }
      this.ui.toast('Saving PDF… it will appear in Download.');
      const where = await saveFile(await bookMovesPdf(yearReaders, String(year), DEFAULT_ABOUT.title),
        `book-transactions-${year}.pdf`, 'application/pdf');
      this.ui.toast(`PDF saved to ${where}`);
    } catch (err) {
      this.ui.toast(err instanceof HttpErrorResponse ? errorMessage(err, 'Could not create the PDF.')
        : (err as Error)?.message || 'Could not create the PDF.', 'error');
    } finally {
      this.exporting.set(false);
    }
  }

  private loadYear(done?: () => void) {
    this.galaxy.refresh(done);
  }

  private load(done?: () => void) {
    this.error.set('');
    this.api.studentSummaries().subscribe({
      next: list => { this.students.set(list); done?.(); },
      error: err => { this.error.set(errorMessage(err, 'Could not load the students.')); done?.(); },
    });
  }
}
