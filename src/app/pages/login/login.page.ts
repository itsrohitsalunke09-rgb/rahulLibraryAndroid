import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonButton, IonContent, IonInput, IonInputPasswordToggle, IonList, IonSpinner, IonText
} from '@ionic/angular';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/ui.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  imports: [FormsModule, RouterLink, IonContent, IonList, IonInput, IonInputPasswordToggle, IonButton, IonSpinner, IonText],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    if (inject(ActivatedRoute).snapshot.queryParamMap.has('expired')) {
      this.error.set('Your session has expired. Please sign in again.');
    }
  }

  submit() {
    if (!this.username.trim() || !this.password) {
      this.error.set('Enter your username and password.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
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
}
