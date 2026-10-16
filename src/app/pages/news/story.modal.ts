import { Component, Input, computed, inject, signal } from '@angular/core';
import { IonContent, ModalController } from '@ionic/angular';
import { NewsStory } from '../../core/models';
import { ShortDatePipe } from '../../core/pipes';
import { StoryPhotoDirective } from '../../core/story-photo.directive';
import { hasDropCap, paragraphs } from './paragraphs';

/** One story in full, set like a newspaper article page. */
@Component({
  selector: 'app-story',
  templateUrl: 'story.modal.html',
  styleUrls: ['story.modal.scss'],
  imports: [IonContent, ShortDatePipe, StoryPhotoDirective],
})
export class StoryModal {
  private modals = inject(ModalController);
  private readonly current = signal<NewsStory | undefined>(undefined);

  @Input({ required: true }) set story(story: NewsStory) {
    this.current.set(story);
  }
  get story(): NewsStory {
    return this.current()!;
  }

  readonly paragraphs = computed(() => paragraphs(this.current()?.body ?? ''));

  readonly hasDropCap = hasDropCap;

  close() {
    this.modals.dismiss();
  }
}
