import { of } from 'rxjs';
import { markDataChanged } from './freshness';
import { Page } from './models';
import { PAGE_SIZE, PagedList } from './paged-list';

/** A fake endpoint over the numbers 0..total-1. */
function endpoint(total: number) {
  const calls: { page: number; size: number }[] = [];
  const fetch = (page: number, size: number) => {
    calls.push({ page, size });
    const content = Array.from({ length: total }, (_, i) => i).slice(page * size, (page + 1) * size);
    const result: Page<number> = {
      content, totalElements: total, totalPages: Math.ceil(total / size), size, number: page,
      first: page === 0, last: (page + 1) * size >= total
    };
    return of(result);
  };
  return { fetch, calls };
}

/** Stands in for ion-infinite-scroll's event. */
const scrollEvent = () => ({ target: { complete: () => undefined } }) as never;

describe('PagedList', () => {
  afterEach(() => vi.useRealTimers());

  it('loads on the first visit', () => {
    const { fetch, calls } = endpoint(50);
    const list = new PagedList(fetch);
    expect(list.revisit()).toBe(true);
    expect(calls).toEqual([{ page: 0, size: PAGE_SIZE }]);
    expect(list.items().length).toBe(PAGE_SIZE);
  });

  it('does not reload when coming back soon after', () => {
    const { fetch, calls } = endpoint(50);
    const list = new PagedList(fetch);
    list.revisit();
    expect(list.revisit()).toBe(false);
    expect(calls.length).toBe(1);
  });

  it('reloads after the data was changed through the app', () => {
    const { fetch, calls } = endpoint(50);
    const list = new PagedList(fetch);
    list.revisit();
    markDataChanged();
    expect(list.revisit()).toBe(true);
    expect(calls.length).toBe(2);
  });

  it('reloads once 30 seconds have passed', () => {
    vi.useFakeTimers();
    const { fetch } = endpoint(50);
    const list = new PagedList(fetch);
    list.revisit();
    vi.advanceTimersByTime(29_000);
    expect(list.revisit()).toBe(false);
    vi.advanceTimersByTime(2_000);
    expect(list.revisit()).toBe(true);
  });

  it('reloads every row already shown in one request, and keeps paging in step', () => {
    vi.useFakeTimers();
    const { fetch, calls } = endpoint(100);
    const list = new PagedList(fetch);
    list.revisit();
    list.more(scrollEvent());
    list.more(scrollEvent());
    expect(list.items().length).toBe(60);

    vi.advanceTimersByTime(31_000);
    list.revisit();
    expect(calls.at(-1)).toEqual({ page: 0, size: 60 });
    expect(list.items().length).toBe(60);

    list.more(scrollEvent());
    expect(calls.at(-1)).toEqual({ page: 3, size: PAGE_SIZE });
    expect(list.items()).toEqual(Array.from({ length: 80 }, (_, i) => i));
  });
});
