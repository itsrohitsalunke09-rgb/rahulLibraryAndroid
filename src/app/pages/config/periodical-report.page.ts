import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  AlertController, IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, ViewWillEnter
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { localIsoDate } from '../../core/dates';
import { FREQUENCY_LABELS, MonthReport, PeriodicalFrequency, byFrequency, onlyFrequency, rupees } from '../../core/models';
import { DEFAULT_ABOUT } from '../../core/about-content';
import { Orientation, registerPdf } from '../../core/register-pdf';
import { saveFile } from '../../core/save-file';
import { UiService, errorMessage } from '../../core/ui.service';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';

/** How far back the PDF export reaches: 3 years. */
const EXPORT_MONTHS = 36;
/** Remembers the last page layout chosen for the PDF on this phone. */
const ORIENTATION_KEY = 'rahul-library.pdf-orientation';

/** Monthly newspaper report: copies received, cost, and missing days, to check against the vendor's bill. */
@Component({
  selector: 'app-periodical-report',
  templateUrl: 'periodical-report.page.html',
  styleUrls: ['periodical-register.page.scss', 'periodical-report.page.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, PageSkeletonComponent],
})
export class PeriodicalReportPage implements ViewWillEnter {
  private api = inject(ApiService);

  readonly thisMonth = localIsoDate().slice(0, 7);
  readonly month = signal(this.thisMonth);
  readonly report = signal<MonthReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly exporting = signal(false);
  private ui = inject(UiService);
  private alerts = inject(AlertController);
  readonly labels = FREQUENCY_LABELS;
  /** A card per frequency, daily first, each with its own copies and amount. */
  readonly groups = computed(() => byFrequency(this.report()?.rows ?? []).map(g => ({
    ...g,
    issues: g.items.reduce((sum, r) => sum + r.issues, 0),
    amount: g.items.reduce((sum, r) => sum + r.amount, 0),
  })));
  readonly rupees = rupees;
  readonly today = localIsoDate();
  readonly dayCells = dayCells;

  ionViewWillEnter() {
    this.load();
  }

  /** "October 2026". */
  monthName(month: string) {
    return new Date(month + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  pick(value: string) {
    if (value && value <= this.thisMonth && value !== this.month()) {
      this.month.set(value);
      // The old month's numbers go at once; the skeleton shows until the new month arrives.
      this.report.set(null);
      this.load();
    }
  }

  shift(months: number) {
    const [y, m] = this.month().split('-').map(Number);
    const d = new Date(y, m - 1 + months, 1);
    this.pick(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  /**
   * Asks which months (any of the last 3 years), then saves one frequency's papers (the card the
   * button is under) as a printable PDF: newspaper × date prices and totals, oldest month first.
   */
  async exportPdf(frequency: PeriodicalFrequency) {
    if (this.exporting()) {
      return;
    }
    const alert = await this.alerts.create({
      header: `Export ${this.labels[frequency]} PDF`,
      subHeader: 'Tick one or more months',
      inputs: recentMonths(this.thisMonth, EXPORT_MONTHS).map(m => ({
        type: 'checkbox' as const, label: this.monthName(m), value: m, checked: m === this.month(),
      })),
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Next', role: 'confirm' }],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{ values: string[] }>();
    const months = [...(data?.values ?? [])].sort();
    if (role !== 'confirm') {
      return;
    }
    if (!months.length) {
      this.ui.toast('Tick at least one month to export.', 'error');
      return;
    }
    const orientation = await this.askOrientation();
    if (!orientation) {
      return;
    }
    this.exporting.set(true);
    try {
      const shown = this.report();
      const reports = (await Promise.all(months.map(m =>
        shown && shown.month === m ? Promise.resolve(shown) : firstValueFrom(this.api.periodicalReport(m)))))
        .map(r => onlyFrequency(r, frequency));
      // A month with nothing ticked would just be an empty grid; leave it out.
      const pages = reports.filter(r => r.rows.some(row => row.issues > 0))
        .map(report => ({ report, monthName: this.monthName(report.month) }));
      if (!pages.length) {
        this.ui.toast(months.length === 1
          ? `Nothing is ticked in the register for ${this.monthName(months[0])} yet.`
          : 'Nothing is ticked in the register for those months yet.', 'error');
        return;
      }
      this.ui.toast(`Saving PDF (${pages.length} month${pages.length === 1 ? '' : 's'})… it will appear in Download.`);
      const first = pages[0].report.month;
      const last = pages[pages.length - 1].report.month;
      const kind = frequency.toLowerCase();
      const name = first === last ? `newspaper-register-${kind}-${first}.pdf` : `newspaper-register-${kind}-${first}-to-${last}.pdf`;
      const title = `${this.labels[frequency]} newspaper & magazine register`;
      const where = await saveFile(await registerPdf(pages, DEFAULT_ABOUT.title, orientation, title), name, 'application/pdf');
      const skipped = months.length - pages.length;
      this.ui.toast(`PDF saved to ${where}` + (skipped ? ` (${skipped} month${skipped === 1 ? '' : 's'} with no entries left out)` : ''));
    } catch (err) {
      this.ui.toast(err instanceof HttpErrorResponse ? errorMessage(err, 'Could not create the PDF.')
        : (err as Error)?.message || 'Could not create the PDF.', 'error');
    } finally {
      this.exporting.set(false);
    }
  }

  /** Landscape or portrait A4; remembers the last choice on this phone. Null when cancelled. */
  private async askOrientation(): Promise<Orientation | null> {
    let last: Orientation = 'landscape';
    try {
      last = localStorage.getItem(ORIENTATION_KEY) === 'portrait' ? 'portrait' : 'landscape';
    } catch {
      // Storage unavailable: start from landscape.
    }
    const alert = await this.alerts.create({
      header: 'Page layout',
      subHeader: 'Both print on A4',
      inputs: [
        { type: 'radio', label: 'Landscape – dates across', value: 'landscape', checked: last === 'landscape' },
        { type: 'radio', label: 'Portrait – dates down', value: 'portrait', checked: last === 'portrait' },
      ],
      message: 'Portrait suits up to about 12 newspapers; with more, landscape is easier to read.',
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save PDF', role: 'confirm' }],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{ values: Orientation }>();
    if (role !== 'confirm' || !data?.values) {
      return null;
    }
    try {
      localStorage.setItem(ORIENTATION_KEY, data.values);
    } catch {
      // Not remembered; fine.
    }
    return data.values;
  }

  private load() {
    const month = this.month();
    this.loading.set(true);
    this.error.set('');
    this.api.periodicalReport(month).subscribe({
      next: report => {
        if (month === this.month()) {
          this.report.set(report);
        }
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Could not load the report.'));
      }
    });
  }
}

/**
 * A paper's month as day cells: received when a copy came, missing when the day has passed
 * without one, upcoming for today onwards with nothing ticked yet.
 */
export function dayCells(prices: (number | null)[], month: string, today: string): { day: number; state: 'received' | 'missing' | 'upcoming' }[] {
  return prices.map((price, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    return { day: i + 1, state: price !== null ? 'received' : date < today ? 'missing' : 'upcoming' };
  });
}

/** "2026-10" and the months before it, newest first. */
export function recentMonths(latest: string, count: number): string[] {
  const [year, month] = latest.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month - 1 - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}
