import { byFrequency } from './models';

describe('byFrequency', () => {
  it('groups in daily-to-monthly order and skips empty frequencies', () => {
    const papers = [
      { id: 1, frequency: 'MONTHLY' as const },
      { id: 2, frequency: 'DAILY' as const },
      { id: 3, frequency: 'DAILY' as const },
    ];
    expect(byFrequency(papers)).toEqual([
      { frequency: 'DAILY', items: [papers[1], papers[2]] },
      { frequency: 'MONTHLY', items: [papers[0]] },
    ]);
  });
});
