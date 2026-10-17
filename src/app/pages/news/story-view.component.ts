import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { NewsStory } from '../../core/models';
import { ShortDatePipe } from '../../core/pipes';
import { StoryPhotoDirective } from '../../core/story-photo.directive';
import { hasDropCap, paragraphs } from './paragraphs';
import { effectiveTemplate, showsPhoto, templateClass } from './templates';

/** The full story — photo, headline, byline and text — laid out by its template, on newsprint. */
@Component({
  selector: 'app-story-view',
  templateUrl: 'story-view.component.html',
  styleUrls: ['story-view.component.scss'],
  imports: [NgTemplateOutlet, ShortDatePipe, StoryPhotoDirective],
})
export class StoryViewComponent {
  readonly story = input.required<NewsStory>();
  /** Object URL of a photo picked in the form; shown instead of loading the saved one. */
  readonly previewPhoto = input<string | null>(null);

  private readonly hasPhoto = computed(() => !!this.previewPhoto() || this.story().hasPhoto);
  readonly template = computed(() => effectiveTemplate(this.story().template, this.hasPhoto()));
  readonly cssClass = computed(() => 'view-' + templateClass(this.template()));
  readonly showsPhoto = computed(() => showsPhoto(this.template(), this.hasPhoto()));
  readonly paragraphs = computed(() => paragraphs(this.story().body));
  /** A centred notice reads oddly with a drop cap, and beside the floated side photo it squeezes the first lines. */
  readonly capAllowed = computed(() => this.template() !== 'NOTICE' && this.template() !== 'SIDE_PHOTO');

  readonly hasDropCap = hasDropCap;
}
