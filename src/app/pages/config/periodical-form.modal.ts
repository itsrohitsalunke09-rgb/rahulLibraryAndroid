import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonItem, IonSpinner, IonTitle, IonToggle, IonToolbar, ModalController
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { FREQUENCY_LABELS, Periodical, PeriodicalFrequency } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';

/** Add or edit one newspaper or magazine; editing also offers Delete. */
@Component({
  selector: 'app-periodical-form',
  templateUrl: 'periodical-form.modal.html',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonSpinner, IonItem, IonToggle],
  styles: [`
    .form { padding: 0 0 24px; max-width: 520px; margin: 0 auto; }
    .active-row { margin-top: 14px; }
    .toggle-help { display: block; margin: 6px 4px 0; }
    .delete {
      display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 44px;
      margin-top: 28px; border: 1px solid var(--app-rust); border-radius: var(--app-radius-control);
      background: transparent; color: var(--app-rust); font: inherit; font-size: 14px; font-weight: 500; cursor: pointer;
    }
    .delete:disabled { opacity: 0.6; }
    .delete .icon { --icon-size: 17px; }
  `],
})
export class PeriodicalFormModal implements OnInit {
  /** The one to edit; leave empty to add a new one. */
  @Input() periodical?: Periodical;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);

  readonly frequencies = Object.entries(FREQUENCY_LABELS) as [PeriodicalFrequency, string][];
  form = { name: '', language: '', frequency: 'DAILY' as PeriodicalFrequency, price: '' as number | string, active: true };
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');

  ngOnInit() {
    const p = this.periodical;
    if (p) {
      this.form = { name: p.name, language: p.language ?? '', frequency: p.frequency, price: p.price, active: p.active };
    }
  }

  cancel() {
    this.modals.dismiss(null, 'cancel');
  }

  save() {
    const name = this.form.name.trim();
    const price = this.form.price === '' || this.form.price === null ? 0 : Number(this.form.price);
    if (!name) {
      this.error.set('Enter the name of the newspaper or magazine.');
      return;
    }
    if (!Number.isFinite(price) || price < 0 || price > 10000) {
      this.error.set('Enter the price of one copy in rupees, e.g. 6 or 7.50.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const request = { name, language: this.form.language.trim() || null, frequency: this.form.frequency, price, active: this.form.active };
    this.api.savePeriodical(request, this.periodical?.id).subscribe({
      next: saved => {
        this.saving.set(false);
        this.ui.toast(this.periodical ? 'Saved.' : `${saved.name} added.`);
        this.modals.dismiss(saved, 'saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save.'));
      }
    });
  }

  async remove() {
    const p = this.periodical;
    if (!p || !(await this.ui.confirm(`Delete ${p.name}?`, 'It is removed from the list. This works only if it has no register entries.', 'Delete', true))) {
      return;
    }
    this.deleting.set(true);
    this.error.set('');
    this.api.deletePeriodical(p.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.ui.toast('Deleted.');
        this.modals.dismiss(null, 'deleted');
      },
      error: err => {
        this.deleting.set(false);
        this.error.set(errorMessage(err, 'Could not delete.'));
      }
    });
  }
}
