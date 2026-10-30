import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwipeTabsDirective } from './swipe-tabs.directive';

@Component({
  imports: [SwipeTabsDirective],
  template: `<div [appSwipeTabs]="['A', 'B', 'C']" [swipeCurrent]="tab()" (swipeTo)="tab.set($event)"></div>`,
})
class Host {
  readonly tab = signal('B');
}

describe('SwipeTabsDirective', () => {
  function swipe(el: HTMLElement, fromX: number, toX: number, toY = 300) {
    const touch = (x: number, y: number) => ({ clientX: x, clientY: y }) as Touch;
    el.dispatchEvent(Object.assign(new Event('touchstart'), { touches: [touch(fromX, 300)] }));
    el.dispatchEvent(Object.assign(new Event('touchend'), { changedTouches: [touch(toX, toY)] }));
  }

  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement.querySelector('div') as HTMLElement };
  }

  it('movesToTheNextTabOnALeftSwipeAndBackOnARightOne', () => {
    const { fixture, el } = render();
    swipe(el, 300, 150);
    expect(fixture.componentInstance.tab()).toBe('C');
    swipe(el, 300, 150);
    expect(fixture.componentInstance.tab()).toBe('C');
    swipe(el, 150, 300);
    swipe(el, 150, 300);
    expect(fixture.componentInstance.tab()).toBe('A');
  });

  it('ignoresShortMostlyUpDownAndEdgeSwipes', () => {
    const { fixture, el } = render();
    swipe(el, 300, 260);
    swipe(el, 300, 180, 600);
    swipe(el, 10, 200);
    expect(fixture.componentInstance.tab()).toBe('B');
  });
});
