import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

/** Toasts, confirmations and readable error messages shared by all pages. */
@Injectable({ providedIn: 'root' })
export class UiService {
  private toasts = inject(ToastController);
  private alerts = inject(AlertController);

  async toast(message: string, color: 'success' | 'danger' | 'medium' = 'success') {
    const toast = await this.toasts.create({ message, color, duration: 2500, position: 'top' });
    await toast.present();
  }

  async error(err: unknown, fallback: string) {
    await this.toast(errorMessage(err, fallback), 'danger');
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
