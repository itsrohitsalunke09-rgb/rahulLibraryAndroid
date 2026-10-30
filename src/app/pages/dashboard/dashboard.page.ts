import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonRefresher, IonRefresherContent, IonSelect, IonSelectOption, IonSkeletonText, IonTitle,
  IonToolbar, RefresherCustomEvent, ViewWillEnter
} from '@ionic/angular';
import { Subscription, forkJoin, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { localIsoDate } from '../../core/dates';
import { Freshness } from '../../core/freshness';
import { YearSelectComponent } from '../../core/year-select.component';
import { Dashboard, DayRegister, IssueCounts, MagazineCard, ReaderRequest } from '../../core/models';
import { errorMessage } from '../../core/ui.service';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';

interface Tile {
  label: string;
  value: number;
  /** Icon file from the Figma design (assets/icons). */
  symbol: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'medium';
  /** attention = the two big numbers; more = the list underneath. */
  group: 'attention' | 'more';
  link?: string;
  query?: Record<string, string>;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonRefresher, IonRefresherContent, IonSkeletonText,
    PageSkeletonComponent, YearSelectComponent],
})
export class DashboardPage implements ViewWillEnter {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly stats = signal<Dashboard | null>(null);
  private readonly tiles = computed(() => {
    const s = this.stats();
    return s ? toTiles(s) : [];
  });
  readonly attention = computed(() => this.tiles().filter(t => t.group === 'attention'));
  readonly more = computed(() => this.tiles().filter(t => t.group === 'more'));
  /** Issue transactions for the chosen year (all years when none), for the blue card. */
  readonly counts = signal<IssueCounts | null>(null);
  /** Share of those transactions already returned, for the card's bar. */
  readonly returnedPercent = computed(() => {
    const c = this.counts();
    return c && c.all ? Math.round((c.returned / c.all) * 100) : 0;
  });
  readonly error = signal('');
  /** Newspapers received today and magazines that came this month; null until loaded. */
  readonly papers = signal<PaperSummary | null>(null);
  readonly papersError = signal('');
  /** Students' book requests and suggestions, newest first; null until loaded. */
  readonly wishes = signal<ReaderRequest[] | null>(null);
  readonly wishesError = signal('');
  /** Still open: ones marked done stay on the list but no longer count. */
  readonly requestCount = computed(() => (this.wishes() ?? []).filter(w => w.kind === 'REQUEST' && !w.doneAt).length);
  readonly suggestionCount = computed(() => (this.wishes() ?? []).filter(w => w.kind === 'SUGGESTION' && !w.doneAt).length);
  /** Year for the issue numbers; starts on the current year, null = all years. */
  readonly year = signal<number | null>(new Date().getFullYear());
  private request?: Subscription;
  private papersRequest?: Subscription;
  private wishesRequest?: Subscription;
  private freshness = new Freshness();

  ionViewWillEnter() {
    if (this.freshness.isStale()) {
      this.load();
    }
  }

  refresh(event: RefresherCustomEvent) {
    this.load(() => event.target.complete());
  }

  setYear(value: unknown) {
    const year = Number(value) || null;
    if (year === this.year()) {
      return;
    }
    this.year.set(year);
    this.load();
  }

  /** Issues on its Year tab, for the year chosen here (no year chosen = the year Issues already shows). */
  openTransactions() {
    const year = this.year();
    this.router.navigate(['/tabs/dashboard/issues'], { queryParams: year ? { status: 'YEAR', year } : { status: 'YEAR' } });
  }

  go(link: string) {
    this.router.navigate([link]);
  }

  open(tile: Tile) {
    if (tile.link) {
      // "Out with students" opens Issues for the year chosen here; Overdue always covers every year.
      const year = this.year();
      const queryParams = tile.query?.['status'] === 'OUT' && year ? { ...tile.query, year } : tile.query;
      this.router.navigate([tile.link], { queryParams });
    }
  }

  private load(done?: () => void) {
    // Drop an older request so a quick year change never shows stale numbers.
    this.request?.unsubscribe();
    this.freshness.mark();
    const year = this.year();
    this.request = forkJoin([
      this.api.dashboard(year),
      this.api.issueCounts(year),
      // Overdue copies need chasing whenever they were issued, so that number ignores the year.
      year ? this.api.issueCounts(null) : of(null),
    ]).subscribe({
      next: ([stats, yearCounts, allCounts]) => {
        this.error.set('');
        this.stats.set(allCounts ? { ...stats, overdueCopies: allCounts.overdue } : stats);
        this.counts.set(yearCounts);
        done?.();
      },
      error: err => {
        this.freshness.invalidate();
        this.error.set(errorMessage(err, 'Could not load the dashboard.'));
        done?.();
      }
    });
    this.loadPapers();
    this.loadWishes();
  }

  /** Separate too: the requests card shows its own error. */
  private loadWishes() {
    this.wishesRequest?.unsubscribe();
    this.wishesRequest = this.api.readerRequests().subscribe({
      next: list => {
        this.wishesError.set('');
        this.wishes.set(list);
      },
      error: err => this.wishesError.set(errorMessage(err, 'Could not load requests and suggestions.')),
    });
  }

  /** Separate from the book numbers, so a newspaper error never hides the rest of the dashboard. */
  private loadPapers() {
    this.papersRequest?.unsubscribe();
    const today = localIsoDate();
    this.papersRequest = forkJoin([this.api.periodicalRegister(today), this.api.magazines()]).subscribe({
      next: ([day, magazines]) => {
        this.papersError.set('');
        this.papers.set(paperSummary(day, magazines, today));
      },
      error: err => this.papersError.set(errorMessage(err, 'Could not load the newspaper register.')),
    });
  }
}

export interface PaperSummary {
  /** Subscribed dailies, and how many are ticked as received today. */
  newspapers: { received: number; total: number };
  /** Subscribed weeklies, fortnightlies and monthlies, and how many came at least once this month. */
  magazines: { received: number; total: number };
}

/**
 * Today's register lists the daily papers; the magazine register says which magazines have an issue
 * covering this month (a combined issue counts for every month it covers).
 */
export function paperSummary(day: DayRegister, magazines: MagazineCard[], today: string): PaperSummary {
  const monthStart = today.slice(0, 8) + '01';
  const monthEnd = today.slice(0, 8) + '31';
  const coversThisMonth = (m: MagazineCard) => m.receipts.some(r => r.periodFrom <= monthEnd && r.periodTo >= monthStart);
  return {
    newspapers: { received: day.rows.filter(r => r.arrived).length, total: day.rows.length },
    magazines: { received: magazines.filter(coversThisMonth).length, total: magazines.length },
  };
}

function toTiles(s: Dashboard): Tile[] {
  return [
    { label: 'Overdue', value: s.overdueCopies, symbol: 'assets/icons/overdue.svg', tone: 'danger', group: 'attention', link: '/tabs/dashboard/issues', query: { status: 'OVERDUE' } },
    { label: 'Out with students', value: s.issuedCopies, symbol: 'assets/icons/exchange.svg', tone: 'warning', group: 'attention', link: '/tabs/dashboard/issues', query: { status: 'OUT' } },
    { label: 'Book titles', value: s.totalBooks, symbol: 'assets/icons/book.svg', tone: 'primary', group: 'more', link: '/tabs/catalog' },
    { label: 'Students', value: s.students, symbol: 'assets/icons/users.svg', tone: 'primary', group: 'more', link: '/tabs/config/members' },
  ];
}

