import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonRefresher, IonRefresherContent, IonSelect, IonSelectOption, IonSkeletonText, IonTitle,
  IonToolbar, RefresherCustomEvent, ViewWillEnter
} from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Freshness } from '../../core/freshness';
import { Dashboard } from '../../core/models';
import { errorMessage } from '../../core/ui.service';

interface Tile {
  label: string;
  value: number;
  /** Icon file from the Figma design (assets/icons). */
  symbol: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'medium';
  /** attention = the two big numbers; shelf = the stock bar; more = the list underneath. */
  group: 'attention' | 'shelf' | 'more';
  link?: string;
  query?: Record<string, string>;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonRefresher, IonRefresherContent, IonSkeletonText, IonSelect,
    IonSelectOption
  ],
})
export class DashboardPage implements ViewWillEnter {
  private api = inject(ApiService);
  private router = inject(Router);
  protected auth = inject(AuthService);

  readonly stats = signal<Dashboard | null>(null);
  private readonly tiles = computed(() => {
    const s = this.stats();
    return s ? toTiles(s) : [];
  });
  readonly attention = computed(() => this.tiles().filter(t => t.group === 'attention'));
  readonly shelf = computed(() => this.tiles().find(t => t.group === 'shelf'));
  readonly more = computed(() => this.tiles().filter(t => t.group === 'more'));
  /** Share of copies on the shelf, for the stock bar. */
  readonly shelfPercent = computed(() => {
    const s = this.stats();
    return s && s.totalCopies ? Math.round((s.availableCopies / s.totalCopies) * 100) : 0;
  });
  readonly today = signal(todayText());
  readonly error = signal('');
  /** Year for the issue numbers; null = all years. */
  readonly year = signal<number | null>(null);
  readonly years = signal<number[]>([]);
  private readonly yearSelect = viewChild<IonSelect>('yearSelect');
  private request?: Subscription;
  private freshness = new Freshness();

  ionViewWillEnter() {
    // Tab pages stay alive in the background, so refresh the date on every visit.
    this.today.set(todayText());
    if (this.freshness.isStale()) {
      this.load();
    }
  }

  refresh(event: RefresherCustomEvent) {
    this.load(() => event.target.complete());
  }

  /** Opens the year list, fetched fresh so it matches the issues on the server. */
  async openYears() {
    await this.loadYears();
    // Let the year options render before the dropdown reads them.
    await new Promise(resolve => setTimeout(resolve));
    await this.yearSelect()?.open();
  }

  setYear(value: unknown) {
    const year = Number(value) || null;
    if (year === this.year()) {
      return;
    }
    this.year.set(year);
    this.load();
  }

  private loadYears(): Promise<void> {
    return new Promise(resolve => this.api.issueYears().subscribe({
      next: years => { this.years.set(years); resolve(); },
      error: () => {
        if (!this.years().length) {
          this.years.set([new Date().getFullYear()]);
        }
        resolve();
      }
    }));
  }

  open(tile: Tile) {
    if (tile.link) {
      // Issue tiles open Issues for the year chosen here (no year = all years).
      const year = this.year();
      const queryParams = tile.query?.['status'] && year ? { ...tile.query, year } : tile.query;
      this.router.navigate([tile.link], { queryParams });
    }
  }

  private load(done?: () => void) {
    // Drop an older request so a quick year change never shows stale numbers.
    this.request?.unsubscribe();
    this.freshness.mark();
    this.request = this.api.dashboard(this.year()).subscribe({
      next: stats => {
        this.error.set('');
        this.stats.set(stats);
        done?.();
      },
      error: err => {
        this.freshness.invalidate();
        this.error.set(errorMessage(err, 'Could not load the dashboard.'));
        done?.();
      }
    });
  }
}

function toTiles(s: Dashboard): Tile[] {
  return [
    { label: 'Overdue', value: s.overdueCopies, symbol: 'assets/icons/overdue.svg', tone: 'danger', group: 'attention', link: '/tabs/issues', query: { status: 'OVERDUE' } },
    { label: 'Out with students', value: s.issuedCopies, symbol: 'assets/icons/exchange.svg', tone: 'warning', group: 'attention', link: '/tabs/issues', query: { status: 'OUT' } },
    { label: 'On the shelf', value: s.availableCopies, symbol: 'assets/icons/book.svg', tone: 'success', group: 'shelf', link: '/tabs/catalog' },
    { label: 'Book titles', value: s.totalBooks, symbol: 'assets/icons/book.svg', tone: 'primary', group: 'more', link: '/tabs/catalog' },
    { label: 'Total copies', value: s.totalCopies, symbol: 'assets/icons/copies.svg', tone: 'medium', group: 'more', link: '/tabs/catalog' },
    { label: 'Students', value: s.students, symbol: 'assets/icons/users.svg', tone: 'primary', group: 'more', link: '/tabs/people', query: { role: 'STUDENT' } },
    { label: 'Librarians', value: s.librarians, symbol: 'assets/icons/user.svg', tone: 'medium', group: 'more', link: '/tabs/people', query: { role: 'LIBRARIAN' } },
  ];
}

function todayText(): string {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}
