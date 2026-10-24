import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from './core/auth.service';
import { authGuard, guestGuard } from './core/guards';
import { PreloadFor } from './core/role-preloading';

export const routes: Routes = [
  {
    path: 'login',
    canMatch: [guestGuard],
    data: { preload: 'guest' satisfies PreloadFor },
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'register',
    canMatch: [guestGuard],
    data: { preload: 'guest' satisfies PreloadFor },
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    canMatch: [guestGuard],
    data: { preload: 'guest' satisfies PreloadFor },
    loadComponent: () => import('./pages/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage),
  },
  {
    path: 'tabs',
    canMatch: [authGuard],
    loadChildren: () => import('./tabs/tabs.routes').then(m => m.routes),
  },
  {
    path: '**',
    redirectTo: () => (inject(AuthService).user() ? inject(AuthService).homeUrl() : '/login'),
  },
];
