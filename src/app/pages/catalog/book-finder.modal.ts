import { Component, inject, signal } from '@angular/core';
import {
  IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel,
  IonList, IonSearchbar, IonTitle, IonToolbar, ModalController,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { Book } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { PagedList } from '../../core/paged-list';
import { MarathiPipe } from '../../core/pipes';

/**
 * Find a book to issue by registration number or title (the Catalog's search). Nothing shows until
 * something is typed; then every match, 20 at a time as the list scrolls. A tap on an available book
 * closes with it (role 'pick'); issued ones show but can't be picked.
 */
@Component({
  selector: 'app-book-finder',
  templateUrl: 'book-finder.modal.html',
  styleUrls: ['book-finder.modal.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonSearchbar, IonContent, IonList, IonItem, IonLabel, IonBadge,
    IonInfiniteScroll, IonInfiniteScrollContent, MarathiPipe, PageSkeletonComponent,
  ],
})
export class BookFinderModal {
  private api = inject(ApiService);
  private modals = inject(ModalController);

  readonly query = signal('');
  readonly books = new PagedList<Book>((page, size) => this.api.books(this.query(), page, size), 'Could not search the books.');

  search(value: string | null | undefined) {
    this.query.set((value ?? '').trim());
    if (this.query()) {
      this.books.reset();
    }
  }

  pick(book: Book) {
    if (book.availableCopies > 0) {
      this.modals.dismiss(book, 'pick');
    }
  }

  close() {
    this.modals.dismiss(null, 'cancel');
  }
}
