import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonSpinner, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { localIsoDate } from '../../core/dates';
import { MagazinePeriod, defaultPeriod, magazinePeriods, receiptLabel } from '../../core/magazine-periods';
import { MagazineCard } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';

/**
 * Records one magazine issue. Monthly: tick the month, or several months for a combined issue.
 * Weekly/fortnightly: the from–to dates, filled in from the day it came.
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
  receivedOn = this.today;
  /** Weekly/fortnightly: the period the issue covers. */
  periodFrom = '';
  periodTo = '';
  /** Monthly: the months of the subscription year, and which ones this issue covers. */
  readonly months = signal<MagazinePeriod[]>([]);
  readonly picked = signal<Set<string>>(new Set());
  readonly saving = signal(false);
  readonly error = signal('');

  /** "Oct – Nov 2026" for the months ticked, so a combined issue reads right before saving. */
  readonly pickedLabel = computed(() => {
    const span = this.pickedSpan();
    return span ? receiptLabel({ periodFrom: span.from, periodTo: span.to }, 'MONTHLY') : '';
  });

  ngOnInit() {
    if (this.card.frequency === 'MONTHLY') {
      const months = magazinePeriods(this.card, this.today);
      this.months.set(months);
      // Start on the oldest month still missing (the issue most likely to be arriving), else this month.
      const first = months.find(m => m.state === 'missing') ?? months.find(m => m.from <= this.today && this.today <= m.to);
      if (first) {
        this.picked.set(new Set([first.from]));
      }
    } else {
      this.fillPeriod();
    }
  }

  /** Weekly/fortnightly: the period follows the day it came until the user changes it. */
  fillPeriod() {
    const p = defaultPeriod(this.card.frequency, this.receivedOn || this.today);
    this.periodFrom = p.from;
    this.periodTo = p.to;
  }

  toggle(month: MagazinePeriod) {
    const next = new Set(this.picked());
    if (next.has(month.from)) {
      next.delete(month.from);
    } else {
      next.add(month.from);
    }
    this.picked.set(next);
  }

  cancel() {
    this.modals.dismiss(null, 'cancel');
  }

  save() {
    const span = this.card.frequency === 'MONTHLY' ? this.pickedSpan() : { from: this.periodFrom, to: this.periodTo };
    if (!this.receivedOn) {
      this.error.set('Enter the date it came.');
      return;
    }
    if (!span || !span.from || !span.to) {
      this.error.set(this.card.frequency === 'MONTHLY' ? 'Tick the month this issue is for.' : 'Enter the period this issue covers.');
      return;
    }
    if (span.to < span.from) {
      this.error.set('The period must end on or after its start.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api.addMagazineReceipt(this.card.periodicalId, { receivedOn: this.receivedOn, periodFrom: span.from, periodTo: span.to }).subscribe({
      next: receipt => {
        this.ui.toast(`${this.card.name}: ${receiptLabel(receipt, this.card.frequency)} received.`);
        this.modals.dismiss(receipt, 'saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save.'));
      },
    });
  }

  /** The months ticked, as one span from the first to the last (a combined issue covers them all). */
  private pickedSpan(): { from: string; to: string } | null {
    const months = this.months().filter(m => this.picked().has(m.from));
    return months.length ? { from: months[0].from, to: months[months.length - 1].to } : null;
  }
}
