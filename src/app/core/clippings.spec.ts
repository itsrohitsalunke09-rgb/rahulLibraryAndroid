import { clippingRequest } from '../pages/config/clipping-form.modal';
import { searchClippings, yearsLabel } from './clippings';

describe('clippings', () => {
  const list = [
    { id: 1, title: 'स्वातंत्र्य लढा', yearFrom: 1990, yearTo: 2005 },
    { id: 2, title: 'Kargil', yearFrom: 1999, yearTo: 1999 },
  ];

  it('showsTheYearsOrOneYear', () => {
    expect(yearsLabel(list[0])).toBe('1990 – 2005');
    expect(yearsLabel(list[1])).toBe('1999');
  });

  it('searchesTitleAndYears', () => {
    expect(searchClippings(list, 'kar').map(c => c.id)).toEqual([2]);
    expect(searchClippings(list, '2005').map(c => c.id)).toEqual([1]);
    expect(searchClippings(list, '').length).toBe(2);
  });

  it('buildsARequestWithAnEmptyToYearMeaningTheSameYear', () => {
    expect(clippingRequest({ title: ' Kargil ', yearFrom: '1999', yearTo: '' }, 2026)).toEqual({ title: 'Kargil', yearFrom: 1999, yearTo: 1999 });
    expect(clippingRequest({ title: 'X', yearFrom: 2005, yearTo: 1999 }, 2026)).toContain('"To" year');
    expect(clippingRequest({ title: 'X', yearFrom: 2030, yearTo: '' }, 2026)).toContain('between 1800 and 2026');
    expect(clippingRequest({ title: ' ', yearFrom: 2000, yearTo: '' }, 2026)).toBe('Enter the title.');
  });
});
