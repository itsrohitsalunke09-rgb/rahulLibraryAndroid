import { Component, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonBadge, IonButton, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent,
  IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonRefresher,
  IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSkeletonText,
  IonTitle, IonToolbar, ViewWillEnter
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { returnDownBackOutline, swapHorizontalOutline } from 'ionicons/icons';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { dueText, formatDate, statusColor, statusLabel } from '../../core/dates';
import { BookIssue, IssueCounts, Page, isMarathi } from '../../core/models';
import { PagedList } from '../../core/paged-list';
import { UiService } from '../../core/ui.service';

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
    IonButton, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonSkeletonText, IonSelect, IonSelectOption
  ],
})
export class IssuesPage implements ViewWillEnter {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private route = inject(ActivatedRoute);

  readonly filter = signal<Filter>('OUT');
  /** Year for the YEAR filter; null until one is picked. */
  readonly year = signal<number | null>(null);
  readonly years = signal<number[]>([]);
  private readonly yearSelect = viewChild<IonSelect>('yearSelect');
  /** Tab to go back to if the year list is closed without picking a year. */
  private beforeYear: Filter = 'OUT';
  readonly query = signal('');
  readonly counts = signal<IssueCounts | null>(null);
  readonly returning = signal<number | null>(null);
  readonly issues = new PagedList<BookIssue>(page => this.fetch(page), 'Could not load issues.');

  protected readonly dueText = dueText;
  protected readonly formatDate = formatDate;
  protected readonly statusColor = statusColor;
  protected readonly statusLabel = statusLabel;
  protected readonly isMarathi = isMarathi;

  constructor() {
    addIcons({ returnDownBackOutline, swapHorizontalOutline });
    this.loadYears();
    // Dashboard tiles link here with ?status=OUT / OVERDUE.
    this.route.queryParamMap.subscribe(params => {
      const status = params.get('status') as Filter | null;
      if (status && FILTERS.includes(status) && status !== this.filter()) {
        this.filter.set(status);
        this.issues.reset();
      }
    });
  }

  ionViewWillEnter() {
    this.issues.reset();
    this.loadCounts();
    this.loadYears();
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

  /** Opens the year dropdown (also when the Year tab is tapped again to change the year). */
  async openYears() {
    // Fetch the years fresh each time so new issues (or a newly deployed server) show up.
    await this.loadYears();
    // Let the year options render before the dropdown reads them.
    await new Promise(resolve => setTimeout(resolve));
    await this.yearSelect()?.open();
  }

  setYear(value: unknown) {
    const year = Number(value);
    if (!Number.isInteger(year)) {
      return;
    }
    this.year.set(year);
    this.filter.set('YEAR');
    this.issues.reset();
  }

  yearCancelled() {
    // Closed without a choice: stay on the year already shown, or go back to the previous tab.
    if (this.year() == null) {
      this.filter.set(this.beforeYear);
    }
  }

  private loadYears(): Promise<void> {
    return new Promise(resolve => this.api.issueYears().subscribe({
      next: years => { this.years.set(years); resolve(); },
      // Keep the last list we had; offer the current year only if there was none.
      error: () => {
        if (!this.years().length) {
          this.years.set([new Date().getFullYear()]);
        }
        resolve();
      }
    }));
  }

  search(value: string | null | undefined) {
    this.query.set((value ?? '').trim());
    this.issues.reset();
  }

  refresh(event: Parameters<PagedList<BookIssue>['refresh']>[0]) {
    this.loadCounts();
    this.loadYears();
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

  private fetch(page: number): Observable<Page<BookIssue>> {
    const q = this.query();
    if (q) {
      return this.api.issues(page, 20, undefined, q);
    }
    switch (this.filter()) {
      case 'OUT': return this.api.issuesOut(page);
      case 'OVERDUE': return this.api.issues(page, 20, 'OVERDUE');
      case 'RETURNED': return this.api.issues(page, 20, 'RETURNED');
      case 'YEAR': return this.year() != null ? this.api.issuesInYear(this.year()!, page) : this.api.issuesOut(page);
      default: return this.api.issues(page);
    }
  }

  private loadCounts() {
    this.api.issueCounts().subscribe({ next: c => this.counts.set(c), error: () => {} });
  }
}
