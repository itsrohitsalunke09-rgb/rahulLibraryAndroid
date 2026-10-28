import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertController, IonBackButton, IonButtons, IonContent, IonHeader, IonRefresher, IonRefresherContent, IonTitle, IonToolbar,
  ModalController, RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { DEFAULT_ABOUT } from '../../core/about-content';
import { ApiService } from '../../core/api.service';
import { localIsoDate } from '../../core/dates';
import { magazinePeriods } from '../../core/magazine-periods';
import { FREQUENCY_LABELS, MARATHI_FREQUENCY, MagazineCard, MagazineReceipt, PeriodicalFrequency } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { magazinePdf } from '../../core/register-pdf';
import { saveFile } from '../../core/save-file';
import { UiService, errorMessage } from '../../core/ui.service';
import { MagazineDetailModal } from '../config/magazine-detail.modal';

/**
 * One kind of magazine (weekly or monthly) as cells: each magazine's subscription year, green
 * came, red missing, grey not due yet. Export saves a year of issue numbers as a PDF.
 */
@Component({
  selector: 'app-magazine-report',
  templateUrl: 'magazine-report.page.html',
  styleUrls: ['../config/magazine-detail.modal.scss', 'magazine-report.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonRefresher, IonRefresherContent, PageSkeletonComponent,
  ],
})
export class MagazineReportPage implements ViewWillEnter {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private alerts = inject(AlertController);
  private modals = inject(ModalController);

  readonly frequency = inject(ActivatedRoute).snapshot.paramMap.get('frequency') as PeriodicalFrequency;
  readonly title = MARATHI_FREQUENCY[this.frequency] ?? '';
  readonly label = FREQUENCY_LABELS[this.frequency] ?? '';
  readonly cards = signal<MagazineCard[] | null>(null);
  readonly error = signal('');
  readonly exporting = signal(false);

  readonly view = computed(() => {
    const today = localIsoDate();
    return (this.cards() ?? []).filter(c => c.frequency === this.frequency).map(card => {
      const periods = magazinePeriods(card, today);
      return {
        card,
        periods,
        received: periods.filter(p => p.state === 'received').length,
        missing: periods.filter(p => p.state === 'missing').length,
      };
    });
  });

  ionViewWillEnter() {
    this.load();
  }

  refresh(event: RefresherCustomEvent) {
    this.load(() => event.target.complete());
  }

  /** The magazine's issues, to check or correct one; changes update its cells here. */
  async open(card: MagazineCard) {
    const modal = await this.modals.create({
      component: MagazineDetailModal,
      componentProps: {
        card,
        onChange: (receipts: MagazineReceipt[]) =>
          this.cards.update(cards => (cards ?? []).map(c => c.periodicalId === card.periodicalId ? { ...c, receipts } : c)),
      },
    });
    await modal.present();
  }

  /** Asks which calendar year, then saves these magazines' issue numbers month by month as a PDF. */
  async exportPdf() {
    if (this.exporting()) {
      return;
    }
    const thisYear = new Date().getFullYear();
    const alert = await this.alerts.create({
      header: `Export ${this.label} PDF`,
      subHeader: 'Which year?',
      inputs: [0, 1, 2].map(i => ({ type: 'radio' as const, label: String(thisYear - i), value: thisYear - i, checked: i === 0 })),
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save PDF', role: 'confirm' }],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{ values: number }>();
    if (role !== 'confirm' || !data?.values) {
      return;
    }
    const year = data.values;
    const cards = this.view().map(v => v.card);
    this.exporting.set(true);
    try {
      this.ui.toast('Saving PDF… it will appear in Download.');
      const pdf = await magazinePdf(cards, year, DEFAULT_ABOUT.title, `${this.label} magazine register`);
      const where = await saveFile(pdf, `magazine-register-${this.frequency.toLowerCase()}-${year}.pdf`, 'application/pdf');
      this.ui.toast(`PDF saved to ${where}`);
    } catch (err) {
      this.ui.toast(err instanceof HttpErrorResponse ? errorMessage(err, 'Could not create the PDF.')
        : (err as Error)?.message || 'Could not create the PDF.', 'error');
    } finally {
      this.exporting.set(false);
    }
  }

  private load(done?: () => void) {
    this.api.magazines().subscribe({
      next: cards => {
        this.cards.set(cards);
        this.error.set('');
        done?.();
      },
      error: err => {
        this.error.set(errorMessage(err, 'Could not load the magazines.'));
        done?.();
      },
    });
  }
}
