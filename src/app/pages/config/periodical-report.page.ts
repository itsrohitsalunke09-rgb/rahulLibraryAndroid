import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AlertController, IonBackButton, IonButtons, IonContent, IonHeader, IonSkeletonText, IonTitle, IonToolbar, ViewWillEnter
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
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
  private alerts = inject(AlertController);
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

  /** Asks which month, then saves it as a printable table (newspaper × date with prices and totals). */
  async exportPdf() {
    if (this.exporting()) {
      return;
    }
    const alert = await this.alerts.create({
      header: 'Export PDF',
      subHeader: 'Which month?',
      inputs: recentMonths(this.thisMonth, 12).map(m => ({
        type: 'radio' as const, label: this.monthName(m), value: m, checked: m === this.month(),
      })),
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save PDF', role: 'confirm' }],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{ values: string }>();
    const month = data?.values;
    if (role !== 'confirm' || !month) {
      return;
    }
    this.exporting.set(true);
    try {
      const shown = this.report();
      const report = shown && shown.month === month ? shown : await firstValueFrom(this.api.periodicalReport(month));
      if (!report.rows.some(r => r.issues > 0)) {
        this.ui.toast(`Nothing is ticked in the register for ${this.monthName(month)} yet.`, 'medium');
        return;
      }
      const pdf = registerPdf(report, DEFAULT_ABOUT.title, this.monthName(month));
      const where = await saveFile(pdf, `newspaper-register-${month}.pdf`, 'application/pdf');
      this.ui.toast(`PDF saved to ${where}`);
    } catch (err) {
      this.ui.toast(err instanceof HttpErrorResponse ? errorMessage(err, 'Could not create the PDF.')
        : (err as Error)?.message || 'Could not create the PDF.', 'danger');
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

/** "2026-10" and the months before it, newest first. */
export function recentMonths(latest: string, count: number): string[] {
  const [year, month] = latest.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month - 1 - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}
