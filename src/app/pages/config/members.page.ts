import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  ActionSheetController, IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher,
  IonRefresherContent, IonSearchbar, IonTitle, IonToolbar, ModalController, RefresherCustomEvent, ViewWillEnter,
} from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { StudentSummary, UserAccount } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { PermissionsStore } from '../../core/permissions.store';
import { errorMessage } from '../../core/ui.service';
import { UserFormModal } from '../people/user-form.modal';
import { StudentBooksModal } from '../reports/student-books.modal';

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
 * Registers › सभासद: every student with issued, returned and total books. A tap offers their
 * transactions (the Books report's list), issuing them a book (via the Catalog) and editing the account.
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
  private sheets = inject(ActionSheetController);
  private router = inject(Router);
  private perms = inject(PermissionsStore);

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
  }

  refresh(event: RefresherCustomEvent) {
    this.load(() => event.target.complete());
  }

  async open(m: Member) {
    const buttons = [
      { text: 'Books & transactions', handler: () => void this.transactions(m) },
      ...(this.perms.can('REGISTER') ? [{ text: 'Issue a book', handler: () => void this.issue(m) }] : []),
      ...(this.perms.can('UPDATE') ? [{ text: 'Edit account', handler: () => void this.edit(m) }] : []),
      { text: 'Cancel', role: 'cancel' },
    ];
    const sheet = await this.sheets.create({ header: m.account.fullName, buttons });
    await sheet.present();
  }

  private async transactions(m: Member) {
    const modal = await this.modals.create({ component: StudentBooksModal, componentProps: { student: m.summary } });
    await modal.present();
  }

  /** The Catalog, to pick a book; it then opens the Issue screen with this student chosen. */
  private issue(m: Member) {
    const { id, fullName, username } = m.account;
    this.router.navigate(['/tabs/config/catalog'], { queryParams: { issueTo: id, name: fullName, username } });
  }

  private async edit(m: Member) {
    const modal = await this.modals.create({ component: UserFormModal, componentProps: { user: m.account } });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'saved' || role === 'deleted') {
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
