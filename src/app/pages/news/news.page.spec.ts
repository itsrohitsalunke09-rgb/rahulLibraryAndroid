import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { Observable, of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { NewsStory, Page } from '../../core/models';
import { NewspaperPage } from './news.page';

const story = (id: number): NewsStory => ({
  id, headline: `Headline ${id}`, body: `Body of story ${id}.\n\nSecond paragraph.`, eventDate: '2026-10-04',
  photoCaption: null, hasPhoto: false, photoVersion: 0, template: 'CLASSIC', createdByName: 'Asha',
  createdAt: '2026-10-04T10:00:00', updatedAt: '2026-10-04T10:00:00',
});

const page = (content: NewsStory[]): Page<NewsStory> => ({
  content, totalElements: content.length, totalPages: 1, size: 10, number: 0, first: true, last: true,
} as Page<NewsStory>);

describe('NewspaperPage', () => {
  function render(result: Observable<Page<NewsStory>>) {
    TestBed.configureTestingModule({
      imports: [NewspaperPage],
      providers: [
        { provide: ApiService, useValue: { news: vi.fn(() => result), storyPhoto: vi.fn(() => of(new Blob())) } },
        { provide: ModalController, useValue: { create: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(NewspaperPage);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('rendersTheTabsTitleWithoutADate', () => {
    const el = render(of(page([story(1)])));
    const header = el.querySelector('.header')?.textContent?.trim() ?? '';
    expect(header).toBe('Happenings');
  });

  it('rendersOneCardPerStory', () => {
    const el = render(of(page([story(1), story(2), story(3)])));
    expect(el.querySelectorAll('app-news-card').length).toBe(3);
    expect(el.querySelector('button.card-button')?.getAttribute('aria-label')).toBe('Headline 1');
  });

  it('opensTheStoryModalWhenACardIsTapped', async () => {
    const present = vi.fn();
    const create = vi.fn(() => Promise.resolve({ present }));
    TestBed.configureTestingModule({
      imports: [NewspaperPage],
      providers: [
        { provide: ApiService, useValue: { news: vi.fn(() => of(page([story(1), story(2)]))), storyPhoto: vi.fn(() => of(new Blob())) } },
        { provide: ModalController, useValue: { create } },
      ],
    });
    const fixture = TestBed.createComponent(NewspaperPage);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button.card-button');
    buttons[1].click();
    await Promise.resolve();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ componentProps: { story: expect.objectContaining({ id: 2 }) } }));
    expect(present).toHaveBeenCalled();
  });

  it('aDoubleTapOpensOnlyOneStory', async () => {
    let finish!: () => void;
    const present = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const create = vi.fn(() => Promise.resolve({ present }));
    TestBed.configureTestingModule({
      imports: [NewspaperPage],
      providers: [
        { provide: ApiService, useValue: { news: vi.fn(() => of(page([story(1)]))), storyPhoto: vi.fn(() => of(new Blob())) } },
        { provide: ModalController, useValue: { create } },
      ],
    });
    const fixture = TestBed.createComponent(NewspaperPage);
    const first = fixture.componentInstance.open(story(1));
    void fixture.componentInstance.open(story(1));
    expect(create).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    finish();
    await first;
    expect(create).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.opening()).toBe(false);
  });

  it('showsEmptyState', () => {
    const el = render(of(page([])));
    expect(el.textContent).toContain("No news yet — the librarian's stories will appear here.");
  });

  it('showsErrorWhenServerFails', () => {
    const el = render(throwError(() => new HttpErrorResponse({ status: 0 })));
    expect(el.querySelector('.page-error')?.textContent).toContain('Cannot reach the library server. Check your internet connection.');
    expect(el.querySelector('.skeleton')).toBeNull();
  });
});
