import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher,
  IonRefresherContent, IonSearchbar, IonTitle, IonToolbar, ModalController, RefresherCustomEvent, ViewWillEnter
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { searchClippings, yearsLabel } from '../../core/clippings';
import { Clipping } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { errorMessage } from '../../core/ui.service';
import { ClippingFormModal } from './clipping-form.modal';

/** कात्रणे master: clipping files by title and years; list, search, add, edit and delete. */
@Component({
  selector: 'app-clippings',
  templateUrl: 'clippings.page.html',
  styleUrls: ['categories.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonSearchbar, IonContent, IonRefresher,
    IonRefresherContent, IonList, IonItem, IonLabel, PageSkeletonComponent
  ],
})
export class ClippingsPage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);

  readonly items = signal<Clipping[] | null>(null);
  readonly error = signal('');
  readonly query = signal('');
  readonly shown = computed(() => searchClippings(this.items() ?? [], this.query()));
  readonly yearsLabel = yearsLabel;

  ionViewWillEnter() {
    this.load();
  }

  search(value: string | null | undefined) {
    this.query.set((value ?? '').trim());
  }

  refresh(event: RefresherCustomEvent) {
    this.load(() => event.target.complete());
  }

  async edit(clipping?: Clipping) {
    const modal = await this.modals.create({ component: ClippingFormModal, componentProps: { clipping } });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'saved' || role === 'deleted') {
      this.load();
    }
  }

  private load(done?: () => void) {
    this.api.clippings().subscribe({
      next: list => { this.items.set(list); this.error.set(''); done?.(); },
      error: err => { this.error.set(errorMessage(err, 'Could not load the कात्रणे.')); done?.(); },
    });
  }
}

