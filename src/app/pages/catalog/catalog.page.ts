import { Component, inject, signal } from '@angular/core';
import {
  IonBadge, IonContent, IonHeader, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel,
  IonList, IonRefresher, IonRefresherContent, IonSearchbar, IonSkeletonText, IonTitle, IonToolbar,
  ModalController, ViewWillEnter
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Book } from '../../core/models';
import { PagedList } from '../../core/paged-list';
import { MarathiPipe } from '../../core/pipes';
import { BookDetailModal } from './book-detail.modal';
import { BookFormModal } from './book-form.modal';
import { ImportBooksModal } from './import-books.modal';

@Component({
  selector: 'app-catalog',
  templateUrl: 'catalog.page.html',
  styleUrls: ['catalog.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonSearchbar, IonContent, IonRefresher, IonRefresherContent, IonList,
    IonItem, IonLabel, IonBadge, IonInfiniteScroll, IonInfiniteScrollContent, IonSkeletonText, MarathiPipe
  ],
})
export class CatalogPage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);
  protected auth = inject(AuthService);

  readonly query = signal('');
  readonly books = new PagedList<Book>((page, size) => this.api.books(this.query(), page, size), 'Could not load books.');

  ionViewWillEnter() {
    // Reload only when stale, so availability is current without refetching on every tab switch.
    this.books.revisit();
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

  async importExcel() {
    const modal = await this.modals.create({ component: ImportBooksModal });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'imported') {
      this.books.reset();
    }
  }
}
