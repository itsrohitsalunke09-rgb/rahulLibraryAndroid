import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Role } from './models';

/** What a role may do; set per role in Profile › Masters › Roles & permissions. */
export type Permission = 'READ' | 'WRITE' | 'UPDATE' | 'DELETE' | 'GALAXY_VIEW' | 'CALL' | 'ISSUE_BOOK';
export type PermissionMatrix = Record<Role, Permission[]>;

export const PERMISSIONS: { key: Permission; label: string; hint: string }[] = [
  { key: 'READ', label: 'Read', hint: 'See the catalog, news, issues, people, registers and reports' },
  { key: 'WRITE', label: 'Write', hint: 'Add books and people, mark registers' },
  { key: 'UPDATE', label: 'Update', hint: 'Edit books and people, mark books returned' },
  { key: 'DELETE', label: 'Delete', hint: 'Delete books, people and magazine issues' },
  { key: 'GALAXY_VIEW', label: 'Galaxy view', hint: 'Open the Reading Galaxy' },
  { key: 'ISSUE_BOOK', label: 'Issue book', hint: 'Give a book to a student' },
  { key: 'CALL', label: 'Call', hint: 'Phone a newspaper or magazine vendor' },
];

/** The same defaults as the server's, used until the real ticks have loaded. */
export const DEFAULT_PERMISSIONS: PermissionMatrix = {
  ADMIN: ['READ', 'WRITE', 'UPDATE', 'DELETE', 'GALAXY_VIEW', 'ISSUE_BOOK', 'CALL'],
  LIBRARIAN: ['READ', 'WRITE', 'UPDATE', 'GALAXY_VIEW', 'ISSUE_BOOK'],
  STUDENT: ['READ'],
};

const KEY = 'rahul-library.permissions';

/**
 * Which actions the signed-in user's role may take. Kept on the phone (so the right buttons show at once)
 * and refreshed when the app starts; the server checks the same ticks, so a stale copy can only hide or
 * show a button, never let an action through.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsStore {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  readonly matrix = signal<PermissionMatrix>(loadSaved() ?? DEFAULT_PERMISSIONS);
  /** The signed-in user's permissions (admin always has all). */
  readonly mine = computed(() => {
    const role = this.auth.role();
    return new Set<Permission>(role === 'ADMIN' ? DEFAULT_PERMISSIONS.ADMIN : role ? this.matrix()[role] ?? [] : []);
  });

  can(permission: Permission): boolean {
    return this.mine().has(permission);
  }

  refresh() {
    this.api.permissions().subscribe({
      next: matrix => this.set(matrix),
      error: () => undefined,
    });
  }

  /** After saving the master, or loading from the server. */
  set(matrix: PermissionMatrix) {
    this.matrix.set({ ...DEFAULT_PERMISSIONS, ...matrix, ADMIN: DEFAULT_PERMISSIONS.ADMIN });
    try {
      localStorage.setItem(KEY, JSON.stringify(this.matrix()));
    } catch {
      // Not saved on the phone; it reloads from the server next start.
    }
  }
}

function loadSaved(): PermissionMatrix | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return saved && Array.isArray(saved.LIBRARIAN) && Array.isArray(saved.STUDENT) ? saved : null;
  } catch {
    return null;
  }
}
