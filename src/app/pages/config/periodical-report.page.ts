import { Component, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonSkeletonText, IonTitle, IonToolbar, ViewWillEnter
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { localIsoDate } from '../../core/dates';
import { FREQUENCY_LABELS, MonthReport, rupees } from '../../core/models';
import { DEFAULT_ABOUT } from '../../core/about-content';
import { registerPdf } from '../../core/register-pdf';
import { saveFile } from '../../core/save-file';
import { UiService, errorMessage } from '../../core/ui.service';

/** Monthly newspaper report: copies received, cost, and missing days, to check against the vendor's bill. */
@Component({
  selector: 'app-periodical-report',
  templateUrl: 'periodical-report.page.html',
  styleUrls: ['periodical-register.page.scss', 'periodical-report.page.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSkeletonText],
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
  readonly labels = FREQUENCY_LABELS;
  readonly rupees = rupees;

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
      this.load();
    }
  }

  shift(months: number) {
    const [y, m] = this.month().split('-').map(Number);
    const d = new Date(y, m - 1 + months, 1);
    this.pick(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  /** The month as a printable table (newspaper × date with prices and totals), shared or downloaded as PDF. */
  async exportPdf() {
    const report = this.report();
    if (!report || this.exporting()) {
      return;
    }
    this.exporting.set(true);
    try {
      const pdf = registerPdf(report, DEFAULT_ABOUT.title, this.monthName(report.month));
      await saveFile(pdf, `newspaper-register-${report.month}.pdf`, 'application/pdf');
    } catch (err) {
      // Closing Android's share sheet without choosing an app is not an error.
      if (!/cancel/i.test(String((err as Error)?.message ?? err))) {
        this.ui.error(err, 'Could not create the PDF.');
      }
    } finally {
      this.exporting.set(false);
    }
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
