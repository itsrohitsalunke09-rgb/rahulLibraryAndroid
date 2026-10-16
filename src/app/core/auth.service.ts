import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthUser, RegistrationRequest, Role, STAFF_ROLES, UserAccount } from './models';

/** Session (JWT, id, role) and the signed-in user's full profile, kept in local storage. */
const SESSION_KEY = 'rahul-library.auth';
const PROFILE_KEY = 'rahul-library.profile';

/**
 * Signs users in and out and holds who is signed in.
 *
 * The full profile is fetched once at sign-in and stored with the session; the rest of the
 * app reads it from here instead of calling the API. If either stored entry disappears
 * (e.g. the app's storage was cleared), the user is signed out.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly user = signal<AuthUser | null>(null);
  readonly profile = signal<UserAccount | null>(null);
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);
  readonly isStaff = computed(() => STAFF_ROLES.includes(this.role() as Role));
  readonly isAdmin = computed(() => this.role() === 'ADMIN');

  constructor() {
    const stored = readStored();
    if (stored) {
      this.user.set(stored.user);
      this.profile.set(stored.profile);
    } else {
      clearStored();
    }
    // Coming back to the app (or tab) is when cleared storage is most likely to be noticed.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.ensureSession();
      }
    });
  }

  login(username: string, password: string): Observable<UserAccount> {
    return this.startSession(
      this.http.post<AuthUser>(`${environment.apiUrl}/auth/login`, { username, password })
    );
  }

  register(data: RegistrationRequest): Observable<UserAccount> {
    return this.startSession(this.http.post<AuthUser>(`${environment.apiUrl}/auth/register`, data));
  }

  /** Store the profile returned after the user edits it, so the app shows the new details. */
  updateProfile(profile: UserAccount) {
    const user = this.user();
    if (user) {
      this.store({ ...user, fullName: profile.fullName }, profile);
    }
  }

  /**
   * Signs out if the stored session or profile has gone missing or expired.
   * Returns whether the user is still signed in. Route guards pass navigate = false
   * because they redirect to the login page themselves.
   */
  ensureSession(navigate = true): boolean {
    if (this.user() && readStored()) {
      return true;
    }
    if (this.user()) {
      this.clearSession();
      if (navigate) {
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    }
    return false;
  }

  logout(sessionExpired = false) {
    this.clearSession();
    this.router.navigate(['/login'], {
      replaceUrl: true,
      queryParams: sessionExpired ? { expired: 1 } : {}
    });
  }

  private clearSession() {
    clearStored();
    this.user.set(null);
    this.profile.set(null);
  }

  /** Where a user lands after signing in. */
  homeUrl() {
    return this.isStaff() ? '/tabs/dashboard' : '/tabs/catalog';
  }

  /** Signs in only once both the session and the full profile are in hand. */
  private startSession(signIn: Observable<AuthUser>): Observable<UserAccount> {
    return signIn.pipe(
      switchMap(user =>
        // The token isn't stored yet, so send it explicitly rather than via the interceptor.
        this.http.get<UserAccount>(`${environment.apiUrl}/users/profile`, {
          headers: { Authorization: `Bearer ${user.token}` }
        }).pipe(map(profile => ({ user, profile })))
      ),
      map(({ user, profile }) => {
        this.store(user, profile);
        return profile;
      }),
      catchError(err => {
        clearStored();
        return throwError(() => err);
      })
    );
  }

  private store(user: AuthUser, profile: UserAccount) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    this.user.set(user);
    this.profile.set(profile);
  }
}

/** Both stored entries, or null if either is missing, unreadable or the token has expired. */
function readStored(): { user: AuthUser; profile: UserAccount } | null {
  try {
    const rawUser = localStorage.getItem(SESSION_KEY);
    const rawProfile = localStorage.getItem(PROFILE_KEY);
    if (!rawUser || !rawProfile) {
      return null;
    }
    const user = JSON.parse(rawUser) as AuthUser;
    const profile = JSON.parse(rawProfile) as UserAccount;
    if (!user?.token || !profile?.id || isExpired(user.token)) {
      return null;
    }
    return { user, profile };
  } catch {
    return null;
  }
}

function clearStored() {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // Storage unavailable: nothing to clear.
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
