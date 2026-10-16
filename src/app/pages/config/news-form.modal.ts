import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar, ModalController
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { PHOTO_DECODE_ERROR, resizePhoto } from '../../core/image-resize';
import { NewsStory, NewsStoryRequest } from '../../core/models';
import { StoryPhotoDirective } from '../../core/story-photo.directive';
import { UiService, errorMessage } from '../../core/ui.service';

/** Today as YYYY-MM-DD in the device's time zone. */
function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Add or edit one news story with an optional photo; editing also offers Delete. */
@Component({
  selector: 'app-news-form',
  templateUrl: 'news-form.modal.html',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonSpinner, StoryPhotoDirective],
  styles: [`
    .form { padding: 0 0 24px; max-width: 520px; margin: 0 auto; }
    .body textarea { field-sizing: content; min-height: 130px; }
    .photo-input { display: none; }
    .choose { width: 100%; font: inherit; font-size: 14px; text-align: start; cursor: pointer; }
    .preview { display: block; width: 100%; max-height: 240px; object-fit: cover; border-radius: 14px; background: var(--app-rule); }
    .preview.failed { min-height: 120px; color: transparent; }
    .photo-actions { display: flex; gap: 8px; margin-top: 8px; }
    .photo-actions button {
      flex: 1; height: 38px; border: 1px solid var(--app-rule); border-radius: var(--app-radius-control);
      background: transparent; color: var(--app-ink); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
    }
    .photo-actions .remove { color: var(--app-rust); }
    .delete {
      display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 44px;
      margin-top: 28px; border: 1px solid var(--app-rust); border-radius: var(--app-radius-control);
      background: transparent; color: var(--app-rust); font: inherit; font-size: 14px; font-weight: 500; cursor: pointer;
    }
    .delete:disabled { opacity: 0.6; }
    .delete .icon { --icon-size: 17px; }
  `],
})
export class NewsFormModal implements OnInit, OnDestroy {
  /** Story to edit; leave empty to add a new one. */
  @Input() story?: NewsStory;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);

  form: NewsStoryRequest = { headline: '', body: '', eventDate: today(), photoCaption: '', removePhoto: false };
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');
  /** Object URL of the newly chosen photo, for the preview. */
  readonly previewUrl = signal('');
  /** The existing photo is still kept (editing, not removed, nothing chosen to replace it). */
  readonly keepsExisting = signal(false);
  readonly hasPhoto = computed(() => !!this.previewUrl() || this.keepsExisting());

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
      };
      this.keepsExisting.set(this.story.hasPhoto);
    }
  }

  ngOnDestroy() {
    this.revokePreview();
  }

  cancel() {
    this.modals.dismiss(null, 'cancel');
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
    const request: NewsStoryRequest = {
      headline: this.form.headline.trim(),
      body: this.form.body.trim(),
      eventDate: this.form.eventDate,
      photoCaption: this.hasPhoto() ? (this.form.photoCaption ?? '').trim() || null : null,
      removePhoto: this.form.removePhoto,
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
