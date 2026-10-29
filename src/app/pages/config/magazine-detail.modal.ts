import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { formatDate } from '../../core/dates';
import { magazinePeriods, receiptLabel } from '../../core/magazine-periods';
import { FREQUENCY_LABELS, MagazineCard, MagazineReceipt, rupees, tel } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { PermissionsStore } from '../../core/permissions.store';
import { MagazineReceiptModal } from './magazine-receipt.modal';

/**
 * One magazine's year: the strip of months/weeks (received, missing, still to come), every issue
 * in अंक order (1, 2, 3…) (removable if marked by mistake), and Mark received.
 */
@Component({
  selector: 'app-magazine-detail',
  templateUrl: 'magazine-detail.modal.html',
  styleUrls: ['magazine-strip.scss', 'magazine-detail.modal.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonFooter],
})
export class MagazineDetailModal implements OnInit {
  @Input({ required: true }) card!: MagazineCard;
  /** Told after each change, so the row behind updates its count at once. */
  @Input() onChange?: (receipts: MagazineReceipt[]) => void;
  /** Opened from Mark received: just the list of issues, no year strip or footer. */
  @Input() issuesOnly = false;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  /** Only admins see the call button. */
  protected auth = inject(AuthService);
  /** What this role may do (Roles & permissions). */
  protected perms = inject(PermissionsStore);
  private ui = inject(UiService);

  readonly receipts = signal<MagazineReceipt[]>([]);
  readonly removing = signal<number | null>(null);
  readonly label = receiptLabel;
  readonly labels = FREQUENCY_LABELS;
  readonly rupees = rupees;
  readonly formatDate = formatDate;
  readonly tel = tel;
  readonly sorted = computed(() =>
    [...this.receipts()].sort((a, b) => (a.issueNo ?? 0) - (b.issueNo ?? 0) || a.periodFrom.localeCompare(b.periodFrom)));
  readonly periods = computed(() => magazinePeriods({ ...this.card, receipts: this.receipts() }));
  readonly received = computed(() => this.periods().filter(p => p.state === 'received').length);
  readonly missing = computed(() => this.periods().filter(p => p.state === 'missing').length);

  ngOnInit() {
    this.receipts.set(this.card.receipts);
  }

  close() {
    this.modals.dismiss(null, 'cancel');
  }

  async markReceived() {
    const modal = await this.modals.create({ component: MagazineReceiptModal, componentProps: { card: { ...this.card, receipts: this.receipts() } } });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<MagazineReceipt>();
    if (role === 'saved' && data) {
      this.set([...this.receipts(), data]);
    }
  }

  async remove(receipt: MagazineReceipt) {
    const name = receipt.issueNo ? `अंक ${receipt.issueNo}` : receiptLabel(receipt);
    if (!(await this.ui.confirm(`Remove ${name}?`, `${this.card.name} ${name} (${receiptLabel(receipt)}) will be marked as not received.`, 'Remove', true))) {
      return;
    }
    this.removing.set(receipt.id);
    this.api.deleteMagazineReceipt(receipt.id).subscribe({
      next: () => {
        this.removing.set(null);
        this.set(this.receipts().filter(r => r.id !== receipt.id));
        this.ui.toast('Removed.');
      },
      error: err => {
        this.removing.set(null);
        this.ui.error(err, 'Could not remove it.');
      },
    });
  }

  private set(receipts: MagazineReceipt[]) {
    this.receipts.set(receipts);
    this.onChange?.(receipts);
  }
}
