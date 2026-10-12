import { Component, computed, inject } from '@angular/core';
import {
  IonBadge, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem,
  IonLabel, IonList, IonListHeader, IonRefresher, IonRefresherContent, IonSkeletonText, IonText,
  IonTitle, IonToolbar, ViewWillEnter
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bookmarksOutline } from 'ionicons/icons';
import { ApiService } from '../../core/api.service';
import { dueText, formatDate, statusColor } from '../../core/dates';
import { BookIssue } from '../../core/models';
import { PagedList } from '../../core/paged-list';

@Component({
  selector: 'app-my-books',
  templateUrl: 'my-books.page.html',
  styleUrls: ['my-books.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonRefresher, IonRefresherContent, IonList, IonListHeader,
    IonItem, IonLabel, IonBadge, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonSkeletonText, IonText
  ],
})
export class MyBooksPage implements ViewWillEnter {
  private api = inject(ApiService);

  readonly issues = new PagedList<BookIssue>(page => this.api.myIssues(page), 'Could not load your books.');
  /** Books still with the student, most urgent (earliest due) first; history is listed separately. */
  readonly current = computed(() => this.issues.items()
    .filter(i => i.status !== 'RETURNED')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
  readonly returned = computed(() => this.issues.items().filter(i => i.status === 'RETURNED'));
  readonly overdueCount = computed(() => this.current().filter(i => i.status === 'OVERDUE').length);

  protected readonly dueText = dueText;
  protected readonly formatDate = formatDate;
  protected readonly statusColor = statusColor;

  constructor() {
    addIcons({ bookmarksOutline });
  }

  ionViewWillEnter() {
    this.issues.reset();
  }
}
