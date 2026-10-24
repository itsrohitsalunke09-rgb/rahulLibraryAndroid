import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

/** An unsigned JWT whose payload expires at `exp` (seconds since 1970). */
const token = (exp: number) => `x.${btoa(JSON.stringify({ exp })).replace(/=+$/, '')}.y`;
const inAnHour = () => Math.floor(Date.now() / 1000) + 3600;

function storeSession(jwt: string, withProfile = true) {
  localStorage.setItem('rahul-library.auth', JSON.stringify({ token: jwt, id: 1, username: 'asha', fullName: 'Asha', role: 'STUDENT' }));
  if (withProfile) {
    localStorage.setItem('rahul-library.profile', JSON.stringify({ id: 1, username: 'asha', fullName: 'Asha', role: 'STUDENT', active: true }));
  }
}

function start() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
  return TestBed.inject(AuthService);
}

describe('AuthService stored session', () => {
  beforeEach(() => localStorage.clear());

  it('restores a session whose token has not expired', () => {
    storeSession(token(inAnHour()));
    const auth = start();
    expect(auth.user()?.username).toBe('asha');
    expect(auth.ensureSession(false)).toBe(true);
  });

  it('signs out when the token has expired', () => {
    storeSession(token(Math.floor(Date.now() / 1000) - 60));
    const auth = start();
    expect(auth.user()).toBeNull();
    expect(localStorage.getItem('rahul-library.auth')).toBeNull();
  });

  it('signs out when the stored profile is missing', () => {
    storeSession(token(inAnHour()), false);
    expect(start().user()).toBeNull();
  });

  it('signs out when the token cannot be read', () => {
    storeSession('not-a-jwt');
    expect(start().user()).toBeNull();
  });

  it('notices storage cleared while signed in', () => {
    storeSession(token(inAnHour()));
    const auth = start();
    localStorage.clear();
    expect(auth.ensureSession(false)).toBe(false);
    expect(auth.user()).toBeNull();
  });
});
