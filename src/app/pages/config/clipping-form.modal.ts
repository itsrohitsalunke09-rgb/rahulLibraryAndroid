import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar, ModalController
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { Clipping, ClippingRequest } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';

/** Add or edit one कात्रण (a title and the years it covers); editing also offers Delete. */
@Component({
  selector: 'app-clipping-form',
  templateUrl: 'clipping-form.modal.html',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonSpinner],
  styles: [`
    .form { padding: 0 0 24px; max-width: 520px; margin: 0 auto; }
    .years { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .delete {
      display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 44px;
      margin-top: 28px; border: 1px solid var(--app-rust); border-radius: var(--app-radius-control);
      background: transparent; color: var(--app-rust); font: inherit; font-size: 14px; font-weight: 500; cursor: pointer;
    }
    .delete:disabled { opacity: 0.6; }
    .delete .icon { --icon-size: 17px; }
  `],
})
export class ClippingFormModal implements OnInit {
  /** Clipping to edit; leave empty to add a new one. */
  @Input() clipping?: Clipping;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);

  readonly thisYear = new Date().getFullYear();
  form = { title: '', yearFrom: '' as number | string, yearTo: '' as number | string };
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');

  ngOnInit() {
    const c = this.clipping;
    if (c) {
      this.form = { title: c.title, yearFrom: c.yearFrom, yearTo: c.yearTo };
    }
  }

  cancel() {
    this.modals.dismiss(null, 'cancel');
  }

  save() {
    const request = clippingRequest(this.form, this.thisYear);
    if (typeof request === 'string') {
      this.error.set(request);
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api.saveClipping(request, this.clipping?.id).subscribe({
      next: saved => {
        this.saving.set(false);
        this.ui.toast(this.clipping ? 'Saved.' : `${saved.title} added.`);
        this.modals.dismiss(saved, 'saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save the clipping.'));
      }
    });
  }

  async remove() {
    const clipping = this.clipping;
    if (!clipping || !(await this.ui.confirm('Delete कात्रण?', `"${clipping.title}" will be removed from the list.`, 'Delete', true))) {
      return;
    }
    this.deleting.set(true);
    this.error.set('');
    this.api.deleteClipping(clipping.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.ui.toast('Deleted.');
        this.modals.dismiss(null, 'deleted');
      },
      error: err => {
        this.deleting.set(false);
        this.error.set(errorMessage(err, 'Could not delete the clipping.'));
      }
    });
  }
}

/** The form as a request, or what to fix. An empty "To" year means the same as "From". */
export function clippingRequest(form: { title: string; yearFrom: number | string; yearTo: number | string },
                                thisYear: number): ClippingRequest | string {
  const title = form.title.trim();
  const yearFrom = Number(form.yearFrom);
  const yearTo = form.yearTo === '' || form.yearTo === null ? yearFrom : Number(form.yearTo);
  if (!title) {
    return 'Enter the title.';
  }
  if (![yearFrom, yearTo].every(y => Number.isInteger(y) && y >= 1800 && y <= thisYear)) {
    return `Enter years between 1800 and ${thisYear}, e.g. 1990.`;
  }
  if (yearTo < yearFrom) {
    return '"To" year must be the same as or after "From" year.';
  }
  return { title, yearFrom, yearTo };
}
