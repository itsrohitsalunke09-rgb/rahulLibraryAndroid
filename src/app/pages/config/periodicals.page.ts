import { Component, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher, IonRefresherContent,
  IonSkeletonText, IonTitle, IonToolbar, ModalController, RefresherCustomEvent, ViewWillEnter
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { FREQUENCY_LABELS, Periodical, rupees } from '../../core/models';
import { errorMessage } from '../../core/ui.service';
import { PeriodicalFormModal } from './periodical-form.modal';

/** Configuration → Newspapers & magazines: the list the daily register is filled from. */
@Component({
  selector: 'app-periodicals',
  templateUrl: 'periodicals.page.html',
  styleUrls: ['categories.page.scss', 'periodicals.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonRefresher, IonRefresherContent,
    IonList, IonItem, IonLabel, IonSkeletonText
  ],
})
export class PeriodicalsPage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);

  readonly items = signal<Periodical[]>([]);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly labels = FREQUENCY_LABELS;
  readonly rupees = rupees;

  ionViewWillEnter() {
    this.load();
  }

  refresh(event: RefresherCustomEvent) {
    this.load(() => event.target.complete());
  }

  async edit(periodical?: Periodical) {
    const modal = await this.modals.create({ component: PeriodicalFormModal, componentProps: { periodical } });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role !== 'cancel') {
      this.load();
    }
  }

  private load(done?: () => void) {
    this.api.periodicals().subscribe({
      next: list => {
        this.items.set(list);
        this.error.set('');
        this.loaded.set(true);
        done?.();
      },
      error: err => {
        this.error.set(errorMessage(err, 'Could not load the newspapers and magazines.'));
        this.loaded.set(true);
        done?.();
      }
    });
  }
}
