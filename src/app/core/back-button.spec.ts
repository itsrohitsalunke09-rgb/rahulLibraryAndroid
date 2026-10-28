import { backTarget } from './back-button';

describe('backTarget', () => {
  it('goesFromADeepPageUpToItsTab', () => {
    expect(backTarget('/tabs/dashboard/reports/WEEKLY', '/tabs/dashboard')).toBe('/tabs/dashboard');
    expect(backTarget('/tabs/profile/masters/clippings?x=1', '/tabs/dashboard')).toBe('/tabs/profile');
  });

  it('goesFromAnotherTabHomeAndFromHomeOutOfTheApp', () => {
    expect(backTarget('/tabs/catalog', '/tabs/dashboard')).toBe('/tabs/dashboard');
    expect(backTarget('/tabs/dashboard', '/tabs/dashboard')).toBe('exit');
    expect(backTarget('/tabs/catalog', '/tabs/catalog')).toBe('exit');
  });

  it('leavesFromSignInAndReturnsToItFromTheOtherSignedOutScreens', () => {
    expect(backTarget('/login', '/login')).toBe('exit');
    expect(backTarget('/forgot-password', '/login')).toBe('/login');
  });
});
