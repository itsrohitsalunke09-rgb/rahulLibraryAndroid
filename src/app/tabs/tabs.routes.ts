import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { roleGuard } from '../core/guards';
import { STAFF_ROLES } from '../core/models';
import { PreloadFor } from '../core/role-preloading';
import { TabsPage } from './tabs.page';

/** Staff-only pages: guarded, and preloaded only for staff. */
const STAFF_ONLY = { canMatch: [roleGuard(STAFF_ROLES)], data: { preload: STAFF_ROLES satisfies PreloadFor } };

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/dashboard/dashboard.page').then(m => m.DashboardPage),
      },
      {
        path: 'catalog',
        loadComponent: () => import('../pages/catalog/catalog.page').then(m => m.CatalogPage),
      },
      {
        path: 'issues',
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/issues/issues.page').then(m => m.IssuesPage),
      },
      {
        path: 'people',
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/people/people.page').then(m => m.PeoplePage),
      },
      {
        path: 'config',
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/config/config.page').then(m => m.ConfigPage),
      },
      {
        path: 'config/categories',
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/config/categories.page').then(m => m.CategoriesPage),
      },
      {
        path: 'config/news',
        ...STAFF_ONLY,
        loadComponent: () => import('../pages/config/news.page').then(m => m.NewsPage),
      },
      {
        path: 'my-books',
        canMatch: [roleGuard(['STUDENT'])],
        data: { preload: ['STUDENT'] satisfies PreloadFor },
        loadComponent: () => import('../pages/my-books/my-books.page').then(m => m.MyBooksPage),
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
