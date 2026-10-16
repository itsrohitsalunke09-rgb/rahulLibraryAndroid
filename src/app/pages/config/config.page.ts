import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar, ViewWillEnter } from '@ionic/angular';
import { ApiService } from '../../core/api.service';
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

  private api = inject(ApiService);
  /** Number of news stories; null until loaded, so the count stays hidden. */
  protected storyCount = signal<number | null>(null);

  ionViewWillEnter() {
    this.categories.revisit();
    this.api.news(0, 1).subscribe({ next: page => this.storyCount.set(page.totalElements), error: () => undefined });
  }
}
