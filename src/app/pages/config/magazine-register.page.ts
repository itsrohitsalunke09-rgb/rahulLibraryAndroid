import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher, IonRefresherContent,
  IonSearchbar, IonTitle, IonToolbar, ModalController, RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { localIsoDate } from '../../core/dates';
import { magazinePeriods, receiptLabel } from '../../core/magazine-periods';
import { FREQUENCY_LABELS, MARATHI_FREQUENCY, MagazineCard, MagazineReceipt, PeriodicalFrequency, byFrequency } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { errorMessage } from '../../core/ui.service';
import { MagazineReceiptModal } from './magazine-receipt.modal';

/**
 * Weekly, fortnightly and monthly magazines, paid for a year at a time: one line each, grouped by
 * frequency, with issues received out of the year and how many are missing. A tap opens Mark
 * received, with the year's cells and the issues so far.
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
  /** Opened from a साप्ताहिक / मासिक card: only that kind; otherwise every magazine, grouped. */
  readonly frequency = inject(ActivatedRoute).snapshot.paramMap.get('frequency') as PeriodicalFrequency | null;
  readonly title = this.frequency ? MARATHI_FREQUENCY[this.frequency] : 'Magazine register';
  readonly receiptLabel = receiptLabel;

  /** Each magazine's counts and latest issue, grouped by frequency and narrowed by the search box. */
  readonly groups = computed(() => {
    const today = localIsoDate();
    const q = this.query().toLowerCase();
    const rows = (this.cards() ?? [])
      .filter(card => !this.frequency || card.frequency === this.frequency)
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

  /** Mark received for the magazine (its cells and issues are on that screen); its line here updates straight away. */
  async open(card: MagazineCard) {
    const modal = await this.modals.create({
      component: MagazineReceiptModal,
      componentProps: { card, onChange: (receipts: MagazineReceipt[]) => this.update(card.periodicalId, receipts) },
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<MagazineReceipt>();
    if (role === 'saved' && data) {
      const current = this.cards()?.find(c => c.periodicalId === card.periodicalId)?.receipts ?? [];
      this.update(card.periodicalId, [...current, data]);
    }
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
