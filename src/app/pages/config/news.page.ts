import { Component, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonRefresher,
  IonRefresherContent, IonSearchbar, IonSkeletonText, IonTitle, IonToolbar, ModalController, ViewWillEnter
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { NewsStory } from '../../core/models';
import { PagedList } from '../../core/paged-list';
import { ShortDatePipe } from '../../core/pipes';
import { StoryPhotoDirective } from '../../core/story-photo.directive';
import { NewsFormModal } from './news-form.modal';

/** News & events master: list, search, add, edit and delete stories. */
@Component({
  selector: 'app-news',
  templateUrl: 'news.page.html',
  styleUrls: ['news.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonSearchbar, IonContent, IonRefresher,
    IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, IonList, IonItem, IonLabel, IonSkeletonText, ShortDatePipe, StoryPhotoDirective
  ],
})
export class NewsPage implements ViewWillEnter {
  private modals = inject(ModalController);
  private api = inject(ApiService);

  readonly stories = new PagedList<NewsStory>((page, size) => this.api.news(page, size), 'Could not load the stories.');
  readonly query = signal('');
  readonly shown = computed(() => {
    const q = this.query().toLowerCase();
    return this.stories.items().filter(s => !q || s.headline.toLowerCase().includes(q));
  });

  ionViewWillEnter() {
    this.stories.revisit();
  }

  search(value: string | null | undefined) {
    this.query.set((value ?? '').trim());
  }

  async edit(story?: NewsStory) {
    const modal = await this.modals.create({ component: NewsFormModal, componentProps: { story } });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'saved' || role === 'deleted') {
      this.stories.reset();
    }
  }
}
