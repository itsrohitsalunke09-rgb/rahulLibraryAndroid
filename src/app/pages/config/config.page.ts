import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { CategoriesStore } from '../../core/categories.store';

/** Configuration tab (admin and librarian): the app's masters. Book categories is the first. */
@Component({
  selector: 'app-config',
  templateUrl: 'config.page.html',
  styleUrls: ['config.page.scss'],
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel],
})
export class ConfigPage implements ViewWillEnter {
  protected categories = inject(CategoriesStore);

  ionViewWillEnter() {
    this.categories.revisit();
  }
}
