# Falcon Revive · Flutter Mobile

Flutter Android/iOS client for the Falcon Revive garage ERP.  
Uses the **same backend API** as the web frontend and mirrors the glass workspace design.

## Requirements

- Flutter SDK 3.13+ (`flutter --version`)
- Running Falcon backend (`backend/` on port 4000 by default)

## Setup

```bash
cd mobile-application
flutter pub get
```

## Run

```bash
# Android emulator (recommended on Windows): reverse host port into the device
adb reverse tcp:4000 tcp:4000
flutter run --dart-define=API_URL=http://127.0.0.1:4000

# Alternate emulator mapping (can be flaky on Windows)
flutter run --dart-define=API_URL=http://10.0.2.2:4000

# Physical phone on same Wi-Fi (replace with your PC LAN IP)
flutter run --dart-define=API_URL=http://192.168.1.10:4000

# Production API
flutter run --dart-define=API_URL=https://your-api.onrender.com
```

## Roles (same as web)

| Role | Screens |
|---|---|
| Owner (Cedrick) | Home, Approvals, Vehicles, Stock, Clients, Profile |
| Staff | Home, Quotes, Invoices, Vehicles, Stock, Clients, Sales, Expenses, Journal, Profile |

## APK release

```bash
# Debug/local APK
flutter build apk --release --dart-define=API_URL=https://falcon-system-vjgr.onrender.com

# Split per ABI (smaller)
flutter build apk --release --split-per-abi --dart-define=API_URL=https://your-api.onrender.com
```

Output:

`build/app/outputs/flutter-apk/app-release.apk`

## Notifications & silent background

After sign-in the app:

1. Asks for notification permission  
2. Starts a **quiet background service** that polls `/api/devices/alerts` about every 90s  
3. Shows a heads-up notification for new approvals / send-backs / approvals  

Android always shows a low-importance ongoing notice (“Watching workshop updates quietly”) while that service is alive — required by the OS for background work. Alert notifications use a separate high-priority channel.

### Firebase remote push

App Android Firebase wiring:

- Place `google-services.json` at `android/app/google-services.json` (from Firebase Console; **not** committed)
- Google services Gradle plugin in `android/settings.gradle.kts` + `android/app/build.gradle.kts`
- Flutter packages `firebase_core` + `firebase_messaging`

**You still need a backend service account** so the API can send pushes:

1. Firebase Console → Project settings → Service accounts → **Generate new private key**
2. Save the JSON somewhere safe (not in git), e.g. `backend/secrets/firebase-admin.json`
3. In `backend/.env` add:
   ```
   FIREBASE_SERVICE_ACCOUNT=C:\Users\gaming\OneDrive\Desktop\falcon\backend\secrets\firebase-admin.json
   ```
4. In `backend/`: `npm install firebase-admin`
5. Restart the backend, then reinstall/run the app and sign in

## Design

- Pastel glass gradients + Falcon Glass Drift Lottie background  
- Glass cards, pill chips, Outfit typography  
- Falcon Revive chrome emblem branding  

## Project layout

```
lib/
  main.dart
  api.dart          # same /api routes + X-Falcon-* headers
  auth.dart
  theme.dart
  shell.dart        # role pill nav
  screens/
  widgets/
assets/
  falcon_revive_emblem.png
  falcon.json
```
