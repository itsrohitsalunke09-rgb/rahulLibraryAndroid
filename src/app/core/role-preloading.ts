import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { EMPTY, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Role } from './models';

/**
 * Route `data.preload`: who the page is for, so it is only preloaded for them.
 * Pages without it are preloaded for everyone.
 */
export type PreloadFor = Role[] | 'guest';

/**
 * Preloads only the pages the signed-in user can open: students never download the staff
 * pages, and signed-in users skip login/register. The router re-runs this after every
 * navigation, so signing in preloads that role's pages straight away.
 */
@Injectable({ providedIn: 'root' })
export class RolePreloading implements PreloadingStrategy {
  private auth = inject(AuthService);

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const preloadFor = route.data?.['preload'] as PreloadFor | undefined;
    const role = this.auth.role();
    if (preloadFor === 'guest') {
      return role ? EMPTY : load();
    }
    if (preloadFor) {
      return role && preloadFor.includes(role) ? load() : EMPTY;
    }
    return load();
  }
}
