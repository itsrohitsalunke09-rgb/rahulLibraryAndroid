import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/core/auth.interceptor';
import { RolePreloading } from './app/core/role-preloading';
import { wakeServer } from './app/core/wake-server';

// Before bootstrapping, so the sleeping server starts waking as early as possible.
wakeServer();

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(RolePreloading), withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
});
