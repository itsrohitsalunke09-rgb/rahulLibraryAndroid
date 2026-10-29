import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher,
  IonRefresherContent, IonSearchbar, IonTitle, IonToolbar, ModalController, RefresherCustomEvent, ViewWillEnter
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { ASSET_CONDITIONS, OfficeAsset } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { errorMessage } from '../../core/ui.service';
import { AssetFormModal } from './asset-form.modal';

/** Office assets master (admins): what the office owns; list, search, add, edit and delete. */
@Component({
  selector: 'app-assets',
  templateUrl: 'assets.page.html',
  styleUrls: ['categories.page.scss', 'assets.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonSearchbar, IonContent, IonRefresher,
    IonRefresherContent, IonList, IonItem, IonLabel, PageSkeletonComponent
  ],
})
export class AssetsPage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);

  readonly items = signal<OfficeAsset[] | null>(null);
  readonly error = signal('');
  readonly query = signal('');
  /** By name or place, ignoring case. */
  readonly shown = computed(() => {
    const q = this.query().toLowerCase();
    return (this.items() ?? []).filter(a => !q || a.name.toLowerCase().includes(q) || (a.location ?? '').toLowerCase().includes(q));
  });
  readonly conditions = ASSET_CONDITIONS;

  ionViewWillEnter() {
    this.load();
  }

  search(value: string | null | undefined) {
    this.query.set((value ?? '').trim());
  }

  refresh(event: RefresherCustomEvent) {
    this.load(() => event.target.complete());
  }

  async edit(asset?: OfficeAsset) {
    const modal = await this.modals.create({ component: AssetFormModal, componentProps: { asset } });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'saved' || role === 'deleted') {
      this.load();
    }
  }

  private load(done?: () => void) {
    this.api.assets().subscribe({
      next: list => { this.items.set(list); this.error.set(''); done?.(); },
      error: err => { this.error.set(errorMessage(err, 'Could not load the office assets.')); done?.(); },
    });
  }
}
