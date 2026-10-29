import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { GalaxyReadersStore, loadSaved } from './galaxy-readers.store';

describe('GalaxyReadersStore', () => {
  const year = new Date().getFullYear();
  const list = [{ studentId: 7, studentName: 'Aarav', books: 8 }];

  beforeEach(() => localStorage.clear());

  function create(readersInYear: () => unknown) {
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: { readersInYear } }] });
    return TestBed.inject(GalaxyReadersStore);
  }

  it('savesTheReadersAndStartsFromTheSavedCopyNextTime', () => {
    const store = create(() => of(list));
    expect(store.readers()).toBeNull();
    store.refresh();
    expect(store.readers()).toEqual(list);
    expect(loadSaved(year)).toEqual(list);
    expect(loadSaved(year - 1)).toBeNull();
  });

  it('keepsTheSavedCopyQuietlyWhenTheServerFails', () => {
    localStorage.setItem('rahul-library.galaxy-readers', JSON.stringify({ year, readers: list }));
    const store = create(() => throwError(() => new Error('offline')));
    store.refresh();
    expect(store.readers()).toEqual(list);
    expect(store.error()).toBe('');
  });
});
