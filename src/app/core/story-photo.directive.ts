import { Directive, ElementRef, inject, Input, OnChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService } from './api.service';
import { NewsStory } from './models';

/**
 * Loads a story photo through ApiService so the request carries the sign-in token
 * (a plain <img src> cannot send headers). The `loaded` class marks success; `failed`
 * marks a missing or unloadable photo so CSS can show the placeholder instead.
 */
@Directive({ selector: 'img[appStoryPhoto]' })
export class StoryPhotoDirective implements OnChanges, OnDestroy {
  @Input({ required: true }) appStoryPhoto!: NewsStory;

  private readonly api = inject(ApiService);
  private readonly img = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;
  private request?: Subscription;
  private objectUrl?: string;

  ngOnChanges(): void {
    this.reset();
    const story = this.appStoryPhoto;
    if (!story?.hasPhoto) {
      this.img.classList.add('failed');
      return;
    }
    this.request = this.api.storyPhoto(story.id, story.photoVersion).subscribe({
      next: (blob) => {
        this.objectUrl = URL.createObjectURL(blob);
        this.img.src = this.objectUrl;
        this.img.classList.add('loaded');
      },
      error: () => this.img.classList.add('failed'),
    });
  }

  ngOnDestroy(): void {
    this.reset();
  }

  /** Cancels any in-flight request, frees the old object URL and clears the visual state. */
  private reset(): void {
    this.request?.unsubscribe();
    this.request = undefined;
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = undefined;
    }
    this.img.removeAttribute('src');
    this.img.classList.remove('loaded', 'failed');
  }
}
