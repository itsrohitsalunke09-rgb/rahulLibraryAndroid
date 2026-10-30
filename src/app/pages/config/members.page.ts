import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher,
  IonRefresherContent, IonSearchbar, IonTitle, IonToolbar, ModalController, RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { StudentSummary, UserAccount } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { errorMessage } from '../../core/ui.service';
import { ReaderProfileModal } from '../reports/reader-profile.modal';
import { planetTiers } from '../../core/galaxy';
import { GalaxyReadersStore } from '../../core/galaxy-readers.store';

/** A student with their book totals (all years); zeros for one who has had no books yet. */
export interface Member {
  account: UserAccount;
  summary: StudentSummary;
}

/** Every active student, with or without books, joined to their totals by id; A to Z. */
export function members(students: UserAccount[], summaries: StudentSummary[]): Member[] {
  const byId = new Map(summaries.map(s => [s.studentId, s]));
  return students
    .map(account => ({
      account,
      summary: byId.get(account.id)
        ?? { studentId: account.id, studentName: account.fullName, total: 0, returned: 0, issued: 0, overdue: 0 },
    }))
    .sort((a, b) => a.account.fullName.localeCompare(b.account.fullName));
}

/**
 * Registers › सभासद: every student with issued, returned and total books. A tap opens their profile
 * (as a planet does in the Reading Galaxy): all their transactions, Issue a book and Edit account.
 */
@Component({
  selector: 'app-members',
  templateUrl: 'members.page.html',
  styleUrls: ['members.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonSearchbar, IonContent, IonRefresher,
    IonRefresherContent, IonList, IonItem, IonLabel, PageSkeletonComponent,
  ],
})
export class MembersPage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);
  private galaxy = inject(GalaxyReadersStore);

  readonly all = signal<Member[] | null>(null);
  readonly error = signal('');
  readonly query = signal('');
  /** Name, username or phone starting with what's typed; the list is small (one library), so filtered here. */
  readonly shown = computed(() => {
    const q = this.query().toLowerCase();
    return (this.all() ?? []).filter(({ account: a }) => !q
      || [a.fullName, a.username, a.phone ?? ''].some(v => v.toLowerCase().startsWith(q))
      || a.fullName.toLowerCase().includes(' ' + q));
  });

  ionViewWillEnter() {
    this.load();
    this.galaxy.refresh();
  }

  refresh(event: RefresherCustomEvent) {
    this.load(() => event.target.complete());
  }

  /** The Reading Galaxy's profile screen, for all years, with Issue a book and Edit account. */
  async open(m: Member) {
    const modal = await this.modals.create({
      component: ReaderProfileModal,
      componentProps: {
        reader: { studentId: m.account.id, studentName: m.account.fullName, books: m.summary.total },
        account: m.account,
        // The same body as in this year's Reading Galaxy; no books this year = the plain coloured planet.
        kind: planetTiers(this.galaxy.readers() ?? []).get(m.account.id) ?? 'other',
      },
    });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'changed') {
      this.load();
    }
  }

  private load(done?: () => void) {
    forkJoin([this.api.searchStudents(''), this.api.studentSummaries()]).subscribe({
      next: ([students, summaries]) => {
        this.error.set('');
        this.all.set(members(students, summaries));
        done?.();
      },
      error: err => {
        this.error.set(errorMessage(err, 'Could not load the members.'));
        done?.();
      },
    });
  }
}
