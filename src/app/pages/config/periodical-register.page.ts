import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar, ViewWillEnter
} from '@ionic/angular';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { formatDate, localIsoDate } from '../../core/dates';
import { FREQUENCY_LABELS, RegisterRow, byFrequency, rupees, tel } from '../../core/models';
import { UiService, errorMessage } from '../../core/ui.service';
import { PageSkeletonComponent } from '../../core/page-skeleton.component';

/** One editable line: price is a string while typing. */
type Line = RegisterRow & { priceText: string };

/** Daily arrival register: tick what came today and what each copy cost. */
@Component({
  selector: 'app-periodical-register',
  templateUrl: 'periodical-register.page.html',
  styleUrls: ['periodical-register.page.scss'],
  imports: [
    FormsModule, RouterLink, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton, IonContent, IonSpinner,
    PageSkeletonComponent
  ],
})
export class PeriodicalRegisterPage implements ViewWillEnter {
  private api = inject(ApiService);
  private ui = inject(UiService);
  protected auth = inject(AuthService);

  readonly today = localIsoDate();
  readonly date = signal(this.today);
  readonly lines = signal<Line[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  /** Ticks or prices changed since the day was loaded or saved. */
  readonly dirty = signal(false);
  readonly labels = FREQUENCY_LABELS;
  /** A card per frequency, daily first; same line objects, so ticks still land in lines(). */
  readonly groups = computed(() => byFrequency(this.lines()));
  readonly rupees = rupees;
  readonly formatDate = formatDate;
  readonly tel = tel;

  ionViewWillEnter() {
    if (!this.dirty()) {
      this.load();
    }
  }

  /** Total cost of the ticked copies. */
  total() {
    return this.lines().filter(l => l.arrived).reduce((sum, l) => sum + (Number(l.priceText) || 0), 0);
  }

  ticked() {
    return this.lines().filter(l => l.arrived).length;
  }

  /** Opens another day; returns false when it stays on this one (future date, or unsaved ticks kept). */
  async goTo(date: string): Promise<boolean> {
    if (!date || date > this.today || date === this.date()) {
      return false;
    }
    if (this.dirty() && !(await this.ui.confirm('Leave without saving?', 'Your ticks for this day are not saved yet.', 'Leave'))) {
      return false;
    }
    this.date.set(date);
    this.load();
    return true;
  }

  /** The date box: if the day doesn't change, put the box back to the day shown. */
  async pickDate(input: HTMLInputElement) {
    if (!(await this.goTo(input.value))) {
      input.value = this.date();
    }
  }

  shift(days: number) {
    const d = new Date(this.date() + 'T00:00:00');
    d.setDate(d.getDate() + days);
    this.goTo(localIsoDate(d));
  }

  tickAll() {
    this.lines().forEach(l => (l.arrived = true));
    this.changed();
  }

  changed() {
    this.dirty.set(true);
  }

  save() {
    const bad = this.lines().find(l => l.arrived && !(Number(l.priceText) >= 0 && l.priceText.trim() !== ''));
    if (bad) {
      this.error.set(`Enter the price for ${bad.name}.`);
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const entries = this.lines().map(l => ({ periodicalId: l.periodicalId, arrived: l.arrived, price: l.arrived ? Number(l.priceText) : null }));
    this.api.savePeriodicalRegister(this.date(), entries).subscribe({
      next: day => {
        this.saving.set(false);
        this.show(day.rows);
        this.ui.toast(`Register saved for ${formatDate(this.date())}.`);
      },
      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err, 'Could not save the register.'));
      }
    });
  }

  private load() {
    this.loading.set(true);
    this.error.set('');
    const date = this.date();
    this.api.periodicalRegister(date).subscribe({
      next: day => {
        if (date === this.date()) {
          this.show(day.rows);
        }
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(errorMessage(err, 'Could not load the register.'));
      }
    });
  }

  private show(rows: RegisterRow[]) {
    this.lines.set(rows.map(r => ({ ...r, priceText: String(r.price) })));
    this.dirty.set(false);
  }
}
