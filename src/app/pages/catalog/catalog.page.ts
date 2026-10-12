import { Component, inject, signal } from '@angular/core';
import {
  IonBadge, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInfiniteScroll,
  IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonNote, IonRefresher, IonRefresherContent,
  IonSearchbar, IonSkeletonText, IonText, IonTitle, IonToolbar, ModalController, ViewWillEnter
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, libraryOutline } from 'ionicons/icons';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Book } from '../../core/models';
import { PagedList } from '../../core/paged-list';
import { BookDetailModal } from './book-detail.modal';
import { BookFormModal } from './book-form.modal';

@Component({
  selector: 'app-catalog',
  templateUrl: 'catalog.page.html',
  styleUrls: ['catalog.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonSearchbar, IonContent, IonRefresher, IonRefresherContent, IonList,
    IonItem, IonLabel, IonNote, IonBadge, IonInfiniteScroll, IonInfiniteScrollContent, IonFab, IonFabButton,
    IonIcon, IonSkeletonText, IonText
  ],
})
export class CatalogPage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);
  protected auth = inject(AuthService);

  readonly query = signal('');
  readonly books = new PagedList<Book>(page => this.api.books(this.query(), page), 'Could not load books.');

  constructor() {
    addIcons({ add, libraryOutline });
  }

  ionViewWillEnter() {
    // Refresh each visit so availability is current after issues/returns elsewhere.
    this.books.reset();
  }

  search(value: string | null | undefined) {
    this.query.set((value ?? '').trim());
    this.books.reset();
  }

  async open(book: Book) {
    const modal = await this.modals.create({ component: BookDetailModal, componentProps: { book } });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<Book>();
    if (role === 'deleted') {
      this.books.remove(b => b.id === book.id);
    } else if (role === 'changed' && data) {
      this.books.replace(b => b.id === data.id, data);
    }
  }

  async add() {
    const modal = await this.modals.create({ component: BookFormModal });
    await modal.present();
    const { role } = await modal.onWillDismiss<Book>();
    if (role === 'saved') {
      this.books.reset();
    }
  }

  isMarathi(book: Book) {
    return book.category === 'Marathi Literature';
  }
}
