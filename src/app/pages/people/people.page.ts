import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonBadge, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInfiniteScroll,
  IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonRefresher, IonRefresherContent, IonSearchbar,
  IonSegment, IonSegmentButton, IonSkeletonText, IonTitle, IonToolbar, ModalController, ViewWillEnter
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personAdd, peopleOutline } from 'ionicons/icons';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Page, Role, UserAccount, roleLabel } from '../../core/models';
import { PagedList } from '../../core/paged-list';
import { UiService } from '../../core/ui.service';
import { UserFormModal } from './user-form.modal';

type Filter = Role | 'ALL';
const FILTERS: Filter[] = ['ALL', 'STUDENT', 'LIBRARIAN', 'ADMIN'];

@Component({
  selector: 'app-people',
  templateUrl: 'people.page.html',
  styleUrls: ['people.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonSearchbar, IonSegment, IonSegmentButton, IonContent, IonRefresher,
    IonRefresherContent, IonList, IonItem, IonLabel, IonBadge, IonFab, IonFabButton, IonIcon,
    IonInfiniteScroll, IonInfiniteScrollContent, IonSkeletonText
  ],
})
export class PeoplePage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);
  private route = inject(ActivatedRoute);
  protected auth = inject(AuthService);

  readonly filter = signal<Filter>('ALL');
  readonly query = signal('');
  readonly people = new PagedList<UserAccount>(page => this.fetch(page), 'Could not load people.');

  constructor() {
    addIcons({ personAdd, peopleOutline });
    // Dashboard tiles link here with ?role=STUDENT / LIBRARIAN.
    this.route.queryParamMap.subscribe(params => {
      const role = params.get('role') as Filter | null;
      if (role && FILTERS.includes(role) && role !== this.filter()) {
        this.filter.set(role);
        this.people.reset();
      }
    });
  }

  ionViewWillEnter() {
    this.people.reset();
  }

  setFilter(value: unknown) {
    if (FILTERS.includes(value as Filter)) {
      this.filter.set(value as Filter);
      this.people.reset();
    }
  }

  search(value: string | null | undefined) {
    this.query.set((value ?? '').trim());
    this.people.reset();
  }

  canEdit(user: UserAccount) {
    return user.role !== 'ADMIN' || this.auth.isAdmin();
  }

  async open(user?: UserAccount) {
    if (user && !this.canEdit(user)) {
      this.ui.toast('Only an admin can edit admin accounts.', 'medium');
      return;
    }
    const modal = await this.modals.create({ component: UserFormModal, componentProps: { user } });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<UserAccount>();
    if (role === 'deleted' && user) {
      this.people.remove(u => u.id === user.id);
    } else if (role === 'saved' && data) {
      if (user) {
        this.people.replace(u => u.id === data.id, data);
      } else {
        this.people.reset();
      }
    }
  }

  roleColor(role: Role) {
    return role === 'ADMIN' ? 'primary' : role === 'LIBRARIAN' ? 'warning' : 'medium';
  }

  protected readonly roleLabel = roleLabel;

  initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  private fetch(page: number): Observable<Page<UserAccount>> {
    const q = this.query();
    if (q) {
      // The backend's search covers active students only and is not paged.
      return this.api.searchStudents(q).pipe(map(list => asSinglePage(list)));
    }
    const role = this.filter();
    return this.api.users(page, 20, role === 'ALL' ? undefined : role);
  }
}

function asSinglePage<T>(content: T[]): Page<T> {
  return {
    content, totalElements: content.length, totalPages: 1, size: content.length, number: 0, first: true, last: true
  };
}
