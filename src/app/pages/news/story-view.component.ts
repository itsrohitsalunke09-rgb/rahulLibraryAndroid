import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { NewsStory } from '../../core/models';
import { InitialsPipe, ShortDatePipe } from '../../core/pipes';
import { StoryPhotoDirective } from '../../core/story-photo.directive';
import { paragraphs } from './paragraphs';
import { effectiveTemplate, showsPhoto, templateClass } from './templates';

/** The full story — photo, headline, author row and text — laid out by its template. */
@Component({
  selector: 'app-story-view',
  templateUrl: 'story-view.component.html',
  styleUrls: ['story-view.component.scss'],
  imports: [NgTemplateOutlet, InitialsPipe, ShortDatePipe, StoryPhotoDirective],
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
  /** Stories saved before names were recorded have none; sign them from the library. */
  readonly author = computed(() => this.story().createdByName?.trim() || 'Rahul Library');
}
