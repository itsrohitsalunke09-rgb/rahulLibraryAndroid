import { Component, inject, signal } from '@angular/core';
import {
  IonBadge, IonContent, IonHeader, IonIcon, IonInfiniteScroll,
  IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonRefresher, IonRefresherContent, IonSearchbar,
  IonTitle, IonToolbar, ModalController, ViewWillEnter
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { peopleOutline } from 'ionicons/icons';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Page, UserAccount } from '../../core/models';
import { PagedList } from '../../core/paged-list';
import { AvatarHuePipe, InitialsPipe } from '../../core/pipes';
import { UiService } from '../../core/ui.service';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { UserFormModal } from './user-form.modal';

@Component({
  selector: 'app-people',
  templateUrl: 'people.page.html',
  styleUrls: ['people.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonSearchbar, IonContent, IonRefresher,
    IonRefresherContent, IonList, IonItem, IonLabel, IonBadge, IonIcon,
    IonInfiniteScroll, IonInfiniteScrollContent,
    InitialsPipe, AvatarHuePipe,
    PageSkeletonComponent
  ],
})
/** Students only: staff accounts (librarians, admins) are kept off this list. */
export class PeoplePage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);
  protected auth = inject(AuthService);

  readonly query = signal('');
  readonly people = new PagedList<UserAccount>((page, size) => this.fetch(page, size), 'Could not load people.');

  constructor() {
    addIcons({ peopleOutline });
  }

  ionViewWillEnter() {
    this.people.revisit();
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
      this.ui.toast('Only an admin can edit admin accounts.', 'error');
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
    return this.api.users(page, size, 'STUDENT', this.query());
  }
}
