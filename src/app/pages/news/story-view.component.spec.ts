import { TestBed } from '@angular/core/testing';
import { NEVER } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { NewsStory } from '../../core/models';
import { StoryViewComponent } from './story-view.component';

const story = (over: Partial<NewsStory> = {}): NewsStory => ({
  id: 3, headline: 'Book fair', body: 'The fair opened.\n\nSecond part.\n\nThird.', eventDate: '2026-10-04',
  photoCaption: 'Crowd at the gate', hasPhoto: true, photoVersion: 1, createdByName: 'Asha', template: 'CLASSIC',
  createdAt: '2026-10-04T10:00:00', updatedAt: '2026-10-04T10:00:00', ...over,
});

describe('StoryViewComponent', () => {
  let storyPhoto: ReturnType<typeof vi.fn>;

  function render(s: NewsStory, previewPhoto: string | null = null) {
    storyPhoto = vi.fn(() => NEVER);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: { storyPhoto } }] });
    const fixture = TestBed.createComponent(StoryViewComponent);
    fixture.componentRef.setInput('story', s);
    fixture.componentRef.setInput('previewPhoto', previewPhoto);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('rendersOneParagraphEachWithDropCapOnALatinOpening', () => {
    const el = render(story());
    const ps = el.querySelectorAll('.text p');
    expect(ps.length).toBe(3);
    expect(ps[0].classList.contains('cap')).toBe(true);
    expect(ps[1].classList.contains('cap')).toBe(false);
  });

  it('noDropCapForADevanagariOpening', () => {
    const el = render(story({ body: 'डॉ. आंबेडकर जयंती' }));
    expect(el.querySelector('.text p')?.classList.contains('cap')).toBe(false);
  });

  it('classicShowsPhotoCaptionHeadlineAndByline', () => {
    const el = render(story());
    expect(el.querySelector('article.view-classic img')).not.toBeNull();
    expect(el.querySelector('figcaption')?.textContent).toContain('Crowd at the gate');
    expect(el.querySelector('h1')?.textContent).toContain('Book fair');
    expect(el.querySelector('.byline')?.textContent).toContain('By Asha');
    expect(el.querySelector('.byline')?.textContent).toContain('4 Oct 2026');
  });

  it('sidePhotoFloatsThePhotoInsideTheText', () => {
    const el = render(story({ template: 'SIDE_PHOTO' }));
    expect(el.querySelector('article.view-side-photo .text figure img')).not.toBeNull();
  });

  it('bannerWithoutPhotoFallsBackToClassic', () => {
    const el = render(story({ template: 'PHOTO_BANNER', hasPhoto: false }));
    expect(el.querySelector('article.view-classic')).not.toBeNull();
    expect(el.querySelector('img')).toBeNull();
  });

  it('photoBannerPutsHeadlineOnThePhotoBand', () => {
    const el = render(story({ template: 'PHOTO_BANNER' }));
    expect(el.querySelector('article.view-photo-banner .banner h1')?.textContent).toContain('Book fair');
    expect(el.querySelector('figcaption')?.textContent).toContain('Crowd at the gate');
  });

  it('noticeNeverShowsPhoto', () => {
    const el = render(story({ template: 'NOTICE' }));
    expect(el.querySelector('article.view-notice')).not.toBeNull();
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('figcaption')).toBeNull();
    expect(el.querySelector('.tag')?.textContent?.trim()).toBe('Notice');
    expect(storyPhoto).not.toHaveBeenCalled();
  });

  it('noticeHasNoDropCap', () => {
    const el = render(story({ template: 'NOTICE' }));
    expect(el.querySelector('.text p')?.classList.contains('cap')).toBe(false);
  });

  it('sidePhotoHasNoDropCap', () => {
    const el = render(story({ template: 'SIDE_PHOTO', body: 'The fair opened.\n\nSecond part.' }));
    expect(el.querySelector('article.view-side-photo')).not.toBeNull();
    expect(el.querySelector('.text p')?.classList.contains('cap')).toBe(false);
  });

  it('previewPhotoUsedInsteadOfServer', () => {
    const el = render(story({ hasPhoto: false }), 'blob:x');
    expect(el.querySelector('img')?.getAttribute('src')).toBe('blob:x');
    expect(storyPhoto).not.toHaveBeenCalled();
  });
});
