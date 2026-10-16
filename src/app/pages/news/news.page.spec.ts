import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { Observable, of, throwError } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { NewsStory, Page } from '../../core/models';
import { NewspaperPage } from './news.page';

const story = (id: number): NewsStory => ({
  id, headline: `Headline ${id}`, body: `Body of story ${id}.\n\nSecond paragraph.`, eventDate: '2026-10-04',
  photoCaption: null, hasPhoto: false, photoVersion: 0, createdByName: 'Asha',
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

  it('rendersMastheadLeadAndOtherStories', () => {
    const el = render(of(page([story(1), story(2), story(3)])));
    expect(el.querySelector('.masthead')?.textContent).toContain('राहुल सार्वजनिक वाचनालय');
    expect(el.querySelector('.lead')?.textContent).toContain('Headline 1');
    expect(el.querySelectorAll('.story').length).toBe(2);
  });

  it('addsDropCapOnlyToALatinLead', () => {
    const marathi = { ...story(1), body: 'डॉ. आंबेडकर जयंती साजरी झाली.' };
    expect(render(of(page([marathi]))).querySelector('.lead .text p')?.classList.contains('cap')).toBe(false);
    TestBed.resetTestingModule();
    expect(render(of(page([story(1)]))).querySelector('.lead .text p')?.classList.contains('cap')).toBe(true);
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
