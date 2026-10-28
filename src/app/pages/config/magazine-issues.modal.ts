import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { receiptLabel } from '../../core/magazine-periods';
import { MagazineCard, MagazineReceipt } from '../../core/models';
import { UiService } from '../../core/ui.service';

/** Every issue recorded for one magazine, newest अंक first, each removable if marked by mistake. */
@Component({
  selector: 'app-magazine-issues',
  templateUrl: 'magazine-issues.modal.html',
  styleUrls: ['magazine-issues.modal.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent],
})
export class MagazineIssuesModal implements OnInit {
  @Input({ required: true }) card!: MagazineCard;
  /** Told after each removal, so the card behind updates its strip and count at once. */
  @Input() onChange?: (receipts: MagazineReceipt[]) => void;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);

  readonly receipts = signal<MagazineReceipt[]>([]);
  readonly removing = signal<number | null>(null);
  readonly label = receiptLabel;
  readonly sorted = computed(() =>
    [...this.receipts()].sort((a, b) => (b.issueNo ?? 0) - (a.issueNo ?? 0) || b.periodFrom.localeCompare(a.periodFrom)));

  ngOnInit() {
    this.receipts.set(this.card.receipts);
  }

  close() {
    this.modals.dismiss(null, 'cancel');
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
        this.receipts.update(list => list.filter(r => r.id !== receipt.id));
        this.onChange?.(this.receipts());
        this.ui.toast('Removed.');
      },
      error: err => {
        this.removing.set(null);
        this.ui.error(err, 'Could not remove it.');
      },
    });
  }
}
