import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher,
  IonRefresherContent, IonSearchbar, IonSkeletonText, IonTitle, IonToolbar, ModalController, RefresherCustomEvent
} from '@ionic/angular';
import { CategoriesStore } from '../../core/categories.store';
import { BookCategory } from '../../core/models';
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
  protected store = inject(CategoriesStore);

  readonly query = signal('');
  readonly shown = computed(() => {
    const q = this.query().toLowerCase();
    return this.store.items().filter(c => !q || c.name.toLowerCase().includes(q) || c.categoryNumber.toLowerCase().includes(q));
  });

  constructor() {
    this.store.load(true);
  }

  search(value: string | null | undefined) {
    this.query.set((value ?? '').trim());
  }

  refresh(event: RefresherCustomEvent) {
    this.store.load(true);
    setTimeout(() => event.target.complete(), 400);
  }

  async edit(category?: BookCategory) {
    const modal = await this.modals.create({ component: CategoryFormModal, componentProps: { category } });
    await modal.present();
  }
}
