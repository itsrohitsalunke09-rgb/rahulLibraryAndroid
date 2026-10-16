import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.ngolibrary.rahullibrary',
  appName: 'Rahul Library',
  webDir: 'www',
  // Let people pinch to zoom (accessibility); the WebView blocks it by default.
  zoomEnabled: true
};

export default config;
