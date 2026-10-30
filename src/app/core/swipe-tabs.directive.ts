import { Directive, ElementRef, HostListener, inject, input, output } from '@angular/core';

/** A swipe must cover this much sideways (px), and be mostly sideways, to change the filter. */
const MIN_SWIPE = 60;
/** Swipes starting this close to the screen's edge are left to the phone's back gesture. */
const EDGE = 24;

/**
 * Swipe a list sideways to move to the next or previous filter tab, as if tapping it.
 * Usage: `<ion-content [appSwipeTabs]="['A', 'B']" [swipeCurrent]="tab()" (swipeTo)="setTab($event)">`.
 */
@Directive({ selector: '[appSwipeTabs]' })
export class SwipeTabsDirective {
  /** The filter tabs, in the order they appear. */
  readonly appSwipeTabs = input.required<readonly string[]>();
  readonly swipeCurrent = input.required<string>();
  /** What slides in on a swipe; the whole host when unset. Give the list, so cards above it stay put. */
  readonly swipeSlide = input<HTMLElement | null>(null);
  readonly swipeTo = output<string>();

  private start?: { x: number; y: number };

  @HostListener('touchstart', ['$event'])
  down(e: TouchEvent) {
    const t = e.touches[0];
    // One finger only, and not from the edge (the phone's own back swipe).
    this.start = e.touches.length === 1 && t.clientX > EDGE && t.clientX < window.innerWidth - EDGE
      ? { x: t.clientX, y: t.clientY }
      : undefined;
  }

  @HostListener('touchend', ['$event'])
  up(e: TouchEvent) {
    const start = this.start;
    this.start = undefined;
    const t = e.changedTouches[0];
    if (!start || !t) {
      return;
    }
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < MIN_SWIPE || Math.abs(dx) < 2 * Math.abs(dy)) {
      return;
    }
    const tabs = this.appSwipeTabs();
    const next = tabs.indexOf(this.swipeCurrent()) + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < tabs.length) {
      this.swipeTo.emit(tabs[next]);
      this.slideIn(dx < 0 ? 1 : -1);
    }
  }

  /** The new tab's list slides in from the side the finger came from. */
  private slideIn(from: 1 | -1) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    (this.swipeSlide() ?? this.host.nativeElement).animate?.(
      [{ transform: `translateX(${from * 48}px)`, opacity: 0.4 }, { transform: 'none', opacity: 1 }],
      { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
  }

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
}
