import { Component, inject, signal } from '@angular/core';
import {
  IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher, IonRefresherContent, ModalController, RefresherCustomEvent,
  ViewWillEnter
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { NewsStory } from '../../core/models';
import { PagedList } from '../../core/paged-list';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { NewsCardComponent } from './news-card.component';
import { StoryModal } from './story.modal';

/** The News tab: a slim library header over a list of story cards; a tap opens the full story. */
@Component({
  selector: 'app-newspaper',
  templateUrl: 'news.page.html',
  styleUrls: ['news.page.scss'],
  imports: [IonContent, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, NewsCardComponent, PageSkeletonComponent],
})
export class NewspaperPage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);
  readonly stories = new PagedList<NewsStory>((page, size) => this.api.news(page, size), 'Could not load the news.');

  /** Pull-down, or a double tap on the Programs & events tab. */
  refresh(event: RefresherCustomEvent) {
    this.stories.refresh(event);
  }

  ionViewWillEnter() {
    this.stories.revisit();
  }

  /** True while a story modal is being created and presented, so a double tap opens only one. */
  readonly opening = signal(false);

  async open(story: NewsStory) {
    if (this.opening()) {
      return;
    }
    this.opening.set(true);
    try {
      const modal = await this.modals.create({ component: StoryModal, componentProps: { story } });
      await modal.present();
    } finally {
      this.opening.set(false);
    }
  }
}
