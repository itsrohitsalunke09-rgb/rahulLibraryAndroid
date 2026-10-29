import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar, ModalController,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { formatDate } from '../../core/dates';
import { PlanetKind, planetHue, planetName } from '../../core/galaxy';
import { BookIssue, ReaderCount, issueStatus } from '../../core/models';
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
  /** The student's body in the galaxy (Sun, planet or dwarf planet, by rank). */
  @Input({ required: true }) kind!: PlanetKind;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  readonly formatDate = formatDate;
  readonly planetName = planetName;
  get hue() {
    return planetHue(this.reader.studentId);
  }

  readonly books = signal<BookIssue[] | null>(null);
  readonly error = signal('');
  readonly status = issueStatus;
  /** Books in each state: Issued, Overdue, Returned. */
  readonly count = computed(() => {
    const list = this.books() ?? [];
    return { issued: list.filter(b => b.status === 'ISSUED').length, overdue: list.filter(b => b.status === 'OVERDUE').length,
      returned: list.filter(b => b.status === 'RETURNED').length };
  });
  readonly favourite = computed(() => favouriteCategory(this.books() ?? []));

  ngOnInit() {
    this.api.studentIssues(this.reader.studentId, this.year).subscribe({
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
