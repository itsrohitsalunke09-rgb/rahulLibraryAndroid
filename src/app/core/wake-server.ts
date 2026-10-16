import { environment } from '../../environments/environment';

/** Render puts the free API to sleep after ~15 idle minutes; ping again after this long away. */
const PING_EVERY = 5 * 60 * 1000;

let lastPing = 0;

/**
 * Starts waking the API the moment the app opens (and again when it comes back to the
 * foreground), so the server is up by the time the user has typed their password.
 * The response is ignored: the request reaching the server is what wakes it.
 */
export function wakeServer() {
  if (!environment.wakeUrl) {
    return;
  }
  ping();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastPing > PING_EVERY) {
      ping();
    }
  });
}

function ping() {
  lastPing = Date.now();
  // no-cors: the health endpoint needn't send CORS headers for the request to wake the server.
  fetch(environment.wakeUrl, { mode: 'no-cors', cache: 'no-store' }).catch(() => {
    // Offline or still asleep: the next real request will report the problem.
  });
}
