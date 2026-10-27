import { FIRST_ISSUE_YEAR, issueYears } from './issue-years';

describe('issueYears', () => {
  it('listsThisYearBackToTheFirstYearNewestFirst', () => {
    expect(issueYears(new Date(2027, 2, 1))).toEqual([2027, 2026, 2025]);
  });

  it('alwaysOffersAtLeastTheFirstYear', () => {
    expect(issueYears(new Date(2024, 0, 1))).toEqual([FIRST_ISSUE_YEAR]);
  });
});
