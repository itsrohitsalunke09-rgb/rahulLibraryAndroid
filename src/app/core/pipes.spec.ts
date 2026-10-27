import { avatarHue } from './pipes';

describe('avatarHue', () => {
  it('givesTheSamePersonTheSameColourEveryTime', () => {
    expect(avatarHue('asha')).toBe(avatarHue('asha'));
  });

  it('spreadsDifferentPeopleAcrossSeveralColours', () => {
    const hues = new Set(['asha', 'ravi', 'meena', 'sunil', 'priya', 'omkar', 'neha', 'kiran'].map(avatarHue));
    expect(hues.size).toBeGreaterThan(3);
  });
});
