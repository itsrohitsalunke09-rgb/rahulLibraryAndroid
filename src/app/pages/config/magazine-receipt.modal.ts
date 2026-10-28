import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonSpinner, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { localIsoDate } from '../../core/dates';
import { defaultPeriod } from '../../core/magazine-periods';
import { MagazineCard } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';

/**
 * Records one magazine issue by its number (अंक). Monthly: the date it was published.
 * Weekly/fortnightly: the from–to dates it covers.
 */
@Component({
  selector: 'app-magazine-receipt',
  templateUrl: 'magazine-receipt.modal.html',
  styleUrls: ['magazine-receipt.modal.scss'],
  imports: [FormsModule, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonFooter, IonSpinner],
})
export class MagazineReceiptModal implements OnInit {
  @Input({ required: true }) card!: MagazineCard;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);

  readonly today = localIsoDate();
  /** Suggested as the one after the last recorded. */
  issueNo: number | string = '';
  /** Monthly: the day it was published. */
  publishedOn = this.today;
  /** Weekly/fortnightly: the period it covers, this week (or half-month) to start with. */
  periodFrom = '';
  periodTo = '';
  readonly saving = signal(false);
  readonly error = signal('');

  get monthly() {
    return this.card.frequency === 'MONTHLY';
  }

  ngOnInit() {
    const last = Math.max(0, ...this.card.receipts.map(r => r.issueNo ?? 0));
    this.issueNo = last + 1;
    const period = defaultPeriod(this.card.frequency, this.today);
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

  cancel() {
    this.modals.dismiss(null, 'cancel');
  }

  save() {
    const issueNo = Number(this.issueNo);
    if (!Number.isInteger(issueNo) || issueNo < 1) {
      this.error.set('Enter the issue number (अंक), e.g. 12.');
      return;
    }
    // Monthly issues are dated by their published day; weekly ones by the week they cover.
    const [from, to] = this.monthly ? [this.publishedOn, this.publishedOn] : [this.periodFrom, this.periodTo];
    if (!from || !to) {
      this.error.set(this.monthly ? 'Enter the published date.' : 'Enter the from and to dates.');
      return;
    }
    if (to < from) {
      this.error.set('"To" must be on or after "From".');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api.addMagazineReceipt(this.card.periodicalId, { issueNo, receivedOn: from, periodFrom: from, periodTo: to }).subscribe({
      next: receipt => {
        this.ui.toast(`${this.card.name}: अंक ${issueNo} received.`);
        this.modals.dismiss(receipt, 'saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save.'));
      },
    });
  }
}
