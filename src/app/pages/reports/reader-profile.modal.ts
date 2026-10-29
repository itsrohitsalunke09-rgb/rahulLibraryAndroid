import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar, ModalController,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { formatDate } from '../../core/dates';
import { planetKind } from '../../core/galaxy';
import { BookIssue, ReaderCount } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { MarathiPipe } from '../../core/pipes';
import { errorMessage } from '../../core/ui.service';

/** A student's reading profile for the year: their place among readers, counts, favourite category and books. */
@Component({
  selector: 'app-reader-profile',
  templateUrl: 'reader-profile.modal.html',
  styleUrls: ['planets.scss', 'reader-profile.modal.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent, IonList, IonItem, IonLabel,
    MarathiPipe, PageSkeletonComponent,
  ],
})
export class ReaderProfileModal implements OnInit {
  @Input({ required: true }) reader!: ReaderCount;
  /** 1 = the year's top reader. */
  @Input({ required: true }) rank!: number;
  @Input({ required: true }) readers!: number;
  @Input({ required: true }) year!: number;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  readonly formatDate = formatDate;
  /** Drawn as the same planet as in the galaxy. */
  get kind() {
    return planetKind(this.reader.studentId);
  }

  readonly books = signal<BookIssue[] | null>(null);
  readonly error = signal('');
  readonly out = computed(() => (this.books() ?? []).filter(b => !b.returnDate).length);
  readonly favourite = computed(() => favouriteCategory(this.books() ?? []));

  ngOnInit() {
    this.api.studentIssuesInYear(this.reader.studentId, this.year).subscribe({
      next: list => this.books.set(list),
      error: err => this.error.set(errorMessage(err, 'Could not load the books.')),
    });
  }

  close() {
    this.modals.dismiss(null, 'cancel');
  }
}

/** The category the student read most from, if their books have categories. */
export function favouriteCategory(books: Pick<BookIssue, 'category'>[]): string | null {
  const counts = new Map<string, number>();
  for (const b of books) {
    const c = b.category?.trim();
    if (c) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  for (const [c, n] of counts) {
    if (best === null || n > counts.get(best)!) {
      best = c;
    }
  }
  return best;
}
