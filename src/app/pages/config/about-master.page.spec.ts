import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DEFAULT_ABOUT } from '../../core/about-content';
import { ApiService } from '../../core/api.service';
import { UiService } from '../../core/ui.service';
import { AboutMasterPage } from './about-master.page';

describe('AboutMasterPage', () => {
  let api: { about: ReturnType<typeof vi.fn>; saveAbout: ReturnType<typeof vi.fn> };

  function create(saved: object | null = null) {
    api = { about: vi.fn(() => of(saved)), saveAbout: vi.fn(() => of({})) };
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: UiService, useValue: { toast: vi.fn(), confirm: vi.fn(async () => true) } },
      ],
    });
    const page = TestBed.runInInjectionContext(() => new AboutMasterPage());
    page.ngOnInit();
    return page;
  }

  it('starts from the built-in text when nothing is saved, without changing it when edited', () => {
    const page = create(null);
    expect(page.form.title).toBe(DEFAULT_ABOUT.title);
    page.addStep();
    page.form.sections[0].heading = 'changed';
    expect(DEFAULT_ABOUT.timeline.length).toBe(6);
    expect(DEFAULT_ABOUT.sections[0].heading).not.toBe('changed');
  });

  it('loads the saved text', () => {
    const page = create({ title: 'Saved title', timeline: [] });
    expect(page.form.title).toBe('Saved title');
    expect(page.form.timeline).toEqual([]);
  });

  it('trims fields and leaves out blank rows when saving', () => {
    const page = create(null);
    page.form.title = '  Rahul Library  ';
    page.addStep();
    page.addSection();
    page.save();
    const sent = api.saveAbout.mock.calls[0][0];
    expect(sent.title).toBe('Rahul Library');
    expect(sent.timeline.length).toBe(DEFAULT_ABOUT.timeline.length);
    expect(sent.sections.length).toBe(DEFAULT_ABOUT.sections.length);
  });

  it('checks the title, email and Instagram link before saving', () => {
    const page = create(null);
    page.form.title = ' ';
    page.save();
    expect(page.error()).toBe('Enter the library name (title).');
    page.form.title = 'Rahul';
    page.form.email = 'not-an-email';
    page.save();
    expect(page.error()).toBe('Enter a valid email address, or leave it empty.');
    page.form.email = '';
    page.form.instagram = 'instagram.com/x';
    page.save();
    expect(page.error()).toBe('The Instagram link must start with https://');
    expect(api.saveAbout).not.toHaveBeenCalled();
  });

  it('moves sections up and down within bounds', () => {
    const page = create(null);
    const [a, b] = page.form.sections;
    page.moveSection(0, 1);
    expect(page.form.sections.slice(0, 2)).toEqual([b, a]);
    page.moveSection(0, -1);
    expect(page.form.sections[0]).toBe(b);
  });

  it('shows the server message when saving fails', () => {
    const page = create(null);
    api.saveAbout.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'The About Us text is too long.' } })));
    page.save();
    expect(page.error()).toBe('The About Us text is too long.');
    expect(page.saving()).toBe(false);
  });
});
