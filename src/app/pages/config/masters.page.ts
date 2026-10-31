import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { CategoriesStore } from '../../core/categories.store';
import { StretchDirective } from '../../core/stretch.directive';

/** The masters (admin only), opened from the Profile page's ⋮ button, as the Registers screen's cards. */
@Component({
  selector: 'app-masters',
  templateUrl: 'masters.page.html',
  styleUrls: ['../reports/reports.page.scss', 'masters.page.scss'],
  imports: [RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, StretchDirective],
})
export class MastersPage implements ViewWillEnter {
  protected categories = inject(CategoriesStore);

  private api = inject(ApiService);
  /** Counts on the right of each master; null until loaded, so the count stays hidden. */
  protected storyCount = signal<number | null>(null);
  protected periodicalCount = signal<number | null>(null);
  protected clippingCount = signal<number | null>(null);

  /** One soft card per master, each its own colour (the Registers screen's tones). */
  readonly cards = computed(() => [
    { title: 'Book categories', sub: 'Category number and name, used by the book form\'s Category dropdown',
      link: '/tabs/profile/masters/categories', tone: 'daily', icon: 'tag',
      count: this.categories.loaded() ? this.categories.items().length : null, marathi: false },
    { title: 'Happenings', sub: 'Event stories shown in the Happenings tab',
      link: '/tabs/profile/masters/news', tone: 'weekly', icon: 'sheet', count: this.storyCount(), marathi: false },
    { title: 'Newspapers & magazines', sub: 'Subscriptions and price per copy, used by the registers',
      link: '/tabs/profile/masters/periodicals', tone: 'monthly', icon: 'copies', count: this.periodicalCount(), marathi: false },
    { title: 'कात्रणे', sub: 'Newspaper clipping files: title and years, shown in Catalog',
      link: '/tabs/profile/masters/clippings', tone: 'catalog', icon: 'copies', count: this.clippingCount(), marathi: true },
    { title: 'Office assets', sub: 'What the office owns: how many, where, and their condition',
      link: '/tabs/profile/masters/assets', tone: 'members', icon: 'tag', count: null, marathi: false },
    { title: 'Roles & permissions', sub: 'What librarians and students may do in the app',
      link: '/tabs/profile/masters/permissions', tone: 'books', icon: 'field-shield', count: null, marathi: false },
    { title: 'About us page', sub: 'Library history, collection, activities and contact, shown from the login screen',
      link: '/tabs/profile/masters/about', tone: 'daily', icon: 'book', count: null, marathi: false },
  ]);

  ionViewWillEnter() {
    this.categories.revisit();
    this.api.news(0, 1).subscribe({ next: page => this.storyCount.set(page.totalElements), error: () => undefined });
    this.api.periodicals().subscribe({ next: list => this.periodicalCount.set(list.length), error: () => undefined });
    this.api.clippings().subscribe({ next: list => this.clippingCount.set(list.length), error: () => undefined });
  }
}
