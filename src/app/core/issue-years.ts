import { WritableSignal } from '@angular/core';
import { IonSelect } from '@ionic/angular';
import { ApiService } from './api.service';

/** Fetches the years that have issues into `years`. On failure keeps the last list, or offers this year if there was none. */
export function loadIssueYears(api: ApiService, years: WritableSignal<number[]>): Promise<void> {
  return new Promise(resolve => api.issueYears().subscribe({
    next: list => { years.set(list); resolve(); },
    error: () => {
      if (!years().length) {
        years.set([new Date().getFullYear()]);
      }
      resolve();
    }
  }));
}

/** Fetches the years fresh (so new issues show up), then opens the year dropdown. */
export async function openYearSelect(api: ApiService, years: WritableSignal<number[]>, select: () => IonSelect | undefined) {
  await loadIssueYears(api, years);
  // Let the year options render before the dropdown reads them.
  await new Promise(resolve => setTimeout(resolve));
  await select()?.open();
}
