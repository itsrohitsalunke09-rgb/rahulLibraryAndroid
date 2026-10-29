import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher, IonRefresherContent,
  IonSegment, IonSegmentButton, IonTitle, IonToolbar, RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { formatDate } from '../../core/dates';
import { ReaderRequest } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { PermissionsStore } from '../../core/permissions.store';
import { UiService, errorMessage } from '../../core/ui.service';

/**
 * Students' requests for catalog books and suggestions of books to buy, newest first (staff).
 * Done clears one once it is dealt with: the book given, or the suggestion considered.
 */
@Component({
  selector: 'app-reader-requests',
  templateUrl: 'reader-requests.page.html',
  styleUrls: ['reader-requests.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonRefresher, IonRefresherContent,
    IonSegment, IonSegmentButton, IonList, IonItem, IonLabel, PageSkeletonComponent,
  ],
})
export class ReaderRequestsPage implements ViewWillEnter {
  private api = inject(ApiService);
  private ui = inject(UiService);
  /** Done needs the Update permission. */
  protected perms = inject(PermissionsStore);

  readonly all = signal<ReaderRequest[] | null>(null);
  readonly error = signal('');
  readonly kind = signal<ReaderRequest['kind']>('REQUEST');
  readonly shown = computed(() => (this.all() ?? []).filter(r => r.kind === this.kind()));
  readonly count = (kind: ReaderRequest['kind']) => (this.all() ?? []).filter(r => r.kind === kind).length;
  readonly clearing = signal<number | null>(null);
  readonly formatDate = formatDate;

  ionViewWillEnter() {
    this.load();
  }

  refresh(event: RefresherCustomEvent) {
    this.load(() => event.target.complete());
  }

  setKind(value: unknown) {
    if (value === 'REQUEST' || value === 'SUGGESTION') {
      this.kind.set(value);
    }
  }

  async done(r: ReaderRequest) {
    const what = r.kind === 'REQUEST' ? 'request' : 'suggestion';
    if (!(await this.ui.confirm(`Mark this ${what} done?`, `"${r.title}" from ${r.studentName} will be removed from the list.`, 'Done'))) {
      return;
    }
    this.clearing.set(r.id);
    this.api.clearReaderRequest(r.id).subscribe({
      next: () => {
        this.clearing.set(null);
        this.all.update(list => (list ?? []).filter(x => x.id !== r.id));
        this.ui.toast(`${what[0].toUpperCase()}${what.slice(1)} marked done.`);
      },
      error: err => {
        this.clearing.set(null);
        this.ui.error(err, `Could not clear the ${what}.`);
      },
    });
  }

  private load(done?: () => void) {
    this.api.readerRequests().subscribe({
      next: list => {
        this.error.set('');
        this.all.set(list);
        done?.();
      },
      error: err => {
        this.error.set(errorMessage(err, 'Could not load requests and suggestions.'));
        done?.();
      },
    });
  }
}
