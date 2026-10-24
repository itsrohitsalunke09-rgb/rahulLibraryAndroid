import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonContent, IonIcon, IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { eyeOutline } from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { UiService, errorMessage } from '../../core/ui.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  imports: [FormsModule, RouterLink, IonContent, IonIcon, IonSpinner],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private ui = inject(UiService);

  username = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);
  /** Good news shown above the button, e.g. after a password reset. */
  readonly notice = signal('');

  constructor() {
    addIcons({ eyeOutline });
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    if (params.has('expired')) {
      this.error.set('Your session has expired. Please sign in again.');
    }
    if (params.has('reset')) {
      this.notice.set('Password changed. Sign in with your new password.');
    }
  }

  submit() {
    if (!this.username.trim() || !this.password) {
      this.error.set('Enter your username and password.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.notice.set('');
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.password = '';
        this.router.navigateByUrl(this.auth.homeUrl(), { replaceUrl: true });
      },
      error: err => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Could not sign in. Check your username and password.'));
      }
    });
  }

  forgotPassword() {
    this.router.navigateByUrl('/forgot-password');
  }

  // Placeholder until the About page is built.
  aboutUs() {
    this.ui.toast('The About page is coming soon.', 'medium');
  }
}
