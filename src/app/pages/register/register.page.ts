import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { RegistrationRequest } from '../../core/models';
import { errorMessage } from '../../core/ui.service';

@Component({
  selector: 'app-register',
  templateUrl: 'register.page.html',
  styleUrls: ['register.page.scss'],
  imports: [
    FormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonIcon, IonButton,
    IonSpinner
  ],
})
export class RegisterPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  form: RegistrationRequest = {
    fullName: '', dateOfBirth: '', address: '', phone: '', email: '', username: '', password: ''
  };
  readonly today = new Date().toISOString().slice(0, 10);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  constructor() {
    addIcons({ eyeOutline, eyeOffOutline });
  }

  submit() {
    const problem = this.validate();
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const data = { ...this.form, username: this.form.username.trim(), email: this.form.email.trim() };
    this.auth.register(data).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl(this.auth.homeUrl(), { replaceUrl: true });
      },
      error: err => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Could not create your account. Please try again.'));
      }
    });
  }

  // Same rules as the website's registration form.
  private validate(): string {
    const f = this.form;
    if (!f.fullName.trim() || !f.dateOfBirth || !f.address.trim() || !f.phone || !f.email.trim()
        || !f.username.trim() || !f.password) {
      return 'Please fill in all fields.';
    }
    if (f.dateOfBirth >= this.today) {
      return 'Date of birth must be in the past.';
    }
    if (!/^\d{10}$/.test(f.phone)) {
      return 'Enter a 10-digit mobile number.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      return 'Enter a valid email address.';
    }
    if (f.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    return '';
  }
}
