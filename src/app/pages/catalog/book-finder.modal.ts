import { Component, OnDestroy, inject, signal } from '@angular/core';
import {
  IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonSearchbar, IonTitle, IonToolbar,
  ModalController,
} from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Book } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { MarathiPipe } from '../../core/pipes';
import { errorMessage } from '../../core/ui.service';

/** Matches shown at a time; typing more of the title or number narrows them. */
const RESULTS = 20;

/**
 * Find a book to issue by registration number or title (the Catalog's search); a tap on an available
 * book closes with it (role 'pick'). Issued ones show but can't be picked.
 */
@Component({
  selector: 'app-book-finder',
  templateUrl: 'book-finder.modal.html',
  styleUrls: ['book-finder.modal.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonSearchbar, IonContent, IonList, IonItem, IonLabel, IonBadge,
    MarathiPipe, PageSkeletonComponent,
  ],
})
export class BookFinderModal implements OnDestroy {
  private api = inject(ApiService);
  private modals = inject(ModalController);

  readonly query = signal('');
  readonly books = signal<Book[] | null>(null);
  readonly total = signal(0);
  readonly error = signal('');
  private request?: Subscription;

  constructor() {
    this.search('');
  }

  search(value: string | null | undefined) {
    const q = (value ?? '').trim();
    this.query.set(q);
    this.request?.unsubscribe();
    this.books.set(null);
    this.request = this.api.books(q, 0, RESULTS).subscribe({
      next: page => {
        this.error.set('');
        this.books.set(page.content);
        this.total.set(page.totalElements);
      },
      error: err => this.error.set(errorMessage(err, 'Could not search the books.')),
    });
  }

  pick(book: Book) {
    if (book.availableCopies > 0) {
      this.modals.dismiss(book, 'pick');
    }
  }

  close() {
    this.modals.dismiss(null, 'cancel');
  }

  ngOnDestroy() {
    this.request?.unsubscribe();
  }
}
