import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';
import { Permission, PermissionsStore } from './permissions.store';

/** Signed-in pages. Also signs out if the stored session or profile has been cleared. */
export const authGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  return auth.ensureSession(false) ? true : inject(Router).parseUrl('/login');
};

/** Login/register pages: send signed-in users straight to their home tab. */
export const guestGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  return auth.user() ? inject(Router).parseUrl(auth.homeUrl()) : true;
};

export function roleGuard(roles: Role[]): CanMatchFn {
  return () => {
    const auth = inject(AuthService);
    const role = auth.role();
    return role && roles.includes(role) ? true : inject(Router).parseUrl(auth.homeUrl());
  };
}

/** Screens that need a permission from the Roles & permissions master; without it, a "no permission" page. */
export function permissionGuard(permission: Permission): CanActivateFn {
  return () => inject(PermissionsStore).can(permission) ? true : inject(Router).parseUrl('/tabs/no-access');
}
