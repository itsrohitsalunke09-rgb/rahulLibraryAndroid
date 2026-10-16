// Production builds (the Android app) talk to the deployed API on Render.
export const environment = {
  production: true,
  apiUrl: 'https://ngo-library-api.onrender.com/api',
  /** Pinged on app start to wake the sleeping Render server early (see core/wake-server.ts). */
  wakeUrl: 'https://ngo-library-api.onrender.com/actuator/health'
};
