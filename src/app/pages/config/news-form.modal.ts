import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar, ModalController
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { PHOTO_DECODE_ERROR, resizePhoto } from '../../core/image-resize';
import { NewsStory, NewsStoryRequest, NewsTemplate } from '../../core/models';
import { StoryPhotoDirective } from '../../core/story-photo.directive';
import { UiService, errorMessage } from '../../core/ui.service';
import { NewsCardComponent } from '../news/news-card.component';
import { StoryModal } from '../news/story.modal';
import { NEWS_TEMPLATES, templateClass } from '../news/templates';

/** Arrow keys that move the template choice, and which way. */
const ARROW_STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Today as YYYY-MM-DD in the device's time zone. */
function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Add or edit one news story with an optional photo; editing also offers Delete.
 * A template picker on top shows a live card preview, and the full story on request.
 */
@Component({
  selector: 'app-news-form',
  templateUrl: 'news-form.modal.html',
  styleUrls: ['news-form.modal.scss'],
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonSpinner, StoryPhotoDirective,
    NewsCardComponent
  ],
})
export class NewsFormModal implements OnInit, OnDestroy {
  /** Story to edit; leave empty to add a new one. */
  @Input() story?: NewsStory;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);

  form: NewsStoryRequest = { headline: '', body: '', eventDate: today(), photoCaption: '', removePhoto: false,
    template: 'CLASSIC' };
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');
  /** The full-story preview is opening. */
  readonly previewing = signal(false);
  /** Object URL of the newly chosen photo, for the preview. */
  readonly previewUrl = signal('');
  /** The existing photo is still kept (editing, not removed, nothing chosen to replace it). */
  readonly keepsExisting = signal(false);
  readonly hasPhoto = computed(() => !!this.previewUrl() || this.keepsExisting());

  readonly templates = NEWS_TEMPLATES;
  readonly templateClass = templateClass;
  /**
   * Bumped whenever a field changes. `form` is a plain object for ngModel, so this is what lets
   * the computed previews below rebuild only when the staff member actually edits something.
   */
  private readonly edits = signal(0);
  readonly template = computed(() => {
    this.edits();
    return this.form.template;
  });
  /** The story as it would be saved, with placeholders for empty fields, for the previews. */
  readonly draft = computed<NewsStory>(() => {
    this.edits();
    const f = this.form;
    const hasPhoto = this.hasPhoto();
    return {
      id: this.story?.id ?? 0,
      headline: f.headline.trim() || 'Your headline',
      body: f.body.trim() || 'The story text…',
      eventDate: f.eventDate || today(),
      photoCaption: hasPhoto ? (f.photoCaption ?? '').trim() || null : null,
      hasPhoto,
      photoVersion: this.story?.photoVersion ?? 0,
      template: f.template,
      createdByName: this.story?.createdByName ?? '',
      createdAt: this.story?.createdAt ?? '',
      updatedAt: this.story?.updatedAt ?? '',
    };
  });
  /** The newly chosen photo; null lets the previews load the saved one themselves. */
  readonly previewPhoto = computed(() => this.previewUrl() || null);

  /** The shrunk photo to upload, if one was chosen. */
  private photo: Blob | null = null;

  ngOnInit() {
    if (this.story) {
      this.form = {
        headline: this.story.headline,
        body: this.story.body,
        eventDate: this.story.eventDate,
        photoCaption: this.story.photoCaption ?? '',
        removePhoto: false,
        template: this.story.template ?? 'CLASSIC',
      };
      this.keepsExisting.set(this.story.hasPhoto);
    }
    this.changed();
  }

  ngOnDestroy() {
    this.revokePreview();
  }

  cancel() {
    this.modals.dismiss(null, 'cancel');
  }

  /** A form field changed; refresh the previews. */
  changed() {
    this.edits.update(n => n + 1);
  }

  chooseTemplate(template: NewsTemplate) {
    this.form.template = template;
    this.changed();
  }

  /** Radio-group arrow keys: move the choice to the next or previous tile and focus it. */
  onTileKey(event: KeyboardEvent, index: number) {
    const step = ARROW_STEPS[event.key];
    if (!step) {
      return;
    }
    event.preventDefault();
    const next = (index + step + this.templates.length) % this.templates.length;
    this.chooseTemplate(this.templates[next].value);
    const tiles = (event.currentTarget as HTMLElement).parentElement?.children;
    (tiles?.[next] as HTMLElement | undefined)?.focus();
  }

  /** Opens the story full-screen as readers will see it, before saving. */
  async previewFull() {
    // One preview at a time: a double tap must not stack two modals. Cleared once the preview is
    // presented; from then on it covers the button, so the form cannot be tapped again until it closes.
    if (this.previewing()) {
      return;
    }
    this.previewing.set(true);
    try {
      const modal = await this.modals.create({
        component: StoryModal,
        componentProps: { story: this.draft(), previewPhoto: this.previewPhoto() },
      });
      await modal.present();
    } finally {
      this.previewing.set(false);
    }
  }

  async choosePhoto(file: File) {
    this.error.set('');
    try {
      const shrunk = await resizePhoto(file);
      this.revokePreview();
      this.photo = shrunk;
      this.previewUrl.set(URL.createObjectURL(shrunk));
      this.keepsExisting.set(false);
      this.form.removePhoto = false;
    } catch (err) {
      this.error.set(err instanceof Error && err.message ? err.message : PHOTO_DECODE_ERROR);
    }
  }

  async onFilePicked(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      await this.choosePhoto(file);
    }
  }

  removePhoto() {
    this.revokePreview();
    this.photo = null;
    this.keepsExisting.set(false);
    this.form.removePhoto = !!this.story?.hasPhoto;
  }

  save() {
    if (this.saving() || this.deleting()) {
      return;
    }
    const request: NewsStoryRequest = {
      headline: this.form.headline.trim(),
      body: this.form.body.trim(),
      eventDate: this.form.eventDate,
      photoCaption: this.hasPhoto() ? (this.form.photoCaption ?? '').trim() || null : null,
      removePhoto: this.form.removePhoto,
      template: this.form.template,
    };
    if (!request.headline || !request.body || !request.eventDate) {
      this.error.set('Add a headline, the story and its date.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api.saveStory(request, this.photo, this.story?.id).subscribe({
      next: saved => {
        this.saving.set(false);
        this.ui.toast(this.story ? 'Story updated.' : 'Story added.');
        this.modals.dismiss(saved, 'saved');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save the story.'));
      }
    });
  }

  async remove() {
    if (this.saving() || this.deleting()) {
      return;
    }
    const story = this.story;
    if (!story) {
      return;
    }
    const ok = await this.ui.confirm('Delete story?',
      `"${story.headline}" and its photo will be removed from the newspaper.`, 'Delete', true);
    if (!ok) {
      return;
    }
    this.deleting.set(true);
    this.error.set('');
    this.api.deleteStory(story.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.ui.toast('Story deleted.');
        this.modals.dismiss(null, 'deleted');
      },
      error: err => {
        this.deleting.set(false);
        this.error.set(errorMessage(err, 'Could not delete the story.'));
      }
    });
  }

  private revokePreview() {
    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl());
      this.previewUrl.set('');
    }
  }
}
