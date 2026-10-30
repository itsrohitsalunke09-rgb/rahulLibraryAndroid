import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { permissionGuard, roleGuard } from '../core/guards';
import { STAFF_ROLES } from '../core/models';
import { PreloadFor } from '../core/role-preloading';
import { TabsPage } from './tabs.page';

/** Staff-only pages: guarded, and preloaded only for staff. */
const STAFF_ONLY = { canMatch: [roleGuard(STAFF_ROLES)], data: { preload: STAFF_ROLES satisfies PreloadFor } };
/** The masters (Profile › ⋮): admins only. */
const ADMIN_ONLY = { canMatch: [roleGuard(['ADMIN'])], data: { preload: ['ADMIN'] satisfies PreloadFor } };
/** Screens that show data: need Read in Roles & permissions. */
const READ = { canActivate: [permissionGuard('READ')] };

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/dashboard/dashboard.page').then(m => m.DashboardPage),
      },
      {
        path: 'catalog',
        ...READ,
        loadComponent: () => import('../pages/catalog/catalog.page').then(m => m.CatalogPage),
      },
      {
        path: 'news',
        ...READ,
        loadComponent: () => import('../pages/news/news.page').then(m => m.NewspaperPage),
      },
      {
        // Issues & returns has no tab now (Catalog took its place): it opens from the Dashboard's cards.
        path: 'dashboard/issues',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/issues/issues.page').then(m => m.IssuesPage),
      },
      {
        path: 'issues',
        redirectTo: 'dashboard/issues',
      },
      {
        path: 'people',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/people/people.page').then(m => m.PeoplePage),
      },
      {
        path: 'config',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/config/config.page').then(m => m.ConfigPage),
      },
      {
        // Registers › सभासद: every student, with their books, issuing and account.
        path: 'config/members',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/config/members.page').then(m => m.MembersPage),
      },
      {
        // Registers › ग्रंथ दाखल नोंदवही: the Catalog for staff (they have no Catalog tab).
        path: 'config/catalog',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/catalog/catalog.page').then(m => m.CatalogPage),
      },
      {
        path: 'profile/masters',
        ...ADMIN_ONLY,
        loadComponent: () => import('../pages/config/masters.page').then(m => m.MastersPage),
      },
      {
        path: 'profile/masters/categories',
        ...ADMIN_ONLY,
        loadComponent: () => import('../pages/config/categories.page').then(m => m.CategoriesPage),
      },
      {
        path: 'profile/masters/news',
        ...ADMIN_ONLY,
        loadComponent: () => import('../pages/config/news.page').then(m => m.NewsPage),
      },
      {
        path: 'profile/masters/periodicals',
        ...ADMIN_ONLY,
        loadComponent: () => import('../pages/config/periodicals.page').then(m => m.PeriodicalsPage),
      },
      {
        path: 'config/periodicals/register',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/config/periodical-register.page').then(m => m.PeriodicalRegisterPage),
      },
      {
        path: 'config/periodicals/report',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/config/periodical-report.page').then(m => m.PeriodicalReportPage),
      },
      {
        path: 'config/periodicals/magazines',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/config/magazine-register.page').then(m => m.MagazineRegisterPage),
      },
      {
        path: 'config/periodicals/magazines/:frequency',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/config/magazine-register.page').then(m => m.MagazineRegisterPage),
      },
      // Reports live under the Dashboard tab, so back stays in it.
      {
        path: 'dashboard/reports',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/reports/reports.page').then(m => m.ReportsPage),
      },
      {
        path: 'dashboard/reports/DAILY',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/config/periodical-report.page').then(m => m.PeriodicalReportPage),
      },
      {
        // The same screens as under Registers, opened from the Dashboard's cards: kept in the Dashboard's
        // tab so Back returns to the Dashboard (not to Registers).
        path: 'dashboard/register',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/config/periodical-register.page').then(m => m.PeriodicalRegisterPage),
      },
      {
        path: 'dashboard/catalog',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/catalog/catalog.page').then(m => m.CatalogPage),
      },
      {
        path: 'dashboard/members',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/config/members.page').then(m => m.MembersPage),
      },
      {
        // Students' book requests and suggestions (from the Dashboard card).
        path: 'dashboard/requests',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/dashboard/reader-requests.page').then(m => m.ReaderRequestsPage),
      },
      {
        path: 'dashboard/reports/galaxy',
        ...STAFF_ONLY,
        ...READ,
        loadComponent: () => import('../pages/reports/galaxy.page').then(m => m.GalaxyPage),
      },
      {
        path: 'dashboard/reports/BOOKS',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/reports/book-report.page').then(m => m.BookReportPage),
      },
      {
        path: 'dashboard/reports/:frequency',
        ...READ,
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/reports/magazine-report.page').then(m => m.MagazineReportPage),
      },
      {
        path: 'profile/masters/clippings',
        ...ADMIN_ONLY,
        loadComponent: () => import('../pages/config/clippings.page').then(m => m.ClippingsPage),
      },
      {
        path: 'profile/masters/assets',
        ...ADMIN_ONLY,
        loadComponent: () => import('../pages/config/assets.page').then(m => m.AssetsPage),
      },
      {
        path: 'profile/masters/permissions',
        ...ADMIN_ONLY,
        loadComponent: () => import('../pages/config/permissions.page').then(m => m.PermissionsPage),
      },
      {
        path: 'profile/masters/about',
        ...ADMIN_ONLY,
        loadComponent: () => import('../pages/config/about-master.page').then(m => m.AboutMasterPage),
      },
      {
        path: 'my-books',
        ...READ,
        canMatch: [roleGuard(['STUDENT'])],
        data: { preload: ['STUDENT'] satisfies PreloadFor },
        loadComponent: () => import('../pages/my-books/my-books.page').then(m => m.MyBooksPage),
      },
      {
        // Students reach the Reading Galaxy from My books, their own planet twinkles and only it opens.
        path: 'my-books/galaxy',
        canMatch: [roleGuard(['STUDENT'])],
        ...READ,
        loadComponent: () => import('../pages/reports/galaxy.page').then(m => m.GalaxyPage),
      },
      {
        path: 'no-access',
        loadComponent: () => import('../pages/no-access/no-access.page').then(m => m.NoAccessPage),
      },
      {
        // The Reading Galaxy tab, for staff and students; the tab bar stays.
        path: 'galaxy',
        ...READ,
        loadComponent: () => import('../pages/reports/galaxy.page').then(m => m.GalaxyPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('../pages/profile/profile.page').then(m => m.ProfilePage),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => inject(AuthService).homeUrl(),
      },
    ],
  },
];
