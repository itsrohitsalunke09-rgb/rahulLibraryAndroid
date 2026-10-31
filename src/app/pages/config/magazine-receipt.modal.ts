import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonSpinner, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { PermissionsStore } from '../../core/permissions.store';
import { localIsoDate } from '../../core/dates';
import { MagazinePeriod, defaultPeriod, issueName, magazinePeriods, parseIssue, weekStartDay } from '../../core/magazine-periods';
import { MagazineCard, MagazineReceipt, tel } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';

/**
 * Records one magazine issue by its number (अंक). Monthly and fortnightly: the months or fortnights it
 * covers, tapped (more than one for a जोड अंक); monthly also the date it was published. Weekly: the
 * from–to dates it covers. Shows the year's cells above, with the issues so far one tap away.
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
  /** The अंक box: a number (suggested as the one after the last recorded) or text such as जोडअंक. */
  issueNo: number | string = '';
  /** How many of this issue came; 1 unless more were bought. */
  copies: number | string = 1;
  /** Monthly/fortnightly: the periods tapped (each one's start); one issue covers the first to the last of them (जोड अंक). */
  readonly chosen = signal<string[]>([]);
  /** Monthly: the day it was published. */
  publishedOn = this.today;
  /** Weekly: the week it covers, this week (on the same weekday as the first issue) to start with. */
  periodFrom = '';
  periodTo = '';
  readonly saving = signal(false);
  readonly error = signal('');
  readonly tel = tel;
  readonly receipts = signal<MagazineReceipt[]>([]);
  readonly periods = computed(() => magazinePeriods({ ...this.card, receipts: this.receipts() }));
  readonly received = computed(() => this.periods().filter(p => p.state === 'received').length);
  readonly missing = computed(() => this.periods().filter(p => p.state === 'missing').length);
  /** Monthly/fortnightly: the periods this issue covers, the first tapped to the last with any gap between filled in. */
  readonly covers = computed(() => {
    const chosen = this.chosen();
    if (!chosen.length) {
      return [];
    }
    const [first, last] = [chosen.reduce((a, b) => a < b ? a : b), chosen.reduce((a, b) => a > b ? a : b)];
    return this.periods().filter(p => p.from >= first && p.from <= last);
  });

  get monthly() {
    return this.card.frequency === 'MONTHLY';
  }

  /** Monthly and fortnightly issues are marked by tapping their periods; weekly ones by dates. */
  get picker() {
    return this.card.frequency !== 'WEEKLY';
  }

  ngOnInit() {
    this.receipts.set(this.card.receipts);
    const last = Math.max(0, ...this.card.receipts.map(r => r.issueNo ?? 0));
    this.issueNo = last + 1;
    const period = defaultPeriod(this.card.frequency, this.today, weekStartDay(this.card.receipts));
    this.periodFrom = period.from;
    this.periodTo = period.to;
    // Monthly/fortnightly: this month or fortnight to start with, when it is in the subscription year.
    const current = this.periods().find(p => p.from <= this.today && p.to >= this.today);
    this.chosen.set(current ? [current.from] : []);
  }

  /** Monthly/fortnightly: tap a period to add it to the issue's, tap again to take it off. */
  togglePeriod(p: MagazinePeriod) {
    this.chosen.update(list => list.includes(p.from) ? list.filter(m => m !== p.from) : [...list, p.from]);
  }

  isCovered(p: MagazinePeriod) {
    return this.covers().some(c => c.from === p.from);
  }

  /** Weekly: a new "From" moves "To" 6 days on, so its calendar opens on the same month. */
  fromChanged() {
    if (!this.periodFrom) {
      return;
    }
    const [y, m, d] = this.periodFrom.split('-').map(Number);
    this.periodTo = localIsoDate(new Date(y, m - 1, d + 6));
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
    if (this.monthly) {
      this.saveMonthly();
      return;
    }
    const issue = parseIssue(this.issueNo);
    if (!issue.issueNo && !issue.issueLabel) {
      this.error.set('Enter the अंक, e.g. 12 or जोडअंक.');
      return;
    }
    const copies = Number(this.copies);
    if (!Number.isInteger(copies) || copies < 1 || copies > 99) {
      this.error.set('Enter the copies (1 to 99).');
      return;
    }
    // Fortnightly: the first tapped fortnight's start to the last one's end. Weekly: the dates entered.
    const covers = this.covers();
    const [from, to] = this.picker
      ? [covers[0]?.from ?? '', covers[covers.length - 1]?.to ?? '']
      : [this.periodFrom, this.periodTo];
    if (!from || !to) {
      this.error.set(this.picker ? 'Tap the fortnight this अंक covers.' : 'Enter the from and to dates.');
      return;
    }
    if (from > this.today) {
      this.error.set(this.picker ? 'A fortnight that hasn’t started can’t be marked yet.' : '"From" can’t be in the future.');
      return;
    }
    if (to < from) {
      this.error.set('"To" must be on or after "From".');
      return;
    }
    // Received on: the week's (or first fortnight's) start.
    this.send(issue, from, from, to, copies);
  }

  /**
   * Monthly: nothing is required. No अंक saves it without one, copies default to 1, no date is today,
   * and no month tapped means the published month. It covers the 1st of its first month to the end of its last.
   */
  private saveMonthly() {
    const copies = Number(this.copies);
    const publishedOn = this.publishedOn || this.today;
    const covers = this.covers();
    const [from, to] = covers.length
      ? [covers[0].from, covers[covers.length - 1].to]
      : [defaultPeriod('MONTHLY', publishedOn).from, defaultPeriod('MONTHLY', publishedOn).to];
    this.send(parseIssue(this.issueNo), publishedOn, from, to, Number.isInteger(copies) && copies >= 1 ? copies : 1);
  }

  private send(issue: ReturnType<typeof parseIssue>, receivedOn: string, from: string, to: string, copies: number) {
    this.saving.set(true);
    this.error.set('');
    this.api.addMagazineReceipt(this.card.periodicalId, { ...issue, receivedOn, periodFrom: from, periodTo: to, copies }).subscribe({
      next: receipt => {
        const name = issueName(issue) || 'issue';
        this.ui.toast(`${this.card.name}: ${name}${copies > 1 ? ` (×${copies})` : ''} received.`);
        this.modals.dismiss(receipt, 'saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save.'));
      },
    });
  }
}
