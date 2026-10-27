import { Component, Input, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonToolbar, ModalController } from '@ionic/angular';
import { NewsStory } from '../../core/models';
import { StoryViewComponent } from './story-view.component';

/** One story in full, in its template layout. */
@Component({
  selector: 'app-story',
  templateUrl: 'story.modal.html',
  styleUrls: ['story.modal.scss'],
  imports: [IonHeader, IonToolbar, IonContent, StoryViewComponent],
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

  /** Object URL of a photo picked in the form, shown instead of the saved one. */
  @Input() previewPhoto: string | null = null;

  close() {
    this.modals.dismiss();
  }
}
