import { Component, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bookmarksOutline } from 'ionicons/icons';
import { AuthService } from '../core/auth.service';

const FULL_SCREEN = ['/tabs/dashboard/reports/galaxy'];

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
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
    addIcons({ bookmarksOutline });
  }

  /**
   * A tab button always opens that tab's main screen. Ionic would reopen the page last left open
   * in the tab; selecting the (now current) tab a second time takes it back to its main screen.
   */
  async openTab(event: Event) {
    event.stopPropagation();
    const tab = (event as CustomEvent<{ tab: string }>).detail.tab;
    await this.tabs().select(tab);
    if (this.router.url.split('?')[0] !== `/tabs/${tab}`) {
      await this.tabs().select(tab);
    }
  }
}
