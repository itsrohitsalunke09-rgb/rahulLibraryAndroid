import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar, ViewWillEnter,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { CategoriesStore } from '../../core/categories.store';

/** The masters (admin only), opened from the Profile page's ⋮ button. */
@Component({
  selector: 'app-masters',
  templateUrl: 'masters.page.html',
  styleUrls: ['config.page.scss'],
  imports: [RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonList, IonItem, IonLabel],
})
export class MastersPage implements ViewWillEnter {
  protected categories = inject(CategoriesStore);

  private api = inject(ApiService);
  /** Number of news stories; null until loaded, so the count stays hidden. */
  protected storyCount = signal<number | null>(null);

  ionViewWillEnter() {
    this.categories.revisit();
    this.api.news(0, 1).subscribe({ next: page => this.storyCount.set(page.totalElements), error: () => undefined });
  }
}
