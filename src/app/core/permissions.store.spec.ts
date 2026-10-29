import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Role } from './models';
import { PermissionMatrix, PermissionsStore } from './permissions.store';

describe('PermissionsStore', () => {
  const role = signal<Role | null>('LIBRARIAN');

  beforeEach(() => localStorage.clear());

  function create(matrix: PermissionMatrix = { ADMIN: [], LIBRARIAN: ['READ', 'DELETE'], STUDENT: [] }) {
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { permissions: () => of(matrix) } },
        { provide: AuthService, useValue: { role } },
      ],
    });
    return TestBed.inject(PermissionsStore);
  }

  it('startsFromTheDefaultsThenFollowsTheTicksFromTheServer', () => {
    role.set('LIBRARIAN');
    const perms = create();
    expect(perms.can('WRITE')).toBe(true);
    expect(perms.can('DELETE')).toBe(false);
    perms.refresh();
    expect(perms.can('DELETE')).toBe(true);
    expect(perms.can('WRITE')).toBe(false);
  });

  it('givesAdminEverythingWhateverTheTicks', () => {
    role.set('ADMIN');
    const perms = create();
    perms.refresh();
    expect(perms.can('DELETE')).toBe(true);
    expect(perms.can('GALAXY_VIEW')).toBe(true);
  });

  it('keepsTheTicksOnThePhoneForNextStart', () => {
    role.set('STUDENT');
    create({ ADMIN: [], LIBRARIAN: [], STUDENT: ['READ', 'GALAXY_VIEW'] }).refresh();
    TestBed.resetTestingModule();
    expect(create().can('GALAXY_VIEW')).toBe(true);
  });
});
