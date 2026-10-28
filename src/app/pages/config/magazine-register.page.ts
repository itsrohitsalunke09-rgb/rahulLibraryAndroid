import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher, IonRefresherContent,
  IonSearchbar, IonTitle, IonToolbar, ModalController, RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { localIsoDate } from '../../core/dates';
import { magazinePeriods, receiptLabel } from '../../core/magazine-periods';
import { FREQUENCY_LABELS, MagazineCard, MagazineReceipt, byFrequency } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { errorMessage } from '../../core/ui.service';
import { MagazineDetailModal } from './magazine-detail.modal';

/**
 * Weekly, fortnightly and monthly magazines, paid for a year at a time: one line each, grouped by
 * frequency, with issues received out of the year and how many are missing. A tap opens the year's
 * strip and issues, so a missing one can be chased with the vendor.
 */
@Component({
  selector: 'app-magazine-register',
  templateUrl: 'magazine-register.page.html',
  styleUrls: ['categories.page.scss', 'magazine-register.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonRefresher, IonRefresherContent,
    IonSearchbar, IonList, IonItem, IonLabel, PageSkeletonComponent,
  ],
})
export class MagazineRegisterPage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);

  readonly cards = signal<MagazineCard[] | null>(null);
  readonly error = signal('');
  readonly query = signal('');
  readonly labels = FREQUENCY_LABELS;
  readonly receiptLabel = receiptLabel;

  /** Each magazine's counts and latest issue, grouped by frequency and narrowed by the search box. */
  readonly groups = computed(() => {
    const today = localIsoDate();
    const q = this.query().toLowerCase();
    const rows = (this.cards() ?? [])
      .filter(card => !q || `${card.name} ${card.language ?? ''}`.toLowerCase().includes(q))
      .map(card => {
        const periods = magazinePeriods(card, today);
        return {
          card,
          frequency: card.frequency,
          periods: periods.length,
          received: periods.filter(p => p.state === 'received').length,
          missing: periods.filter(p => p.state === 'missing').length,
          last: [...card.receipts].sort((a, b) => b.periodFrom.localeCompare(a.periodFrom))[0],
        };
      });
    return byFrequency(rows);
  });

  ionViewWillEnter() {
    this.load();
  }

  search(value: string | null | undefined) {
    this.query.set((value ?? '').trim());
  }

  refresh(event: RefresherCustomEvent) {
    this.load(() => event.target.complete());
  }

  /** The magazine's year and issues in a popup; changes there update its line here straight away. */
  async open(card: MagazineCard) {
    const modal = await this.modals.create({
      component: MagazineDetailModal,
      componentProps: { card, onChange: (receipts: MagazineReceipt[]) => this.update(card.periodicalId, receipts) },
    });
    await modal.present();
  }

  private update(periodicalId: number, receipts: MagazineReceipt[]) {
    this.cards.update(cards => (cards ?? []).map(c => c.periodicalId === periodicalId ? { ...c, receipts } : c));
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
