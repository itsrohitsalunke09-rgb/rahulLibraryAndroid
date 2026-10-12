import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonInput, IonInputPasswordToggle, IonItem, IonList,
  IonSelect, IonSelectOption, IonSpinner, IonText, IonTitle, IonToggle, IonToolbar, ModalController
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Role, UserAccount, UserRequest } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';

@Component({
  selector: 'app-user-form',
  templateUrl: 'user-form.modal.html',
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonItem, IonInput,
    IonInputPasswordToggle, IonSelect, IonSelectOption, IonToggle, IonSpinner, IonText
  ],
  styles: [`ion-input, ion-select { margin-bottom: 12px; } .danger-zone { margin-top: 32px; }`],
})
export class UserFormModal implements OnInit {
  /** Account to edit; leave empty to create one. */
  @Input() user?: UserAccount;

  private api = inject(ApiService);
  private modals = inject(ModalController);
  private ui = inject(UiService);
  protected auth = inject(AuthService);

  form: UserRequest = { username: '', fullName: '', email: '', phone: '', role: 'STUDENT', active: true, password: '' };
  /** Librarians can't create or promote admins (enforced by the backend too). */
  roles: Role[] = [];
  readonly saving = signal(false);
  readonly error = signal('');

  ngOnInit() {
    this.roles = this.auth.isAdmin() ? ['STUDENT', 'LIBRARIAN', 'ADMIN'] : ['STUDENT', 'LIBRARIAN'];
    if (this.user) {
      const u = this.user;
      this.form = {
        username: u.username, fullName: u.fullName, email: u.email ?? '', phone: u.phone ?? '',
        role: u.role, active: u.active, password: ''
      };
    }
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
        this.ui.toast(this.user ? 'Account updated.' : 'Account created.');
        this.modals.dismiss(saved, 'saved');
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
