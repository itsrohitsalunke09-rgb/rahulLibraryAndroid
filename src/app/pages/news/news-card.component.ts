import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { NewsStory } from '../../core/models';
import { ShortDatePipe } from '../../core/pipes';
import { StoryPhotoDirective } from '../../core/story-photo.directive';
import { paragraphs } from './paragraphs';
import { effectiveTemplate, showsPhoto, templateClass } from './templates';

/**
 * One story as a card in the News tab, laid out by its template. Purely presentational:
 * the parent wraps it to open the full story.
 */
@Component({
  selector: 'app-news-card',
  templateUrl: 'news-card.component.html',
  styleUrls: ['news-card.component.scss'],
  imports: [NgTemplateOutlet, ShortDatePipe, StoryPhotoDirective],
})
export class NewsCardComponent {
  readonly story = input.required<NewsStory>();
  /** Object URL of a photo picked in the form; shown instead of loading the saved one. */
  readonly previewPhoto = input<string | null>(null);

  private readonly hasPhoto = computed(() => !!this.previewPhoto() || this.story().hasPhoto);
  readonly template = computed(() => effectiveTemplate(this.story().template, this.hasPhoto()));
  readonly cssClass = computed(() => 'card-' + templateClass(this.template()));
  readonly showsPhoto = computed(() => showsPhoto(this.template(), this.hasPhoto()));
  /** The whole text run together; the card clamps it to a few lines. */
  readonly excerpt = computed(() => paragraphs(this.story().body).join(' '));
}
