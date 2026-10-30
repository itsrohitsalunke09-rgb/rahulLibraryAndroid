import { Component, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { IonIcon, IonLabel, IonSpinner, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bookmarksOutline, planetOutline } from 'ionicons/icons';
import { AuthService } from '../core/auth.service';
import { GalaxyReadersStore } from '../core/galaxy-readers.store';
import { PermissionsStore } from '../core/permissions.store';

const FULL_SCREEN = ['/tabs/dashboard/reports/galaxy', '/tabs/my-books/galaxy'];

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonSpinner],
})
export class TabsPage {
  protected auth = inject(AuthService);
  private router = inject(Router);
  private tabs = viewChild.required(IonTabs);

  /** Pages that take the whole screen, without the tab bar. */
  readonly fullScreen = toSignal(this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    startWith(null),
    map(() => FULL_SCREEN.some(path => this.router.url.split('?')[0] === path)),
  ), { initialValue: false });

  constructor() {
    addIcons({ bookmarksOutline, planetOutline });
    // What this role may do, brought up to date each time the app starts.
    inject(PermissionsStore).refresh();
    // The Reading Galaxy's saved readers are brought up to date each time the app starts.
    if (this.auth.isStaff()) {
      inject(GalaxyReadersStore).refresh();
    }
  }

  /**
   * A tab button always opens that tab's main screen. Ionic would reopen the page last left open
   * in the tab; selecting the (now current) tab a second time takes it back to its main screen.
   */
  async openTab(event: Event) {
    event.stopPropagation();
    const tab = (event as CustomEvent<{ tab: string }>).detail.tab;
    const now = Date.now();
    const doubleTap = tab === this.lastTap.tab && now - this.lastTap.at < DOUBLE_TAP_MS;
    this.lastTap = doubleTap ? { tab: '', at: 0 } : { tab, at: now };
    await this.tabs().select(tab);
    if (this.router.url.split('?')[0] !== `/tabs/${tab}`) {
      await this.tabs().select(tab);
    }
    if (doubleTap) {
      this.refreshShown();
    }
  }

  private lastTap = { tab: '', at: 0 };
  /** Double tap: a pull-down style spinner just under the page's header, `top` px from the screen top. */
  readonly refreshing = signal<{ top: number } | null>(null);

  /** Double tap on a tab: back to the top and reload, as a pull-down does (screens without data just scroll). */
  private refreshShown() {
    // The page on screen in the tab outlet (other tabs' pages stay in the DOM, hidden).
    const pages = document.querySelectorAll<HTMLElement>('ion-tabs ion-router-outlet > .ion-page:not(.ion-page-hidden)');
    const content = pages[pages.length - 1]?.querySelector<HTMLIonContentElement>('ion-content');
    void content?.scrollToTop(300);
    let page: { refresh?: (event: { target: { complete(): void } }) => void } | undefined;
    try {
      page = this.tabs().outlet?.component as typeof page;
    } catch {
      // Outlet not activated yet: nothing to reload.
    }
    if (typeof page?.refresh !== 'function') {
      return;
    }
    const shownAt = Date.now();
    this.refreshing.set({ top: content?.getBoundingClientRect().top ?? 56 });
    // Stays at least a moment, so it reads as a refresh even when the data comes back at once.
    const hide = () => setTimeout(() => this.refreshing.set(null), Math.max(0, MIN_SPIN_MS - (Date.now() - shownAt)));
    page.refresh({ target: { complete: hide } });
    // A page that never reports back still loses the spinner.
    setTimeout(() => this.refreshing.set(null), 10_000);
  }
}

/** Shortest time the double-tap refresh spinner shows. */
const MIN_SPIN_MS = 700;

/** Two taps on the same tab within this time count as a double tap. */
const DOUBLE_TAP_MS = 350;
