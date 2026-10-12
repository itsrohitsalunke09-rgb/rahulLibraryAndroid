import { Component, inject } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bookmarks, gridOutline, libraryOutline, peopleOutline, personCircleOutline, swapHorizontalOutline } from 'ionicons/icons';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  protected auth = inject(AuthService);

  constructor() {
    addIcons({ gridOutline, libraryOutline, swapHorizontalOutline, peopleOutline, bookmarks, personCircleOutline });
  }
}
