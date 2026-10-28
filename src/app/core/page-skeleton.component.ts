import { Component, computed, input } from '@angular/core';

/**
 * Loading placeholder shaped like the page that is coming, tall enough to fill the screen:
 * - list: a count line and a card of rows (optionally an avatar circle and a chip on the right)
 * - cards: News story cards (photo, headline, date, two lines)
 * - register: the daily newspaper register (one group title, rows with a tick box and a price)
 * - report: the monthly report (group title, rows with an amount and the month's day cells, totals, export)
 * - strips: a magazine report (soft cards with a name, tally and the year's cells, export)
 * - moves: the book transactions report (two totals, a circle per student, rows with a pill)
 * - dashboard: under the real Books row, the tiles, blue card, paper tiles, Reports row and list
 * - form: labelled fields
 */
export type SkeletonKind = 'list' | 'cards' | 'register' | 'report' | 'strips' | 'moves' | 'dashboard' | 'form';

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
  /** list: the second line under each title (off for title-only rows, like कात्रणे). */
  readonly sub = input(true);
  /** list: rows per group, each under a heading (lists grouped by frequency); null = one card. */
  readonly groups = input<number[] | null>(null);
  /** Overrides the number of rows; the defaults fill a phone screen. */
  readonly rows = input<number | null>(null);

  readonly items = computed(() => {
    const n = this.rows() ?? this.groups()?.reduce((a, b) => a + b, 0)
      ?? { list: 9, cards: 3, register: 4, report: 4, strips: 3, moves: 5, dashboard: 3, form: 6 }[this.kind()];
    return Array.from({ length: n }, (_, i) => ({ title: TITLE[i % TITLE.length], sub: SUB[i % SUB.length] }));
  });

  /** list: the rows split into their groups (one group when not grouped). */
  readonly listGroups = computed(() => {
    const rows = this.items();
    let start = 0;
    return (this.groups() ?? [rows.length]).map(n => rows.slice(start, (start += n)));
  });

  /** A month of day cells (two lines of 16) and a year of week cells (two lines of 27). */
  readonly dayCells = Array.from({ length: 31 });
  readonly stripCells = Array.from({ length: 53 });
  /** Student circles of the books report, busiest first. */
  readonly bubbleSizes = [120, 96, 84, 72, 64, 56];
}
