import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher,
  IonRefresherContent, IonSearchbar, IonSkeletonText, IonTitle, IonToolbar, ModalController, RefresherCustomEvent
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { CategoriesStore } from '../../core/categories.store';
import { BookCategory, UnlinkedCategory } from '../../core/models';
import { CategoryFormModal } from './category-form.modal';

/** Book category master: list, search, add, edit and delete. */
@Component({
  selector: 'app-categories',
  templateUrl: 'categories.page.html',
  styleUrls: ['categories.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonSearchbar, IonContent, IonRefresher,
    IonRefresherContent, IonList, IonItem, IonLabel, IonSkeletonText
  ],
})
export class CategoriesPage {
  private modals = inject(ModalController);
  private api = inject(ApiService);
  protected store = inject(CategoriesStore);

  readonly query = signal('');
  /** Categories typed on books that match no master name; adding one links those books. */
  readonly unlinked = signal<UnlinkedCategory[]>([]);
  readonly shown = computed(() => {
    const q = this.query().toLowerCase();
    return this.store.items().filter(c => !q || c.name.toLowerCase().includes(q) || c.categoryNumber.toLowerCase().includes(q));
  });

  constructor() {
    this.store.load(true);
    this.loadUnlinked();
  }

  loadUnlinked() {
    this.api.unlinkedCategories().subscribe({ next: list => this.unlinked.set(list), error: () => this.unlinked.set([]) });
  }

  search(value: string | null | undefined) {
    this.query.set((value ?? '').trim());
  }

  refresh(event: RefresherCustomEvent) {
    this.store.load(true);
    this.loadUnlinked();
    setTimeout(() => event.target.complete(), 400);
  }

  async edit(category?: BookCategory, presetName?: string) {
    const modal = await this.modals.create({ component: CategoryFormModal, componentProps: { category, presetName } });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role !== 'cancel') {
      this.loadUnlinked();
    }
  }
}
