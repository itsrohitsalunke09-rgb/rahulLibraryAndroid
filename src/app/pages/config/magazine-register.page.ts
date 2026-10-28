import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonRefresher, IonRefresherContent, IonTitle, IonToolbar,
  ModalController, RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { formatDate, localIsoDate } from '../../core/dates';
import { magazinePeriods } from '../../core/magazine-periods';
import { FREQUENCY_LABELS, MagazineCard, MagazineReceipt, rupees } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { errorMessage } from '../../core/ui.service';
import { MagazineIssuesModal } from './magazine-issues.modal';
import { MagazineReceiptModal } from './magazine-receipt.modal';

/**
 * Weekly, fortnightly and monthly magazines, paid for a year at a time. Each card shows the
 * subscription year as a strip of months/weeks (received, missing, still to come) and the issues
 * recorded, so a missing issue can be chased with the vendor.
 */
@Component({
  selector: 'app-magazine-register',
  templateUrl: 'magazine-register.page.html',
  styleUrls: ['magazine-register.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonRefresher, IonRefresherContent,
    PageSkeletonComponent,
  ],
})
export class MagazineRegisterPage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);

  readonly cards = signal<MagazineCard[] | null>(null);
  readonly error = signal('');
  readonly labels = FREQUENCY_LABELS;
  readonly rupees = rupees;
  readonly formatDate = formatDate;

  /** Each card with its year strip and counts, worked out once per load. */
  readonly view = computed(() => {
    const today = localIsoDate();
    return (this.cards() ?? []).map(card => {
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

  async markReceived(card: MagazineCard) {
    const modal = await this.modals.create({ component: MagazineReceiptModal, componentProps: { card } });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<MagazineReceipt>();
    if (role === 'saved' && data) {
      this.update(card.periodicalId, receipts => [...receipts, data]);
    }
  }

  /** Every issue in a popup; a removal there updates this card's strip straight away. */
  async showIssues(card: MagazineCard) {
    const modal = await this.modals.create({
      component: MagazineIssuesModal,
      componentProps: { card, onChange: (receipts: MagazineReceipt[]) => this.update(card.periodicalId, () => receipts) },
    });
    await modal.present();
  }

  /** Changes one card's receipts in place, so the strip updates without reloading the page. */
  private update(periodicalId: number, change: (receipts: MagazineReceipt[]) => MagazineReceipt[]) {
    this.cards.update(cards => (cards ?? []).map(c => c.periodicalId === periodicalId ? { ...c, receipts: change(c.receipts) } : c));
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
