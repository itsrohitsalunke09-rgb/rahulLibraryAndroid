import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonIcon, IonRefresher, IonRefresherContent, IonSkeletonText, IonText,
  IonTitle, IonToolbar, RefresherCustomEvent, ViewWillEnter
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline, bookOutline, checkmarkCircleOutline, chevronForward, copyOutline,
  peopleOutline, personOutline, swapHorizontalOutline
} from 'ionicons/icons';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Dashboard } from '../../core/models';
import { errorMessage } from '../../core/ui.service';

interface Tile {
  label: string;
  value: number;
  icon: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'medium';
  link?: string;
  query?: Record<string, string>;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonRefresher, IonRefresherContent, IonIcon, IonSkeletonText, IonText],
})
export class DashboardPage implements ViewWillEnter {
  private api = inject(ApiService);
  private router = inject(Router);
  protected auth = inject(AuthService);

  readonly tiles = signal<Tile[] | null>(null);
  readonly error = signal('');

  constructor() {
    addIcons({
      bookOutline, copyOutline, checkmarkCircleOutline, swapHorizontalOutline, alertCircleOutline,
      peopleOutline, personOutline, chevronForward
    });
  }

  ionViewWillEnter() {
    this.load();
  }

  refresh(event: RefresherCustomEvent) {
    this.load(() => event.target.complete());
  }

  open(tile: Tile) {
    if (tile.link) {
      this.router.navigate([tile.link], { queryParams: tile.query });
    }
  }

  private load(done?: () => void) {
    this.api.dashboard().subscribe({
      next: stats => {
        this.error.set('');
        this.tiles.set(toTiles(stats));
        done?.();
      },
      error: err => {
        this.error.set(errorMessage(err, 'Could not load the dashboard.'));
        done?.();
      }
    });
  }
}

function toTiles(s: Dashboard): Tile[] {
  return [
    { label: 'Book titles', value: s.totalBooks, icon: 'book-outline', tone: 'primary', link: '/tabs/catalog' },
    { label: 'Total copies', value: s.totalCopies, icon: 'copy-outline', tone: 'medium', link: '/tabs/catalog' },
    { label: 'Available', value: s.availableCopies, icon: 'checkmark-circle-outline', tone: 'success', link: '/tabs/catalog' },
    { label: 'Issued', value: s.issuedCopies, icon: 'swap-horizontal-outline', tone: 'warning', link: '/tabs/issues', query: { status: 'OUT' } },
    { label: 'Overdue', value: s.overdueCopies, icon: 'alert-circle-outline', tone: 'danger', link: '/tabs/issues', query: { status: 'OVERDUE' } },
    { label: 'Students', value: s.students, icon: 'people-outline', tone: 'primary', link: '/tabs/people', query: { role: 'STUDENT' } },
    { label: 'Librarians', value: s.librarians, icon: 'person-outline', tone: 'medium', link: '/tabs/people', query: { role: 'LIBRARIAN' } },
  ];
}
