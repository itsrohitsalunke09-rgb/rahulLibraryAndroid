import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { roleGuard } from '../core/guards';
import { STAFF_ROLES } from '../core/models';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        canMatch: [roleGuard(STAFF_ROLES)],
        loadComponent: () => import('../pages/dashboard/dashboard.page').then(m => m.DashboardPage),
      },
      {
        path: 'catalog',
        loadComponent: () => import('../pages/catalog/catalog.page').then(m => m.CatalogPage),
      },
      {
        path: 'issues',
        canMatch: [roleGuard(STAFF_ROLES)],
        loadComponent: () => import('../pages/issues/issues.page').then(m => m.IssuesPage),
      },
      {
        path: 'people',
        canMatch: [roleGuard(STAFF_ROLES)],
        loadComponent: () => import('../pages/people/people.page').then(m => m.PeoplePage),
      },
      {
        path: 'config',
        canMatch: [roleGuard(STAFF_ROLES)],
        loadComponent: () => import('../pages/config/config.page').then(m => m.ConfigPage),
      },
      {
        path: 'config/categories',
        canMatch: [roleGuard(STAFF_ROLES)],
        loadComponent: () => import('../pages/config/categories.page').then(m => m.CategoriesPage),
      },
      {
        path: 'my-books',
        canMatch: [roleGuard(['STUDENT'])],
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
