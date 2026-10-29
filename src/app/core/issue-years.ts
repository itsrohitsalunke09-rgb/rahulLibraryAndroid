/** The first year every year dropdown offers. */
export const FIRST_YEAR = 1994;

/** This year back to 1994, newest first. Built here, so the dropdown opens at once. */
export function issueYears(today = new Date()): number[] {
  const latest = Math.max(today.getFullYear(), FIRST_YEAR);
  return Array.from({ length: latest - FIRST_YEAR + 1 }, (_, i) => latest - i);
}

/**
 * Opens the (hidden) year select as a dropdown under the chip or tab that was tapped.
 * Ionic places a select's popover under the select itself, so the select is moved over the tapped
 * element first; the tap event is still needed, or Ionic falls back to a centred dialog.
 */
export function openYearSelect(select: HTMLIonSelectElement | undefined, event: Event) {
  if (!select) {
    return;
  }
  const anchor = event.currentTarget;
  if (anchor instanceof HTMLElement) {
    const r = anchor.getBoundingClientRect();
    Object.assign(select.style, { top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px` });
  }
  return select.open(event as UIEvent);
}
