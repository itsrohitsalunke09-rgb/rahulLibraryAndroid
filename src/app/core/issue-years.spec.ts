import { FIRST_YEAR, issueYears } from './issue-years';

describe('issueYears', () => {
  it('listsThisYearBackToTheFirstYearNewestFirst', () => {
    const years = issueYears(new Date(2027, 2, 1));
    expect(years.slice(0, 3)).toEqual([2027, 2026, 2025]);
    expect(years.at(-1)).toBe(1994);
    expect(years.length).toBe(2027 - 1994 + 1);
  });

  it('alwaysOffersAtLeastTheFirstYear', () => {
    expect(issueYears(new Date(1990, 0, 1))).toEqual([FIRST_YEAR]);
  });
});
