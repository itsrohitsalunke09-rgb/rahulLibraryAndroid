import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonSpinner, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { PermissionsStore } from '../../core/permissions.store';
import { localIsoDate } from '../../core/dates';
import { defaultPeriod, magazinePeriods, monthsStart, weekStartDay } from '../../core/magazine-periods';
import { MagazineCard, MagazineReceipt, tel } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';

/**
 * Records one magazine issue by its number (अंक). Monthly: the date it was published.
 * Weekly/fortnightly: the from–to dates it covers. Shows the year's cells above, with the issues
 * so far one tap away.
 */
@Component({
  selector: 'app-magazine-receipt',
  templateUrl: 'magazine-receipt.modal.html',
  styleUrls: ['magazine-strip.scss', 'magazine-receipt.modal.scss'],
  imports: [FormsModule, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonFooter, IonSpinner],
})
export class MagazineReceiptModal implements OnInit {
  @Input({ required: true }) card!: MagazineCard;
  /** Told when an issue is removed from the list, so the register behind updates too. */
  @Input() onChange?: (receipts: MagazineReceipt[]) => void;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  /** What this role may do (Roles & permissions). */
  protected perms = inject(PermissionsStore);
  private ui = inject(UiService);

  readonly today = localIsoDate();
  /** Suggested as the one after the last recorded. */
  issueNo: number | string = '';
  /** How many of this issue came; 1 unless more were bought. */
  copies: number | string = 1;
  /** Monthly: months one issue covers; 2 for a combined (जोड) issue. */
  months = 1;
  /** Monthly: the day it was published. */
  publishedOn = this.today;
  /** Weekly/fortnightly: the period it covers, this week (on the same weekday as the first issue) or half-month to start with. */
  periodFrom = '';
  periodTo = '';
  readonly saving = signal(false);
  readonly error = signal('');
  readonly tel = tel;
  readonly receipts = signal<MagazineReceipt[]>([]);
  readonly periods = computed(() => magazinePeriods({ ...this.card, receipts: this.receipts() }));
  readonly received = computed(() => this.periods().filter(p => p.state === 'received').length);
  readonly missing = computed(() => this.periods().filter(p => p.state === 'missing').length);

  get monthly() {
    return this.card.frequency === 'MONTHLY';
  }

  ngOnInit() {
    this.receipts.set(this.card.receipts);
    const last = Math.max(0, ...this.card.receipts.map(r => r.issueNo ?? 0));
    this.issueNo = last + 1;
    const period = defaultPeriod(this.card.frequency, this.today, weekStartDay(this.card.receipts));
    this.periodFrom = period.from;
    this.periodTo = period.to;
  }

  /** A new "From" moves "To" to the end of that issue (6 days on for weekly, 14 for fortnightly), so its calendar opens on the same month. */
  fromChanged() {
    if (!this.periodFrom) {
      return;
    }
    const [y, m, d] = this.periodFrom.split('-').map(Number);
    this.periodTo = localIsoDate(new Date(y, m - 1, d + (this.card.frequency === 'WEEKLY' ? 6 : 14)));
  }

  /** The issues so far, to check one or remove one marked by mistake. */
  async showIssues() {
    const { MagazineDetailModal } = await import('./magazine-detail.modal');
    const modal = await this.modals.create({
      component: MagazineDetailModal,
      componentProps: {
        card: { ...this.card, receipts: this.receipts() },
        issuesOnly: true,
        onChange: (receipts: MagazineReceipt[]) => {
          this.receipts.set(receipts);
          this.onChange?.(receipts);
        },
      },
    });
    await modal.present();
  }

  cancel() {
    this.modals.dismiss(null, 'cancel');
  }

  save() {
    const issueNo = Number(this.issueNo);
    if (!Number.isInteger(issueNo) || issueNo < 1 || issueNo > 99999) {
      this.error.set('Enter the issue number (अंक), e.g. 12.');
      return;
    }
    const copies = Number(this.copies);
    if (!Number.isInteger(copies) || copies < 1 || copies > 99) {
      this.error.set('Enter the copies (1 to 99).');
      return;
    }
    // Monthly issues are dated by their published day; a combined one reaches back to the 1st of the
    // earliest past month it covers (Oct–Nov published 5 Nov: 1 Oct to 5 Nov). Weekly: the week covered.
    const [from, to] = this.monthly
      ? [this.months > 1 ? monthsStart(this.publishedOn, this.months) : this.publishedOn, this.publishedOn]
      : [this.periodFrom, this.periodTo];
    if (!from || !to) {
      this.error.set(this.monthly ? 'Enter the published date.' : 'Enter the from and to dates.');
      return;
    }
    if ((this.monthly ? this.publishedOn : from) > this.today) {
      this.error.set(this.monthly ? 'The published date can’t be in the future.' : '"From" can’t be in the future.');
      return;
    }
    if (to < from) {
      this.error.set('"To" must be on or after "From".');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    // Received on: the published day for a monthly (even a combined one), the week's start for a weekly.
    const receivedOn = this.monthly ? this.publishedOn : from;
    this.api.addMagazineReceipt(this.card.periodicalId, { issueNo, receivedOn, periodFrom: from, periodTo: to, copies }).subscribe({
      next: receipt => {
        this.ui.toast(`${this.card.name}: अंक ${issueNo}${copies > 1 ? ` (×${copies})` : ''} received.`);
        this.modals.dismiss(receipt, 'saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save.'));
      },
    });
  }
}
