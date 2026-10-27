import { Component, computed, input } from '@angular/core';

/**
 * Loading placeholder shaped like the page that is coming, tall enough to fill the screen:
 * - list: a count line and a card of rows (optionally an avatar circle and a chip on the right)
 * - cards: News story cards (photo, headline, date, two lines)
 * - register: the daily newspaper register (group title, rows with a tick box and a price)
 * - report: the monthly report (group title, rows with an amount, totals, export button)
 * - dashboard: under the real Books row, the tiles, blue card, newspaper tiles and list
 * - form: labelled fields
 */
export type SkeletonKind = 'list' | 'cards' | 'register' | 'report' | 'dashboard' | 'form';

/** Row widths cycle through these, so the lines look like real text rather than a grid. */
const TITLE = [72, 58, 66, 80, 54, 62, 76, 60, 68, 56];
const SUB = [40, 32, 46, 36, 28, 44, 34, 38, 30, 42];

@Component({
  selector: 'app-page-skeleton',
  templateUrl: 'page-skeleton.component.html',
  styleUrls: ['page-skeleton.component.scss'],
  host: { role: 'status', 'aria-label': 'Loading', '[class]': '"kind-" + kind()', '[class.flush]': 'flush()' },
})
export class PageSkeletonComponent {
  readonly kind = input<SkeletonKind>('list');
  /** list: a circle before each row (People). */
  readonly avatar = input(false);
  /** list: a pill at the end of each row (Catalog availability, Issues status). */
  readonly chip = input(false);
  /** list: the count line above the card ("12 books"). */
  readonly count = input(true);
  /** list: no side margin, for pages that already pad their content (Profile). */
  readonly flush = input(false);
  /** Overrides the number of rows; the defaults fill a phone screen. */
  readonly rows = input<number | null>(null);

  readonly items = computed(() => {
    const n = this.rows() ?? { list: 9, cards: 3, register: 4, report: 4, dashboard: 3, form: 6 }[this.kind()];
    return Array.from({ length: n }, (_, i) => ({ title: TITLE[i % TITLE.length], sub: SUB[i % SUB.length] }));
  });
}
