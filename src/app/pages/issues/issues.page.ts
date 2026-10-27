import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBadge, IonButton, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent,
  IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonRefresher,
  IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, 
  IonTitle, IonToolbar, ViewWillEnter
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { returnDownBackOutline, swapHorizontalOutline } from 'ionicons/icons';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { issueYears, openYearSelect } from '../../core/issue-years';
import { clearLinkFilters } from '../../core/link-filters';
import { BookIssue, IssueCounts, Page } from '../../core/models';
import { PagedList } from '../../core/paged-list';
import { DueTextPipe, MarathiPipe, ShortDatePipe, StatusColorPipe, StatusLabelPipe } from '../../core/pipes';
import { UiService } from '../../core/ui.service';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';

/**
 * OUT = every copy not yet returned (overdue included), matching the dashboard's "Issued" number.
 * YEAR = every issue made in the chosen year (by issued date), any status.
 */
type Filter = 'OUT' | 'OVERDUE' | 'RETURNED' | 'ALL' | 'YEAR';
const FILTERS: Filter[] = ['OUT', 'OVERDUE', 'RETURNED', 'ALL', 'YEAR'];

@Component({
  selector: 'app-issues',
  templateUrl: 'issues.page.html',
  styleUrls: ['issues.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonSearchbar, IonSegment, IonSegmentButton, IonContent, IonRefresher,
    IonRefresherContent, IonList, IonItemSliding, IonItem, IonLabel, IonBadge, IonItemOptions, IonItemOption,
    IonButton, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonSelect, IonSelectOption,
    DueTextPipe, MarathiPipe, ShortDatePipe, StatusColorPipe, StatusLabelPipe,
    PageSkeletonComponent
  ],
})
export class IssuesPage implements ViewWillEnter {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly filter = signal<Filter>('ALL');
  /** Year that narrows every tab; starts on the current year, null = all years. */
  readonly year = signal<number | null>(new Date().getFullYear());
  readonly years = signal(issueYears());
  private readonly yearSelect = viewChild('yearSelect', { read: ElementRef<HTMLIonSelectElement> });
  /** Tab to go back to if the year list is closed without picking a year. */
  private beforeYear: Filter = 'ALL';
  readonly query = signal('');
  readonly counts = signal<IssueCounts | null>(null);
  readonly returning = signal<number | null>(null);
  readonly issues = new PagedList<BookIssue>((page, size) => this.fetch(page, size), 'Could not load issues.');

  constructor() {
    addIcons({ returnDownBackOutline, swapHorizontalOutline });
    // Dashboard tiles link here with ?status=OUT / OVERDUE, plus &year=… when a year is chosen there.
    this.route.queryParamMap.subscribe(params => {
      if (!params.has('status') && !params.has('year')) {
        return;
      }
      const status = params.get('status') as Filter | null;
      const year = Number(params.get('year')) || null;
      let changed = false;
      if (status && FILTERS.includes(status) && status !== this.filter()) {
        this.filter.set(status);
        changed = true;
      }
      if (year !== this.year()) {
        this.year.set(year);
        changed = true;
      }
      if (changed) {
        this.issues.reset();
        this.loadCounts();
      }
      clearLinkFilters(this.router, this.route);
    });
  }

  ionViewWillEnter() {
    // The tab counts and years go stale with the list, so they reload together.
    if (this.issues.revisit()) {
      this.loadCounts();
    }
  }

  setFilter(value: unknown) {
    if (!FILTERS.includes(value as Filter) || value === this.filter()) {
      return;
    }
    if (value === 'YEAR') {
      // The tab's click opens the year dropdown; the list changes once a year is picked.
      this.beforeYear = this.filter();
      this.filter.set('YEAR');
      return;
    }
    this.filter.set(value as Filter);
    this.issues.reset();
  }

  /** Opens the year list under the Year tab (also when tapped again to change the year). */
  openYears(event: Event) {
    return openYearSelect(this.yearSelect()?.nativeElement, event);
  }

  setYear(value: unknown) {
    const year = Number(value);
    if (!Number.isInteger(year)) {
      return;
    }
    // "All years" in the list.
    if (year === 0) {
      this.clearYear();
      return;
    }
    this.year.set(year);
    this.filter.set('YEAR');
    this.issues.reset();
    this.loadCounts();
  }

  /** Removes the year so the tabs show issues from every year again. */
  clearYear() {
    this.year.set(null);
    if (this.filter() === 'YEAR') {
      this.filter.set('ALL');
    }
    this.issues.reset();
    this.loadCounts();
  }

  yearCancelled() {
    // Closed without a choice: stay on the year already shown, or go back to the previous tab.
    if (this.year() == null) {
      this.filter.set(this.beforeYear);
    }
  }

  search(value: string | null | undefined) {
    this.query.set((value ?? '').trim());
    this.issues.reset();
  }

  refresh(event: Parameters<PagedList<BookIssue>['refresh']>[0]) {
    this.loadCounts();
    this.issues.refresh(event);
  }

  count(filter: Filter): number | null {
    const c = this.counts();
    if (!c) {
      return null;
    }
    switch (filter) {
      case 'OUT': return c.issued + c.overdue;
      case 'OVERDUE': return c.overdue;
      case 'RETURNED': return c.returned;
      default: return c.all;
    }
  }

  async markReturned(issue: BookIssue, sliding?: IonItemSliding) {
    await sliding?.close();
    const ok = await this.ui.confirm('Mark as returned?', `"${issue.bookTitle}" from ${issue.studentName}.`, 'Returned');
    if (!ok) {
      return;
    }
    this.returning.set(issue.id);
    this.api.returnBook(issue.id).subscribe({
      next: updated => {
        this.returning.set(null);
        this.ui.toast('Book marked as returned.');
        // In the "out" lists the item no longer belongs; elsewhere show its new state.
        if (this.filter() === 'OUT' || this.filter() === 'OVERDUE') {
          this.issues.remove(i => i.id === issue.id);
        } else {
          this.issues.replace(i => i.id === issue.id, updated);
        }
        this.loadCounts();
      },
      error: err => {
        this.returning.set(null);
        this.ui.error(err, 'Could not mark the book as returned.');
      }
    });
  }

  private fetch(page: number, size: number): Observable<Page<BookIssue>> {
    const q = this.query();
    if (q) {
      return this.api.issues(page, size, undefined, q);
    }
    // A chosen year narrows every tab to issues made in that year.
    const year = this.year();
    switch (this.filter()) {
      case 'OUT': return this.api.issuesOut(page, size, year);
      case 'OVERDUE': return year ? this.api.issuesInYear(year, page, size, 'OVERDUE') : this.api.issues(page, size, 'OVERDUE');
      case 'RETURNED': return year ? this.api.issuesInYear(year, page, size, 'RETURNED') : this.api.issues(page, size, 'RETURNED');
      case 'YEAR': return year ? this.api.issuesInYear(year, page, size) : this.api.issuesOut(page, size);
      default: return year ? this.api.issuesInYear(year, page, size) : this.api.issues(page, size);
    }
  }

  private loadCounts() {
    this.api.issueCounts(this.year()).subscribe({ next: c => this.counts.set(c), error: () => {} });
  }
}
