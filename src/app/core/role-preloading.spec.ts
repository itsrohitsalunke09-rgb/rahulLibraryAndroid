import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Route } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { AuthService } from './auth.service';
import { Role, STAFF_ROLES } from './models';
import { RolePreloading } from './role-preloading';

describe('RolePreloading', () => {
  const role = signal<Role | null>(null);
  let strategy: RolePreloading;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { role } }] });
    strategy = TestBed.inject(RolePreloading);
  });

  /** Whether the strategy would load the route. */
  const preloads = (data?: Route['data']) =>
    firstValueFrom(strategy.preload({ data }, () => of(true)), { defaultValue: false });

  it('preloads unrestricted pages for everyone', async () => {
    role.set(null);
    expect(await preloads()).toBe(true);
    role.set('STUDENT');
    expect(await preloads()).toBe(true);
  });

  it('preloads staff pages only for staff', async () => {
    role.set('STUDENT');
    expect(await preloads({ preload: STAFF_ROLES })).toBe(false);
    role.set('LIBRARIAN');
    expect(await preloads({ preload: STAFF_ROLES })).toBe(true);
    role.set(null);
    expect(await preloads({ preload: STAFF_ROLES })).toBe(false);
  });

  it('preloads login and register only when signed out', async () => {
    role.set(null);
    expect(await preloads({ preload: 'guest' })).toBe(true);
    role.set('ADMIN');
    expect(await preloads({ preload: 'guest' })).toBe(false);
  });
});
