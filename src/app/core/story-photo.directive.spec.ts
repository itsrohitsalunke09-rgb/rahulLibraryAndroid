import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from './api.service';
import { NewsStory } from './models';
import { StoryPhotoDirective } from './story-photo.directive';

const story = (over: Partial<NewsStory> = {}): NewsStory => ({
  id: 7,
  headline: 'h',
  body: 'b',
  eventDate: '2026-10-01',
  hasPhoto: true,
  photoVersion: 1,
  createdByName: 'a',
  createdAt: '',
  updatedAt: '',
  ...over,
});

@Component({
  imports: [StoryPhotoDirective],
  template: `<img [appStoryPhoto]="story()" />`,
})
class HostComponent {
  story = signal(story());
}

describe('StoryPhotoDirective', () => {
  let storyPhoto: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.spyOn>;
  let revoke: ReturnType<typeof vi.spyOn>;
  let n: number;

  const setup = (result: Observable<Blob>) => {
    storyPhoto.mockReturnValue(result);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    return { fixture, img };
  };

  beforeEach(() => {
    n = 0;
    storyPhoto = vi.fn();
    // jsdom has no object-URL support, so define stand-ins to spy on.
    (URL as any).createObjectURL ??= () => '';
    (URL as any).revokeObjectURL ??= () => undefined;
    create = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${++n}`);
    revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: { storyPhoto } }] });
  });

  afterEach(() => vi.restoreAllMocks());

  it('setsObjectUrlWhenLoaded', () => {
    const { img } = setup(of(new Blob(['x'], { type: 'image/jpeg' })));
    expect(img.src.endsWith('blob:1')).toBe(true);
    expect(img.classList.contains('loaded')).toBe(true);
    expect(storyPhoto).toHaveBeenCalledWith(7, 1);
  });

  it('marksFailedOnError', () => {
    const { img } = setup(throwError(() => new HttpErrorResponse({ status: 404 })));
    expect(img.classList.contains('failed')).toBe(true);
    expect(img.classList.contains('loaded')).toBe(false);
    expect(img.getAttribute('src')).toBeNull();
  });

  it('keepsThePhotoWhenANewObjectHasTheSameIdVersionAndFlag', () => {
    const { fixture, img } = setup(of(new Blob(['x'])));
    fixture.componentInstance.story.set(story());
    fixture.detectChanges();
    expect(storyPhoto).toHaveBeenCalledTimes(1);
    expect(img.src.endsWith('blob:1')).toBe(true);
    expect(img.classList.contains('loaded')).toBe(true);
  });

  it('marksFailedAndDropsSrcWhenTheImageCannotBeDecoded', () => {
    const { img } = setup(of(new Blob(['x'])));
    img.dispatchEvent(new Event('error'));
    expect(img.classList.contains('failed')).toBe(true);
    expect(img.classList.contains('loaded')).toBe(false);
    expect(img.getAttribute('src')).toBeNull();
  });

  it('revokesOnDestroy', () => {
    const { fixture } = setup(of(new Blob(['x'])));
    fixture.destroy();
    expect(revoke).toHaveBeenCalledWith('blob:1');
  });

  it('skipsRequestWhenStoryHasNoPhoto', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.story.set(story({ hasPhoto: false }));
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(storyPhoto).not.toHaveBeenCalled();
    expect(img.classList.contains('failed')).toBe(true);
    expect(img.getAttribute('src')).toBeNull();
  });

  it('revokesPreviousUrlAndCancelsInFlightOnChange', () => {
    const pending = new Subject<Blob>();
    storyPhoto.mockReturnValueOnce(of(new Blob(['a']))).mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.src.endsWith('blob:1')).toBe(true);

    fixture.componentInstance.story.set(story({ photoVersion: 2 }));
    fixture.detectChanges();
    expect(revoke).toHaveBeenCalledWith('blob:1');
    expect(img.getAttribute('src')).toBeNull();
    expect(img.classList.contains('loaded')).toBe(false);

    fixture.componentInstance.story.set(story({ photoVersion: 3 }));
    storyPhoto.mockReturnValueOnce(of(new Blob(['c'])));
    fixture.detectChanges();
    expect(pending.observed).toBe(false);
    expect(img.src.endsWith('blob:2')).toBe(true);
  });
});
