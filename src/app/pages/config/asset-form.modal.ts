import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar, ModalController
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { localIsoDate } from '../../core/dates';
import { ASSET_CONDITIONS, AssetCondition, AssetRequest, OfficeAsset } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';

/** The form's values: number fields arrive as strings while typing. */
export interface AssetForm {
  name: string;
  quantity: number | string;
  location: string;
  purchaseDate: string;
  price: number | string;
  condition: AssetCondition;
  notes: string;
}

/** Add or edit one office asset; editing also offers Delete. */
@Component({
  selector: 'app-asset-form',
  templateUrl: 'asset-form.modal.html',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonSpinner],
  styles: [`
    .form { padding: 0 0 24px; max-width: 520px; margin: 0 auto; }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .save {
      display: grid; place-items: center; width: 100%; height: 50px; margin-top: 20px; border: 0; border-radius: 100px;
      background: var(--app-accent); color: var(--app-on-accent); font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;
    }
    .save:disabled { opacity: 0.6; }
    .save ion-spinner { width: 20px; height: 20px; color: var(--app-on-accent); }
    .delete {
      display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 44px;
      margin-top: 28px; border: 1px solid var(--app-rust); border-radius: var(--app-radius-control);
      background: transparent; color: var(--app-rust); font: inherit; font-size: 14px; font-weight: 500; cursor: pointer;
    }
    .delete:disabled { opacity: 0.6; }
    .delete .icon { --icon-size: 17px; }
  `],
})
export class AssetFormModal implements OnInit {
  /** Asset to edit; leave empty to add a new one. */
  @Input() asset?: OfficeAsset;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);

  readonly today = localIsoDate();
  readonly conditions = Object.entries(ASSET_CONDITIONS) as [AssetCondition, string][];
  form: AssetForm = { name: '', quantity: 1, location: '', purchaseDate: '', price: '', condition: 'GOOD', notes: '' };
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');

  ngOnInit() {
    const a = this.asset;
    if (a) {
      this.form = {
        name: a.name, quantity: a.quantity, location: a.location ?? '', purchaseDate: a.purchaseDate ?? '',
        price: a.price ?? '', condition: a.condition, notes: a.notes ?? '',
      };
    }
  }

  cancel() {
    this.modals.dismiss(null, 'cancel');
  }

  save() {
    const request = assetRequest(this.form, this.today);
    if (typeof request === 'string') {
      this.error.set(request);
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api.saveAsset(request, this.asset?.id).subscribe({
      next: saved => {
        this.saving.set(false);
        this.ui.toast(this.asset ? 'Saved.' : `${saved.name} added.`);
        this.modals.dismiss(saved, 'saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save the asset.'));
      }
    });
  }

  async remove() {
    const asset = this.asset;
    if (!asset || !(await this.ui.confirm('Delete asset?', `"${asset.name}" will be removed from the list.`, 'Delete', true))) {
      return;
    }
    this.deleting.set(true);
    this.error.set('');
    this.api.deleteAsset(asset.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.ui.toast('Deleted.');
        this.modals.dismiss(null, 'deleted');
      },
      error: err => {
        this.deleting.set(false);
        this.error.set(errorMessage(err, 'Could not delete the asset.'));
      }
    });
  }
}

/** The form as a request, or what to fix. An empty quantity means 1. */
export function assetRequest(form: AssetForm, today: string): AssetRequest | string {
  const name = form.name.trim();
  const quantity = form.quantity === '' || form.quantity == null ? 1 : Number(form.quantity);
  const price = form.price === '' || form.price == null ? undefined : Number(form.price);
  if (!name) {
    return 'Enter the asset’s name.';
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return 'Quantity must be a whole number, 1 or more.';
  }
  if (price !== undefined && !(price >= 0)) {
    return 'Enter a price of 0 or more.';
  }
  if (form.purchaseDate && form.purchaseDate > today) {
    return 'The purchase date can’t be in the future.';
  }
  return {
    name, quantity, price, condition: form.condition,
    location: form.location.trim() || undefined,
    purchaseDate: form.purchaseDate || undefined,
    notes: form.notes.trim() || undefined,
  };
}
