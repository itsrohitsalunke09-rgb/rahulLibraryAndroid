import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/** Most the block grows when pulled (6%), approached gently so a long pull never distorts it. */
const MAX_STRETCH = 0.06;
/** Pull (px) that gives about two thirds of the full stretch. */
const PULL_SCALE = 220;

/** How much a pull of `px` stretches the block: 1 = none, easing towards 1 + MAX_STRETCH. */
export function stretchFor(px: number): number {
  return px > 0 ? 1 + MAX_STRETCH * (1 - Math.exp(-px / PULL_SCALE)) : 1;
}

/**
 * Android's overscroll stretch on a block inside ion-content: pulled down at the top (or up at the
 * bottom), it stretches from that edge, and springs back when let go. Normal scrolling is untouched.
 */
@Directive({ selector: '[appStretch]' })
export class StretchDirective {
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private scroller?: HTMLElement;
  private startY = 0;

  @HostListener('touchstart', ['$event'])
  async down(e: TouchEvent) {
    this.startY = e.touches[0].clientY;
    this.host.style.transition = 'none';
    this.scroller ??= await this.host.closest('ion-content')?.getScrollElement();
  }

  @HostListener('touchmove', ['$event'])
  move(e: TouchEvent) {
    const s = this.scroller;
    if (!s || e.touches.length !== 1 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const dy = e.touches[0].clientY - this.startY;
    const atTop = s.scrollTop <= 0;
    const atBottom = s.scrollTop + s.clientHeight >= s.scrollHeight - 1;
    const pull = dy > 0 && atTop ? dy : dy < 0 && atBottom ? -dy : 0;
    this.host.style.transformOrigin = dy > 0 ? 'center top' : 'center bottom';
    this.host.style.transform = pull ? `scaleY(${stretchFor(pull)})` : '';
  }

  @HostListener('touchend')
  @HostListener('touchcancel')
  up() {
    // A little past 1 on the way back reads as a spring.
    this.host.style.transition = 'transform 420ms cubic-bezier(0.2, 0.9, 0.3, 1.25)';
    this.host.style.transform = '';
  }
}
