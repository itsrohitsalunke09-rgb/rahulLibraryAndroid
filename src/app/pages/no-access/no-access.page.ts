import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/** Shown instead of a screen the signed-in role isn't allowed to see (Roles & permissions). */
@Component({
  selector: 'app-no-access',
  template: `
    <ion-header><ion-toolbar><ion-title>Not available</ion-title></ion-toolbar></ion-header>
    <ion-content>
      <div class="empty-state">
        <span class="icon empty-icon" style="--icon: url(assets/icons/field-lock.svg)" aria-hidden="true"></span>
        <h2>You don't have permission to see this</h2>
        <p>Ask the library admin to give your role access in Roles &amp; permissions.</p>
        <a class="link" routerLink="/tabs/profile">Go to Profile</a>
      </div>
    </ion-content>
  `,
  styles: [`
    .empty-icon { display: block; margin: 0 auto 16px; --icon-size: 32px; color: var(--app-ink); }
    .link { display: inline-block; margin-top: 14px; color: var(--app-accent); font-weight: 600; text-decoration: none; }
  `],
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent],
})
export class NoAccessPage {}
