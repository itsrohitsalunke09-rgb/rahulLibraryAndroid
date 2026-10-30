import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBack, eyeOutline, lockClosedOutline, mailOutline } from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/ui.service';

/** Seconds before another code can be asked for (the server enforces the same). */
const RESEND_AFTER = 60;

/**
 * Forgot password, in the login screen's look: the email gets a 6-digit code, and the code
 * with a new password resets it. Then the user signs in as usual.
 */
@Component({
  selector: 'app-forgot-password',
  templateUrl: 'forgot-password.page.html',
  styleUrls: ['../login/login.page.scss', 'forgot-password.page.scss'],
  imports: [FormsModule, IonContent, IonIcon, IonSpinner],
})
export class ForgotPasswordPage implements OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly step = signal<'email' | 'code'>('email');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);
  /** Seconds until "Send a new code" works again. */
  readonly resendIn = signal(0);

  email = '';
  code = '';
  password = '';
  confirm = '';
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    addIcons({ arrowBack, eyeOutline, lockClosedOutline, mailOutline });
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  submit() {
    if (this.step() === 'email') {
      this.sendCode();
    } else {
      this.reset();
    }
  }

  sendCode() {
    const email = this.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.error.set('Enter the email address on your account.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.sendResetCode(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('code');
        this.startResendTimer();
      },
      error: err => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Could not send the code. Please try again.'));
      }
    });
  }

  resend() {
    if (this.resendIn() === 0 && !this.loading()) {
      this.code = '';
      this.sendCode();
    }
  }

  changeEmail() {
    clearInterval(this.timer);
    this.resendIn.set(0);
    this.code = '';
    this.error.set('');
    this.step.set('email');
  }

  backToLogin() {
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private reset() {
    const code = this.code.trim();
    if (!/^\d{6}$/.test(code)) {
      this.error.set('Enter the 6-digit code from the email.');
      return;
    }
    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }
    if (this.password !== this.confirm) {
      this.error.set("The two passwords don't match.");
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.resetPassword(this.email.trim(), code, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/login'], { replaceUrl: true, queryParams: { reset: 1 } });
      },
      error: err => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Could not change the password. Please try again.'));
      }
    });
  }

  private startResendTimer() {
    clearInterval(this.timer);
    this.resendIn.set(RESEND_AFTER);
    this.timer = setInterval(() => {
      this.resendIn.update(s => Math.max(0, s - 1));
      if (this.resendIn() === 0) {
        clearInterval(this.timer);
      }
    }, 1000);
  }
}
