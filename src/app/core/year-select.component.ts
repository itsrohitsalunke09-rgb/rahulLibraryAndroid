import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { IonSelect, IonSelectOption } from '@ionic/angular';
import { issueYears, openYearSelect } from './issue-years';

/**
 * The app's one year dropdown (Dashboard, Issues, report PDFs): this year back to 1994, opened as a short
 * scrolling list under whatever was tapped. Call open(event) from that chip or button; (yearChange)
 * gives the picked year. With no value (a one-off pick, like a PDF's year) it is ready again each time.
 */
@Component({
  selector: 'app-year-select',
  template: `
    <ion-select #select class="year-select" interface="popover" [attr.aria-label]="label()"
                [interfaceOptions]="{ cssClass: 'year-popover' }" [value]="value()" (ionChange)="picked($event.detail.value)">
      @for (y of years; track y) {
        <ion-select-option [value]="y">{{ y }}</ion-select-option>
      }
    </ion-select>
  `,
  styles: [`
    /* The list opens from a chip or button; the select itself stays out of sight. */
    .year-select {
      position: fixed;
      top: 0;
      left: 0;
      width: 1px;
      height: 1px;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
    }
  `],
  imports: [IonSelect, IonSelectOption],
})
export class YearSelectComponent {
  /** The year shown as picked; null for a one-off pick. */
  readonly value = input<number | null>(null);
  readonly label = input('Year');
  readonly yearChange = output<number>();
  readonly years = issueYears();
  private select = viewChild.required('select', { read: ElementRef<HTMLIonSelectElement> });

  open(event: Event) {
    return openYearSelect(this.select().nativeElement, event);
  }

  picked(value: unknown) {
    const year = Number(value);
    if (!Number.isInteger(year) || year <= 0) {
      return;
    }
    if (this.value() == null) {
      // Clear the pick, so the same year can be picked again next time.
      this.select().nativeElement.value = null;
    }
    this.yearChange.emit(year);
  }
}
