import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBadge, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInfiniteScroll,
  IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonRefresher, IonRefresherContent, IonSearchbar,
  IonSegment, IonSegmentButton, IonSkeletonText, IonTitle, IonToolbar, ModalController, ViewWillEnter
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personAdd, peopleOutline } from 'ionicons/icons';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { clearLinkFilters } from '../../core/link-filters';
import { Page, Role, UserAccount } from '../../core/models';
import { PagedList } from '../../core/paged-list';
import { InitialsPipe, RoleColorPipe, RoleLabelPipe } from '../../core/pipes';
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
    IonInfiniteScroll, IonInfiniteScrollContent, IonSkeletonText,
    InitialsPipe, RoleColorPipe, RoleLabelPipe
  ],
})
export class PeoplePage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected auth = inject(AuthService);

  readonly filter = signal<Filter>('ALL');
  readonly query = signal('');
  readonly people = new PagedList<UserAccount>((page, size) => this.fetch(page, size), 'Could not load people.');

  constructor() {
    addIcons({ personAdd, peopleOutline });
    // Dashboard tiles link here with ?role=STUDENT / LIBRARIAN.
    this.route.queryParamMap.subscribe(params => {
      if (!params.has('role')) {
        return;
      }
      const role = params.get('role') as Filter | null;
      if (role && FILTERS.includes(role) && role !== this.filter()) {
        this.filter.set(role);
        this.people.reset();
      }
      clearLinkFilters(this.router, this.route);
    });
  }

  ionViewWillEnter() {
    this.people.revisit();
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

  private fetch(page: number, size: number): Observable<Page<UserAccount>> {
    const role = this.filter();
    return this.api.users(page, size, role === 'ALL' ? undefined : role, this.query());
  }
}
