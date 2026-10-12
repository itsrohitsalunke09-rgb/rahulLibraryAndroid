import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBadge, IonButton, IonContent, IonHeader, IonIcon, IonInput, IonInputPasswordToggle, IonList,
  IonListHeader, IonSkeletonText, IonSpinner, IonText, IonTextarea, IonTitle, IonToolbar, ViewWillEnter
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ProfileUpdate, UserAccount } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';

@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonListHeader, IonInput,
    IonInputPasswordToggle, IonTextarea, IonButton, IonIcon, IonBadge, IonSpinner, IonSkeletonText, IonText
  ],
})
export class ProfilePage implements ViewWillEnter {
  private api = inject(ApiService);
  private ui = inject(UiService);
  protected auth = inject(AuthService);

  readonly profile = signal<UserAccount | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly today = new Date().toISOString().slice(0, 10);

  form: ProfileUpdate = { fullName: '' };
  newPassword = '';
  confirmPassword = '';

  constructor() {
    addIcons({ logOutOutline });
  }

  ionViewWillEnter() {
    this.api.profile().subscribe({
      next: p => {
        this.form = {
          fullName: p.fullName, email: p.email ?? '', phone: p.phone ?? '',
          dateOfBirth: p.dateOfBirth ?? '', address: p.address ?? ''
        };
        this.profile.set(p);
      },
      error: err => this.error.set(errorMessage(err, 'Could not load your profile.'))
    });
  }

  initials() {
    const name = this.profile()?.fullName ?? this.auth.user()?.fullName ?? '';
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
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
    if (this.newPassword || this.confirmPassword) {
      if (this.newPassword.length < 6) {
        this.error.set('New password must be at least 6 characters.');
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.error.set('The two passwords do not match.');
        return;
      }
    }
    const update: ProfileUpdate = {
      ...this.form,
      fullName: this.form.fullName.trim(),
      password: this.newPassword || undefined,
    };
    this.saving.set(true);
    this.error.set('');
    this.api.updateProfile(update).subscribe({
      next: p => {
        this.saving.set(false);
        this.profile.set(p);
        this.auth.updateName(p.fullName);
        this.newPassword = '';
        this.confirmPassword = '';
        this.ui.toast(update.password ? 'Profile and password updated.' : 'Profile updated.');
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
