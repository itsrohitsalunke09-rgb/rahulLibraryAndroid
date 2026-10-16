import { Component, computed, inject } from '@angular/core';
import {
  IonContent, IonInfiniteScroll, IonInfiniteScrollContent, IonRefresher, IonRefresherContent, ModalController, ViewWillEnter
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { NewsStory } from '../../core/models';
import { PagedList } from '../../core/paged-list';
import { ShortDatePipe } from '../../core/pipes';
import { StoryPhotoDirective } from '../../core/story-photo.directive';
import { paragraphs } from './paragraphs';
import { StoryModal } from './story.modal';

/** The News tab: the library's stories laid out as a printed front page. */
@Component({
  selector: 'app-newspaper',
  templateUrl: 'news.page.html',
  styleUrls: ['news.page.scss'],
  imports: [IonContent, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, ShortDatePipe, StoryPhotoDirective],
})
export class NewspaperPage implements ViewWillEnter {
  private api = inject(ApiService);
  private modals = inject(ModalController);

  readonly stories = new PagedList<NewsStory>((page, size) => this.api.news(page, size), 'Could not load the news.');
  /** The newest story leads the page; the rest follow below it. */
  readonly lead = computed(() => this.stories.items()[0]);
  readonly others = computed(() => this.stories.items().slice(1));
  /** Today's date for the dateline, e.g. "Saturday, 17 October 2026". */
  readonly today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  ionViewWillEnter() {
    this.stories.revisit();
  }

  /** The opening paragraph, shown on the front page before "Continue reading". */
  firstParagraph(story: NewsStory): string {
    return paragraphs(story.body)[0] ?? '';
  }

  async open(story: NewsStory) {
    const modal = await this.modals.create({ component: StoryModal, componentProps: { story } });
    await modal.present();
  }
}
