// Development (`ionic serve`): /api is proxied to the local Spring Boot API, see proxy.conf.json.
export const environment = {
  production: false,
  apiUrl: '/api',
  /** The local API never sleeps, so there is nothing to wake. */
  wakeUrl: ''
};
