import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

/** Toasts, confirmations and readable error messages shared by all pages. */
@Injectable({ providedIn: 'root' })
export class UiService {
  private toasts = inject(ToastController);
  private alerts = inject(AlertController);

  /** Green when something worked, red when it didn't (or needs the user to do something first). */
  async toast(message: string, kind: 'success' | 'error' = 'success') {
    const toast = await this.toasts.create({
      message, duration: kind === 'error' ? 3500 : 2500, position: 'top', cssClass: `toast-${kind}`,
    });
    await toast.present();
  }

  async error(err: unknown, fallback: string) {
    await this.toast(errorMessage(err, fallback), 'error');
  }

  /** A message that only needs reading: one OK button. */
  async alert(header: string, message: string) {
    const alert = await this.alerts.create({ header, message, buttons: ['OK'] });
    await alert.present();
    await alert.onDidDismiss();
  }

  async confirm(header: string, message: string, confirmText = 'OK', destructive = false): Promise<boolean> {
    const alert = await this.alerts.create({
      header,
      message,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: confirmText, role: 'confirm', cssClass: destructive ? 'alert-danger' : '' }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }
}

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Cannot reach the library server. Check your internet connection.';
    }
    if (err.error?.message) {
      return err.error.message;
    }
  }
  return fallback;
}
