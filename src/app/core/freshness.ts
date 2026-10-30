import { signal } from '@angular/core';

/** How long data shown on a tab counts as current when the user comes back to it. */
const MAX_AGE = 30 * 1000;

/** Bumped by ApiService after every successful save, delete, issue or return. */
const changes = signal(0);

export function markDataChanged() {
  changes.update(n => n + 1);
}

/**
 * Remembers when some data was loaded, so a tab can skip reloading on every visit.
 * Data is stale once it is older than MAX_AGE or anything was changed through the app since.
 */
export class Freshness {
  /** maxAge: how long (ms) loaded data counts as current on a revisit. */
  constructor(private maxAge = MAX_AGE) {}

  private loadedAt = 0;
  private seenChanges = -1;

  /** Call when a load starts; changes made while it is in flight still make it stale. */
  mark() {
    this.loadedAt = Date.now();
    this.seenChanges = changes();
  }

  /** Call when a load fails, so the next visit tries again. */
  invalidate() {
    this.loadedAt = 0;
  }

  isStale() {
    return this.seenChanges !== changes() || Date.now() - this.loadedAt > this.maxAge;
  }
}
