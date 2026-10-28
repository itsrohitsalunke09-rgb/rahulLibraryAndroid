import { TestBed } from '@angular/core/testing';
import { PageSkeletonComponent, SkeletonKind } from './page-skeleton.component';

describe('PageSkeletonComponent', () => {
  function render(inputs: Partial<{ kind: SkeletonKind; avatar: boolean; chip: boolean; count: boolean; rows: number }>) {
    const fixture = TestBed.createComponent(PageSkeletonComponent);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('fillsAScreenWithListRowsByDefaultAndAnnouncesLoading', () => {
    const el = render({});
    expect(el.getAttribute('role')).toBe('status');
    expect(el.classList.contains('kind-list')).toBe(true);
    expect(el.querySelectorAll('.row').length).toBe(9);
    expect(el.querySelector('.count')).not.toBeNull();
  });

  it('addsAvatarsAndChipsOnlyWhenAsked', () => {
    const plain = render({ count: false });
    expect(plain.querySelector('.avatar')).toBeNull();
    expect(plain.querySelector('.pill')).toBeNull();
    expect(plain.querySelector('.count')).toBeNull();
    const people = render({ avatar: true, chip: true, rows: 4 });
    expect(people.querySelectorAll('.avatar').length).toBe(4);
    expect(people.querySelectorAll('.pill').length).toBe(4);
  });

  it('drawsTheShapeOfEachKindOfPage', () => {
    expect(render({ kind: 'cards' }).querySelectorAll('.photo').length).toBe(3);
    expect(render({ kind: 'register' }).querySelectorAll('.box').length).toBe(4);
    expect(render({ kind: 'dashboard' }).querySelectorAll('.tile').length).toBe(4);
    expect(render({ kind: 'form', rows: 5 }).querySelectorAll('.field').length).toBe(5);
  });
});
