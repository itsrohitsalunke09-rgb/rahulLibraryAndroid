# Rahul Library — Android app

Ionic 9 + Angular 22 + Capacitor 8 app for the NGO library. It uses the same Spring Boot API as the website.

| Role | Tabs |
| --- | --- |
| Admin / Librarian | Dashboard, Catalog (add/edit/issue books), Issues (filter, search, mark returned), People, Profile |
| Student | Catalog, My books (due dates, overdue warning), Profile |

## Requirements

- **Node 24** (Angular 22 needs Node ≥ 22.22 or ≥ 24.15). The website (`../frontend`) uses the same Node 24.
- For APKs only: JDK 21 (already the system JDK) and the Android SDK (Android Studio, or just the command-line tools).

## Run in the browser

```powershell
npm install
npm start          # http://localhost:8100
```

In development `/api` is proxied to the local API on `http://127.0.0.1:8080` (see `proxy.conf.json`).
Use the browser's device toolbar for a phone-sized view.

## Build for Android

Production builds call the deployed API (`src/environments/environment.prod.ts`).

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug   # APK: android/app/build/outputs/apk/debug/app-debug.apk
```

The backend must allow the app's origin `https://localhost` in `app.cors.allowed-origins`.
