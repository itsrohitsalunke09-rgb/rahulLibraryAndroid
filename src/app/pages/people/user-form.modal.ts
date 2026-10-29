import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonSpinner, IonTitle, IonToggle, IonToolbar,
  ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PHOTO_DECODE_ERROR, resizePhoto } from '../../core/image-resize';
import { Role, UserAccount, UserRequest } from '../../core/models';
import { RoleLabelPipe } from '../../core/pipes';
import { PermissionsStore } from '../../core/permissions.store';
import { UiService, errorMessage } from '../../core/ui.service';

@Component({
  selector: 'app-user-form',
  templateUrl: 'user-form.modal.html',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonIcon, IonToggle,
    IonSpinner, RoleLabelPipe
  ],
  styles: [`
    .form { max-width: 520px; margin: 0 auto; }
    .active-row { margin-top: 14px; }
    .danger-zone { max-width: 520px; margin: 32px auto 16px; }
    .photo-input { display: none; }
    .choose { width: 100%; font: inherit; font-size: 14px; text-align: start; cursor: pointer; }
    .preview { display: block; width: 100%; max-height: 260px; object-fit: contain; border-radius: 14px; background: var(--app-rule); }
    .photo-actions { display: flex; gap: 8px; margin-top: 8px; }
    .photo-actions button {
      flex: 1; height: 44px; border: 1px solid var(--app-rule); border-radius: var(--app-radius-control);
      background: transparent; color: var(--app-ink); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
    }
    .photo-actions .remove { color: var(--app-rust); }
  `],
})
export class UserFormModal implements OnInit, OnDestroy {
  /** Account to edit; leave empty to create one. */
  @Input() user?: UserAccount;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);
  protected auth = inject(AuthService);
  /** What this role may do (Roles & permissions). */
  protected perms = inject(PermissionsStore);

  form: UserRequest = { username: '', fullName: '', email: '', phone: '', role: 'STUDENT', active: true, password: '' };
  /** Librarians can't create or promote admins (enforced by the backend too). */
  roles: Role[] = [];
  readonly saving = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);
  /** Object URL of the Aadhaar card photo shown: the saved one, or a newly chosen one. */
  readonly aadhaarUrl = signal('');
  readonly aadhaarLoading = signal(false);
  readonly aadhaarError = signal('');
  /** Newly chosen (already shrunk) Aadhaar photo to upload on save. */
  private aadhaarPhoto: Blob | null = null;
  /** The account had a saved photo when the form opened. */
  private hadAadhaar = false;

  constructor() {
    addIcons({ eyeOutline, eyeOffOutline });
  }

  ngOnInit() {
    this.roles = this.auth.isAdmin() ? ['STUDENT', 'LIBRARIAN', 'ADMIN'] : ['STUDENT', 'LIBRARIAN'];
    if (this.user) {
      const u = this.user;
      this.form = {
        username: u.username, fullName: u.fullName, email: u.email ?? '', phone: u.phone ?? '',
        role: u.role, active: u.active, password: ''
      };
      this.loadAadhaar(u.id);
    }
  }

  ngOnDestroy() {
    this.showAadhaar('');
  }

  async onAadhaarPicked(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.aadhaarError.set('');
    try {
      // Larger than news photos so the card's number and text stay readable.
      this.aadhaarPhoto = await resizePhoto(file, 1600, 0.85);
      this.showAadhaar(URL.createObjectURL(this.aadhaarPhoto));
    } catch (err) {
      this.aadhaarError.set(err instanceof Error && err.message ? err.message : PHOTO_DECODE_ERROR);
    }
  }

  removeAadhaar() {
    this.aadhaarPhoto = null;
    this.showAadhaar('');
  }

  private loadAadhaar(userId: number) {
    this.aadhaarLoading.set(true);
    this.api.aadhaarPhoto(userId).subscribe({
      next: blob => {
        this.hadAadhaar = true;
        this.aadhaarLoading.set(false);
        this.showAadhaar(URL.createObjectURL(blob));
      },
      error: err => {
        this.aadhaarLoading.set(false);
        if (!(err instanceof HttpErrorResponse && err.status === 404)) {
          this.aadhaarError.set(errorMessage(err, 'Could not load the Aadhaar card photo.'));
        }
      }
    });
  }

  /** Swaps the shown photo, freeing the old object URL. */
  private showAadhaar(url: string) {
    if (this.aadhaarUrl()) {
      URL.revokeObjectURL(this.aadhaarUrl());
    }
    this.aadhaarUrl.set(url);
  }

  /** Upload a newly chosen photo, or delete the saved one if it was removed; null when nothing changed. */
  private aadhaarChange(userId: number): Observable<unknown> | null {
    if (this.aadhaarPhoto) {
      return this.api.saveAadhaarPhoto(userId, this.aadhaarPhoto);
    }
    if (this.hadAadhaar && !this.aadhaarUrl()) {
      return this.api.deleteAadhaarPhoto(userId);
    }
    return null;
  }

  get isSelf() {
    return this.user?.id === this.auth.user()?.id;
  }

  cancel() {
    this.modals.dismiss(null, 'cancel');
  }

  save() {
    const f = this.form;
    if (!f.fullName.trim() || !f.username.trim()) {
      this.error.set('Full name and username are required.');
      return;
    }
    if (!this.user && !f.password) {
      this.error.set('Set a password for the new account.');
      return;
    }
    if (f.password && f.password.length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }
    if (f.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      this.error.set('Enter a valid email address, or leave it empty.');
      return;
    }
    // Only check numbers being entered or changed, so old records with other formats can still be edited.
    if (f.phone && f.phone !== this.user?.phone && !/^\d{10}$/.test(f.phone)) {
      this.error.set('Phone must be a 10-digit mobile number.');
      return;
    }
    const request: UserRequest = {
      ...f,
      fullName: f.fullName.trim(),
      username: f.username.trim(),
      email: f.email?.trim() || undefined,
      phone: f.phone || undefined,
      password: f.password || undefined,
    };
    this.saving.set(true);
    this.error.set('');
    this.api.saveUser(request, this.user?.id).subscribe({
      next: saved => {
        const done = () => {
          this.ui.toast(this.user ? 'Account updated.' : 'Account created.');
          this.modals.dismiss(saved, 'saved');
        };
        const photo = this.aadhaarChange(saved.id);
        if (!photo) {
          done();
          return;
        }
        photo.subscribe({
          next: done,
          // The account is saved either way; close so a retry can't create it twice.
          error: err => {
            this.ui.error(err, 'Account saved, but the Aadhaar card photo could not be saved. Open the account to try again.');
            this.modals.dismiss(saved, 'saved');
          }
        });
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save the account.'));
      }
    });
  }

  async remove() {
    const user = this.user!;
    const ok = await this.ui.confirm('Delete account?', `${user.fullName} (${user.username}) will be permanently deleted.`, 'Delete', true);
    if (!ok) {
      return;
    }
    this.saving.set(true);
    this.api.deleteUser(user.id).subscribe({
      next: () => {
        this.ui.toast('Account deleted.');
        this.modals.dismiss(null, 'deleted');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not delete the account.'));
      }
    });
  }
}
