import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSkeletonText, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { ellipsisVertical } from 'ionicons/icons';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { formatDate, localIsoDate } from '../../core/dates';
import { ProfileUpdate, roleLabel } from '../../core/models';
import { InitialsPipe } from '../../core/pipes';
import { UiService, errorMessage } from '../../core/ui.service';

@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  imports: [FormsModule, RouterLink, IonContent, IonIcon, IonSpinner, IonSkeletonText, InitialsPipe],
})
export class ProfilePage {
  private api = inject(ApiService);
  private ui = inject(UiService);
  protected auth = inject(AuthService);

  /** Stored at sign-in; no API call needed to show it. */
  readonly profile = inject(AuthService).profile;
  readonly saving = signal(false);
  /** The page opens read-only; Edit profile switches to the form. */
  readonly editing = signal(false);
  readonly error = signal('');
  readonly today = localIsoDate();
  readonly roleLabel = computed(() => roleLabel(this.auth.role()));

  form: ProfileUpdate = { fullName: '' };
  protected readonly formatDate = formatDate;

  constructor() {
    addIcons({ ellipsisVertical });
    // Fill the form from the stored profile now, and again whenever it is saved.
    effect(() => {
      if (this.profile()) {
        this.resetForm();
      }
    });
  }

  startEdit() {
    this.resetForm();
    this.error.set('');
    this.editing.set(true);
  }

  cancelEdit() {
    this.resetForm();
    this.error.set('');
    this.editing.set(false);
  }

  private resetForm() {
    const p = this.profile();
    if (p) {
      this.form = {
        fullName: p.fullName, email: p.email ?? '', phone: p.phone ?? '',
        dateOfBirth: p.dateOfBirth ?? '', address: p.address ?? ''
      };
    }
  }

  save() {
    if (!this.form.fullName.trim()) {
      this.error.set('Full name is required.');
      return;
    }
    if (this.form.phone && this.form.phone !== this.profile()?.phone && !/^\d{10}$/.test(this.form.phone)) {
      this.error.set('Phone must be a 10-digit mobile number.');
      return;
    }
    const update: ProfileUpdate = { ...this.form, fullName: this.form.fullName.trim() };
    this.saving.set(true);
    this.error.set('');
    this.api.updateProfile(update).subscribe({
      next: p => {
        this.saving.set(false);
        this.auth.updateProfile(p);
        this.editing.set(false);
        this.ui.toast('Profile updated.');
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save your profile.'));
      }
    });
  }

  async logout() {
    if (await this.ui.confirm('Sign out?', 'You will need your username and password to sign in again.', 'Sign out')) {
      this.auth.logout();
    }
  }
}
