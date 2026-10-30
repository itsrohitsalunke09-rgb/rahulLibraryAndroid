import { Component, input, output } from '@angular/core';

/** One filter tab drawn as a card: the count on top (when the list has counts), the name under it. */
export interface FilterCard {
  value: string;
  label: string;
  /** undefined = no count line; null = still loading ("–"). */
  count?: number | null;
  /** A small line under the name, e.g. "all years". */
  sub?: string;
  /** Background: neutral, blue (out), rust (late), green (back). */
  tone?: 'all' | 'out' | 'late' | 'back';
  /** Name in Devanagari (the Marathi font). */
  marathi?: boolean;
  /** A ▾ after the name: tapping opens a picker too (Issues' year). */
  caret?: boolean;
}

/**
 * The app's filter tabs, as the member profile's cards: a row of tinted cards, the chosen one outlined.
 * (picked) gives the card's value and the click event (for a picker opened from it).
 */
@Component({
  selector: 'app-filter-cards',
  template: `
    <div class="cards" role="tablist" [style.--cols]="cards().length">
      @for (c of cards(); track c.value) {
        <button type="button" role="tab" [class]="'card tone-' + (c.tone ?? 'all')" [class.on]="c.value === value()"
                [attr.aria-selected]="c.value === value()" (click)="picked.emit({ value: c.value, event: $event })">
          @if (c.count !== undefined) {
            <strong>{{ c.count ?? '–' }}</strong>
          }
          <span class="name" [class.marathi]="c.marathi" [attr.lang]="c.marathi ? 'mr' : null">
            {{ c.label }}
            @if (c.caret) {
              <span class="icon caret" style="--icon: url(assets/icons/chevron-down.svg)" aria-hidden="true"></span>
            }
          </span>
          @if (c.sub) {
            <small>{{ c.sub }}</small>
          }
        </button>
      }
    </div>
  `,
  styles: `
    .cards {
      display: grid;
      grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr));
      gap: 8px;
      padding: 4px 16px 10px;
    }

    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      padding: 8px 4px;
      border: 2px solid transparent;
      border-radius: var(--app-radius-sheet);
      background: var(--app-mint-soft);
      color: var(--app-muted);
      font: inherit;
      font-size: 12px;
      line-height: 1.2;
      text-align: center;
      cursor: pointer;
      transition: border-color 160ms ease, transform 120ms ease;

      &:active { transform: scale(0.97); }
      &.on { border-color: var(--app-ink); color: var(--app-ink); }
    }

    .tone-out { background: var(--app-accent-soft); }
    .tone-late { background: var(--app-rust-soft); }
    .tone-back { background: var(--app-success-soft); }

    strong {
      font-size: 20px;
      font-weight: 600;
      color: var(--app-ink);
    }

    .name {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    .caret { --icon-size: 12px; }

    small { font-size: 10px; }
  `,
})
export class FilterCardsComponent {
  readonly cards = input.required<readonly FilterCard[]>();
  /** The chosen card's value. */
  readonly value = input.required<string>();
  readonly picked = output<{ value: string; event: Event }>();
}
