import { Component, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar, ViewWillEnter,
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { Role } from '../../core/models';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';
import { PERMISSIONS, Permission, PermissionMatrix, PermissionsStore } from '../../core/permissions.store';
import { UiService, errorMessage } from '../../core/ui.service';

/**
 * Roles & permissions master (admins only): tick what librarians and students may do. Admin always has
 * everything, so no one can be locked out. The app shows or hides actions by these ticks, and the server
 * enforces the same ticks.
 */
@Component({
  selector: 'app-permissions',
  templateUrl: 'permissions.page.html',
  styleUrls: ['permissions.page.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSpinner, PageSkeletonComponent],
})
export class PermissionsPage implements ViewWillEnter {
  private api = inject(ApiService);
  private store = inject(PermissionsStore);
  private ui = inject(UiService);

  readonly permissions = PERMISSIONS;
  readonly roles: { role: Role; label: string; fixed: boolean }[] = [
    { role: 'ADMIN', label: 'Admin', fixed: true },
    { role: 'LIBRARIAN', label: 'Librarian', fixed: false },
    { role: 'STUDENT', label: 'Student', fixed: false },
  ];
  /** The ticks being edited; null until loaded. */
  readonly ticks = signal<PermissionMatrix | null>(null);
  readonly saving = signal(false);
  readonly dirty = signal(false);
  readonly error = signal('');

  ionViewWillEnter() {
    this.error.set('');
    this.api.permissions().subscribe({
      next: matrix => { this.ticks.set(copy(matrix)); this.dirty.set(false); },
      error: err => this.error.set(errorMessage(err, 'Could not load the permissions.')),
    });
  }

  has(role: Role, permission: Permission) {
    return role === 'ADMIN' || (this.ticks()?.[role] ?? []).includes(permission);
  }

  toggle(role: Role, permission: Permission) {
    const ticks = this.ticks();
    if (!ticks || role === 'ADMIN') {
      return;
    }
    const current = ticks[role];
    this.ticks.set({ ...ticks, [role]: current.includes(permission) ? current.filter(p => p !== permission) : [...current, permission] });
    this.dirty.set(true);
  }

  save() {
    const ticks = this.ticks();
    if (!ticks) {
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.api.savePermissions(ticks).subscribe({
      next: saved => {
        this.saving.set(false);
        this.ticks.set(copy(saved));
        this.store.set(saved);
        this.dirty.set(false);
        this.ui.toast('Permissions saved. They apply the next time each person opens the app.');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save the permissions.'));
      },
    });
  }
}

function copy(matrix: PermissionMatrix): PermissionMatrix {
  return { ADMIN: [...(matrix.ADMIN ?? [])], LIBRARIAN: [...(matrix.LIBRARIAN ?? [])], STUDENT: [...(matrix.STUDENT ?? [])] };
}
