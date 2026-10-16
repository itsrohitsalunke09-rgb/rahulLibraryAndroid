import { ActivatedRoute, Router } from '@angular/router';

/**
 * Removes the filter query params a link opened this page with (e.g. Dashboard → Issues
 * ?status=OVERDUE&year=2026), once the page has applied them. Ionic tabs remember each tab's
 * last URL, so without this, coming back to the tab later would re-apply the link's filters
 * over whatever the user chose since.
 */
export function clearLinkFilters(router: Router, route: ActivatedRoute) {
  router.navigate([], { relativeTo: route, queryParams: {}, replaceUrl: true });
}
