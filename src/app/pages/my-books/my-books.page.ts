import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBadge, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem,
  IonLabel, IonList, IonRefresher, IonRefresherContent,
  IonTitle, IonToolbar, RefresherCustomEvent, ViewWillEnter
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bookmarksOutline } from 'ionicons/icons';
import { ApiService } from '../../core/api.service';
import { BookIssue, ReaderRequest } from '../../core/models';
import { errorMessage } from '../../core/ui.service';
import { PagedList } from '../../core/paged-list';
import { DueTextPipe, MarathiPipe, ShortDatePipe, StatusColorPipe } from '../../core/pipes';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { SwipeTabsDirective } from '../../core/swipe-tabs.directive';
import { FilterCard, FilterCardsComponent } from '../../core/filter-cards.component';
import { PermissionsStore } from '../../core/permissions.store';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/** Tabs: books with the student, books given back, and books they requested or suggested. */
type Tab = 'CURRENT' | 'RETURNED' | 'REQUESTED' | 'SUGGESTED';

@Component({
  selector: 'app-my-books',
  templateUrl: 'my-books.page.html',
  styleUrls: ['my-books.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonRefresher, IonRefresherContent, IonList,
    IonItem, IonLabel, IonBadge, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, FilterCardsComponent,
    DueTextPipe, MarathiPipe, ShortDatePipe, StatusColorPipe,
    PageSkeletonComponent, RouterLink, SwipeTabsDirective,
  ],
})
export class MyBooksPage implements ViewWillEnter {
  private api = inject(ApiService);
  /** The Reading Galaxy shows here when the student role has Read. */
  protected perms = inject(PermissionsStore);

  readonly tab = signal<Tab>('CURRENT');
  /** The student's own requests and suggestions, done ones included; null until loaded. */
  private readonly wishes = signal<ReaderRequest[] | null>(null);
  readonly requests = computed(() => this.wishes()?.filter(w => w.kind === 'REQUEST') ?? null);
  readonly suggestions = computed(() => this.wishes()?.filter(w => w.kind === 'SUGGESTION') ?? null);
  readonly suggestionsError = signal('');

  readonly issues = new PagedList<BookIssue>((page, size) => this.api.myIssues(page, size), 'Could not load your books.');
  /** Books still with the student, most urgent (earliest due) first; history is listed separately. */
  readonly current = computed(() => this.issues.items()
    .filter(i => i.status !== 'RETURNED')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
  readonly returned = computed(() => this.issues.items().filter(i => i.status === 'RETURNED'));
  readonly overdueCount = computed(() => this.current().filter(i => i.status === 'OVERDUE').length);
  /** The filter cards; a count shows "–" until its list has loaded. */
  readonly cards = computed<FilterCard[]>(() => {
    const loaded = this.issues.loaded();
    return [
      { value: 'CURRENT', label: 'With me', count: loaded ? this.current().length : null, tone: this.overdueCount() ? 'late' : 'out' },
      { value: 'RETURNED', label: 'Returned', count: loaded ? this.returned().length : null, tone: 'back' },
      { value: 'REQUESTED', label: 'Requests', count: this.requests()?.length ?? null },
      { value: 'SUGGESTED', label: 'Suggested', count: this.suggestions()?.length ?? null },
    ];
  });

  constructor() {
    addIcons({ bookmarksOutline });
    // The Catalog opens a tab after a request (?tab=REQUESTED) or a suggestion (?tab=SUGGESTED).
    inject(ActivatedRoute).queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => this.setTab(params.get('tab')));
  }

  ionViewWillEnter() {
    this.issues.revisit();
    this.loadSuggestions();
  }

  setTab(value: unknown) {
    if (value === 'CURRENT' || value === 'RETURNED' || value === 'REQUESTED' || value === 'SUGGESTED') {
      this.tab.set(value);
    }
  }

  refresh(event: RefresherCustomEvent) {
    if (this.tab() === 'REQUESTED' || this.tab() === 'SUGGESTED') {
      this.loadSuggestions(() => event.target.complete());
    } else {
      this.issues.refresh(event);
    }
  }

  private loadSuggestions(done?: () => void) {
    this.api.myReaderRequests().subscribe({
      next: list => {
        this.suggestionsError.set('');
        this.wishes.set(list);
        done?.();
      },
      error: err => {
        this.suggestionsError.set(errorMessage(err, 'Could not load your requests and suggestions.'));
        done?.();
      },
    });
  }
}
