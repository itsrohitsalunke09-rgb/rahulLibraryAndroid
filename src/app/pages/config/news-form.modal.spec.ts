import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { NEVER, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PHOTO_DECODE_ERROR } from '../../core/image-resize';
import { NewsStory } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { StoryModal } from '../news/story.modal';
import { NewsFormModal } from './news-form.modal';

const story: NewsStory = {
  id: 7, headline: 'Book fair', body: 'It was fun.', eventDate: '2026-10-04', photoCaption: 'Crowd',
  hasPhoto: true, photoVersion: 2, template: 'SIDE_PHOTO', createdByName: 'Asha', createdAt: '2026-10-04T10:00:00', updatedAt: '2026-10-04T10:00:00',
};

const BANNER_HINT = 'Add a photo for the banner — without one it shows as Classic.';

describe('NewsFormModal', () => {
  let api: { saveStory: ReturnType<typeof vi.fn>; deleteStory: ReturnType<typeof vi.fn>; storyPhoto: ReturnType<typeof vi.fn> };
  let modals: { dismiss: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let present: ReturnType<typeof vi.fn>;

  function configure() {
    api = { saveStory: vi.fn(() => of(story)), deleteStory: vi.fn(() => of(undefined)), storyPhoto: vi.fn(() => NEVER) };
    present = vi.fn(async () => undefined);
    modals = { dismiss: vi.fn(), create: vi.fn(async () => ({ present })) };
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: { profile: () => ({ fullName: 'Admin User' }) } },
        { provide: ModalController, useValue: modals },
        { provide: UiService, useValue: { toast: vi.fn(), error: vi.fn(), confirm: vi.fn(async () => true) } },
      ],
    });
  }

  function create(existing?: NewsStory) {
    configure();
    const component = TestBed.runInInjectionContext(() => new NewsFormModal());
    component.story = existing;
    component.ngOnInit();
    return component;
  }

  /** Renders the form; `pick` taps a template tile by its label. */
  function render(existing?: NewsStory) {
    configure();
    const fixture = TestBed.createComponent(NewsFormModal);
    fixture.componentInstance.story = existing;
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const tile = (label: string) => [...el.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
      .find(b => b.textContent?.trim() === label)!;
    const pick = (label: string) => {
      tile(label).click();
      fixture.detectChanges();
    };
    return { fixture, el, modal: fixture.componentInstance, tile, pick };
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

  it('defaultsToClassic', () => {
    const { el, modal, tile } = render();
    expect(modal.form.template).toBe('CLASSIC');
    expect(el.querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBeTruthy();
    expect(el.querySelectorAll('[role="radio"]').length).toBe(4);
    expect(tile('Classic').getAttribute('aria-checked')).toBe('true');
    expect(tile('Notice').getAttribute('aria-checked')).toBe('false');
    expect(el.querySelector('app-news-card article.card-classic')).not.toBeNull();
  });

  it('editKeepsStoredTemplate', () => {
    const { modal, tile } = render(story);
    expect(modal.form.template).toBe('SIDE_PHOTO');
    expect(tile('Side photo').getAttribute('aria-checked')).toBe('true');

    TestBed.resetTestingModule();
    const missing = create({ ...story, template: undefined as unknown as NewsStory['template'] });
    expect(missing.form.template).toBe('CLASSIC');

    TestBed.resetTestingModule();
    const unknown = create({ ...story, template: 'POSTER' as unknown as NewsStory['template'] });
    expect(unknown.form.template).toBe('CLASSIC');
  });

  it('saveSendsTemplate', () => {
    const { modal, pick } = render();
    modal.form.headline = 'Fair';
    modal.form.body = 'Text';
    pick('Notice');
    modal.save();
    expect(api.saveStory.mock.calls[0][0].template).toBe('NOTICE');
  });

  it('noticeHidesPhotoSection', () => {
    const { el, modal, pick } = render(story);
    expect(el.querySelector('input[type="file"]')).not.toBeNull();
    pick('Notice');
    expect(el.querySelector('input[type="file"]')).toBeNull();
    expect(el.querySelector('.choose')).toBeNull();
    expect(el.querySelector('input[name="photoCaption"]')).toBeNull();
    expect(el.textContent).toContain("Notices don't show a photo.");
    expect(el.querySelector('app-news-card article.card-notice')).not.toBeNull();
    // The photo itself is left alone, so switching back keeps it.
    modal.save();
    expect(api.saveStory.mock.calls[0][0].removePhoto).toBe(false);
  });

  it('bannerWithoutPhotoShowsHint', () => {
    const { el, pick } = render();
    expect(el.textContent).not.toContain(BANNER_HINT);
    pick('Photo banner');
    expect(el.textContent).toContain(BANNER_HINT);
    expect(el.querySelector('.choose')).not.toBeNull();

    TestBed.resetTestingModule();
    const withPhoto = render(story);
    withPhoto.pick('Photo banner');
    expect(withPhoto.el.textContent).not.toContain(BANNER_HINT);
  });

  it('livePreviewFollowsTheForm', () => {
    const { fixture, el, modal } = render();
    expect(el.querySelector('app-news-card h2')?.textContent).toContain('Your headline');
    modal.form.headline = 'Book fair';
    modal.changed();
    fixture.detectChanges();
    expect(el.querySelector('app-news-card h2')?.textContent).toContain('Book fair');
  });

  it('previewFullOpensModalWithDraft', async () => {
    const modal = create(story);
    modal.form.headline = 'New headline';
    modal.changed();
    await modal.previewFull();
    expect(modals.create).toHaveBeenCalledTimes(1);
    const options = modals.create.mock.calls[0][0];
    expect(options.component).toBe(StoryModal);
    expect(options.componentProps.story.headline).toBe('New headline');
    expect(options.componentProps.story.id).toBe(7);
    expect(options.componentProps.story.hasPhoto).toBe(true);
    expect(options.componentProps.story.photoVersion).toBe(2);
    expect(options.componentProps.story.template).toBe('SIDE_PHOTO');
    expect(options.componentProps.previewPhoto).toBeNull();
    expect(present).toHaveBeenCalled();
  });

  it('previewFullOpensOneModalOnDoubleTap', async () => {
    const modal = create(story);
    let presented!: () => void;
    present.mockImplementation(() => new Promise<void>(resolve => (presented = resolve)));
    const first = modal.previewFull();
    const second = modal.previewFull();
    expect(modal.previewing()).toBe(true);
    await second;
    await vi.waitFor(() => expect(present).toHaveBeenCalled());
    presented();
    await first;
    expect(modals.create).toHaveBeenCalledTimes(1);
    expect(modal.previewing()).toBe(false);
  });

  it('editWithoutPhotoChangeSendsNoFile', () => {
    const modal = create(story);
    modal.save();
    expect(api.saveStory).toHaveBeenCalledTimes(1);
    const [request, photo, id] = api.saveStory.mock.calls[0];
    expect(photo).toBeNull();
    expect(request.removePhoto).toBe(false);
    expect(request.template).toBe('SIDE_PHOTO');
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
