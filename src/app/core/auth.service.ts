import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthUser, RegistrationRequest, Role, STAFF_ROLES } from './models';

const KEY = 'rahul-library.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly user = signal<AuthUser | null>(this.read());
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);
  readonly isStaff = computed(() => STAFF_ROLES.includes(this.role() as Role));
  readonly isAdmin = computed(() => this.role() === 'ADMIN');

  login(username: string, password: string) {
    return this.http.post<AuthUser>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(tap(user => this.store(user)));
  }

  register(data: RegistrationRequest) {
    return this.http.post<AuthUser>(`${environment.apiUrl}/auth/register`, data)
      .pipe(tap(user => this.store(user)));
  }

  /** Keep the session but refresh the name shown in the app after a profile edit. */
  updateName(fullName: string) {
    const current = this.user();
    if (current) {
      this.store({ ...current, fullName });
    }
  }

  logout(sessionExpired = false) {
    localStorage.removeItem(KEY);
    this.user.set(null);
    this.router.navigate(['/login'], {
      replaceUrl: true,
      queryParams: sessionExpired ? { expired: 1 } : {}
    });
  }

  /** Where a user lands after signing in. */
  homeUrl() {
    return this.isStaff() ? '/tabs/dashboard' : '/tabs/catalog';
  }

  private store(user: AuthUser) {
    localStorage.setItem(KEY, JSON.stringify(user));
    this.user.set(user);
  }

  private read(): AuthUser | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        return null;
      }
      const user = JSON.parse(raw) as AuthUser;
      if (isExpired(user.token)) {
        localStorage.removeItem(KEY);
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }
}

function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
