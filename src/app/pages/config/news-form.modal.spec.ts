import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { PHOTO_DECODE_ERROR } from '../../core/image-resize';
import { NewsStory } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { NewsFormModal } from './news-form.modal';

const story: NewsStory = {
  id: 7, headline: 'Book fair', body: 'It was fun.', eventDate: '2026-10-04', photoCaption: 'Crowd',
  hasPhoto: true, photoVersion: 2, createdByName: 'Asha', createdAt: '2026-10-04T10:00:00', updatedAt: '2026-10-04T10:00:00',
};

describe('NewsFormModal', () => {
  let api: { saveStory: ReturnType<typeof vi.fn>; deleteStory: ReturnType<typeof vi.fn> };

  function create(existing?: NewsStory) {
    api = { saveStory: vi.fn(() => of(story)), deleteStory: vi.fn(() => of(undefined)) };
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: ModalController, useValue: { dismiss: vi.fn() } },
        { provide: UiService, useValue: { toast: vi.fn(), error: vi.fn(), confirm: vi.fn(async () => true) } },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new NewsFormModal());
    component.story = existing;
    component.ngOnInit();
    return component;
  }

  it('requiresHeadlineBodyDate', () => {
    const modal = create();
    modal.form.headline = '';
    modal.save();
    expect(modal.error()).toBe('Add a headline, the story and its date.');
    expect(api.saveStory).not.toHaveBeenCalled();
  });

  it('newStoryDefaultsToToday', () => {
    const modal = create();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    expect(modal.form.eventDate).toBe(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  });

  it('editWithoutPhotoChangeSendsNoFile', () => {
    const modal = create(story);
    modal.save();
    expect(api.saveStory).toHaveBeenCalledTimes(1);
    const [request, photo, id] = api.saveStory.mock.calls[0];
    expect(photo).toBeNull();
    expect(request.removePhoto).toBe(false);
    expect(id).toBe(7);
  });

  it('removePhotoSendsFlag', () => {
    const modal = create(story);
    modal.removePhoto();
    modal.save();
    expect(api.saveStory.mock.calls[0][0].removePhoto).toBe(true);
    expect(api.saveStory.mock.calls[0][1]).toBeNull();
  });

  it('decodeErrorShown', async () => {
    const modal = create();
    // A text file cannot be decoded, so the real resizePhoto rejects.
    await modal.choosePhoto(new File(['not an image'], 'x.txt', { type: 'text/plain' }));
    expect(modal.error()).toBe(PHOTO_DECODE_ERROR);
  });
});
