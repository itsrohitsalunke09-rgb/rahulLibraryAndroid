import { TestBed } from '@angular/core/testing';
import { NEVER } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { NewsStory } from '../../core/models';
import { NewsCardComponent } from './news-card.component';

const story = (over: Partial<NewsStory> = {}): NewsStory => ({
  id: 3, headline: 'Book fair draws a crowd', body: 'The fair opened.\n\nMore later.', eventDate: '2026-10-04',
  photoCaption: 'Crowd', hasPhoto: true, photoVersion: 1, createdByName: 'Asha', template: 'CLASSIC',
  createdAt: '2026-10-04T10:00:00', updatedAt: '2026-10-04T10:00:00', ...over,
});

describe('NewsCardComponent', () => {
  let storyPhoto: ReturnType<typeof vi.fn>;

  function render(s: NewsStory, previewPhoto: string | null = null) {
    storyPhoto = vi.fn(() => NEVER);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: { storyPhoto } }] });
    const fixture = TestBed.createComponent(NewsCardComponent);
    fixture.componentRef.setInput('story', s);
    fixture.componentRef.setInput('previewPhoto', previewPhoto);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('classicShowsPhotoStripHeadlineDateAndExcerpt', () => {
    const el = render(story());
    expect(el.querySelector('article.card-classic')).not.toBeNull();
    expect(el.querySelector('img')).not.toBeNull();
    expect(el.querySelector('h2')?.textContent).toContain('Book fair draws a crowd');
    expect(el.textContent).toContain('4 Oct 2026');
    expect(el.querySelector('.excerpt')?.textContent).toContain('The fair opened.');
    expect(storyPhoto).toHaveBeenCalledWith(3, 1);
  });

  it('bannerWithoutPhotoFallsBackToClassic', () => {
    const el = render(story({ template: 'PHOTO_BANNER', hasPhoto: false }));
    expect(el.querySelector('article.card-classic')).not.toBeNull();
    expect(el.querySelector('article.card-photo-banner')).toBeNull();
    expect(el.querySelector('img')).toBeNull();
  });

  it('noticeNeverShowsPhoto', () => {
    const el = render(story({ template: 'NOTICE', hasPhoto: true }));
    expect(el.querySelector('article.card-notice')).not.toBeNull();
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.tag')?.textContent?.trim()).toBe('Notice');
    expect(storyPhoto).not.toHaveBeenCalled();
  });

  it('previewPhotoUsedInsteadOfServer', () => {
    const el = render(story({ hasPhoto: false }), 'blob:x');
    const img = el.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('blob:x');
    expect(storyPhoto).not.toHaveBeenCalled();
  });

  it('sidePhotoCardShowsThumb', () => {
    const el = render(story({ template: 'SIDE_PHOTO' }));
    expect(el.querySelector('article.card-side-photo')).not.toBeNull();
    expect(el.querySelector('img.thumb')).not.toBeNull();
  });

  it('photoBannerPutsHeadlineOnThePhotoBand', () => {
    const el = render(story({ template: 'PHOTO_BANNER' }));
    expect(el.querySelector('article.card-photo-banner .banner img')).not.toBeNull();
    expect(el.querySelector('.banner h2')?.textContent).toContain('Book fair draws a crowd');
  });

  it('hasNoButtonsTheParentHandlesTaps', () => {
    const el = render(story());
    expect(el.querySelector('button')).toBeNull();
  });
});
