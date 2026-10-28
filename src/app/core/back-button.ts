import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NavController, Platform } from '@ionic/angular';
import { AuthService } from './auth.service';

/**
 * Where Android's back button / back gesture goes once nothing is open and the page has no
 * page behind it: from a deep page up to its tab, from another tab to the home tab, and from
 * home (or the sign-in screens) out of the app.
 */
export function backTarget(path: string, home: string): 'exit' | string {
  const parts = path.split(/[?#]/)[0].split('/').filter(Boolean);
  if (parts[0] !== 'tabs') {
    // Sign-in, forgot password, about: back from login leaves; the others return to login.
    return parts[0] === 'login' || !parts.length ? 'exit' : '/login';
  }
  if (parts.length > 2) {
    return `/tabs/${parts[1]}`;
  }
  return `/${parts.join('/')}` === home ? 'exit' : home;
}

/**
 * Turns on Android back handling. Capacitor only hands the back press to the page when the app
 * listens for it. Then: close an open popup or alert, else go back a page, else backTarget().
 */
export function setUpBackButton() {
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }
  const router = inject(Router);
  const nav = inject(NavController);
  const auth = inject(AuthService);
  void App.addListener('backButton', () => undefined);
  // Popups and alerts (priority 100+) close first. Then this replaces Ionic's page back (0),
  // which always passes on to the next handler and so can't be followed by a fallback.
  inject(Platform).backButton.subscribeWithPriority(1, async () => {
    if (await nav.pop()) {
      return;
    }
    const target = backTarget(router.url, auth.user() ? auth.homeUrl() : '/login');
    if (target === 'exit') {
      void App.exitApp();
    } else {
      void nav.navigateRoot(target, { animationDirection: 'back' });
    }
  });
}
