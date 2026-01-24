# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Ndomog Investment is a hybrid mobile/web inventory management system built with React, TypeScript, Vite, and Capacitor. The app is designed for offline-first operation with Supabase backend synchronization.

**App Name:** Ndomog Investment  
**App ID:** com.ndomog.app  
**Build Version:** Managed in `vite.config.ts` (currently 1.2.3)

## Development Commands

### Core Commands
```bash
# Install dependencies
npm i

# Development server (runs on port 8080, IPv6 enabled)
npm run dev

# Production build
npm run build

# Development build (with component tagger)
npm run build:dev

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Capacitor (Mobile) Commands
```bash
# Sync web assets to native platforms
npx cap sync

# Sync to specific platform
npx cap sync android
npx cap sync ios

# Open native project in IDE
npx cap open android
npx cap open ios

# Build and copy to Android
npm run build && npx cap sync android
```

### Supabase Commands
```bash
# Start local Supabase (requires Docker)
npx supabase start

# Stop local Supabase
npx supabase stop

# Apply migrations
npx supabase db push

# Generate TypeScript types from database
npx supabase gen types typescript --local > src/integrations/supabase/types.ts

# Run edge functions locally
npx supabase functions serve
```

## Architecture

### Offline-First Design
The app uses a hybrid online/offline architecture:

- **Dexie.js** (`src/lib/offlineDb.ts`) - IndexedDB wrapper for local storage
- **Sync Service** (`src/services/syncService.ts`) - Handles online/offline data synchronization
- **Pending Actions Queue** - Stores user actions when offline, syncs when online
- Data flow: Try online → fallback to cache → queue actions when offline → sync when reconnected

### Key Directories

- **`src/pages/`** - Main route pages (Dashboard, Auth, Profile, Categories, Versions, AdminReleases)
- **`src/components/`** - Reusable React components including UI components in `ui/` subdirectory
- **`src/services/`** - Business logic services (camera, sync, notifications, biometric)
- **`src/hooks/`** - Custom React hooks (theme, online status, mobile detection, text size)
- **`src/integrations/supabase/`** - Supabase client and auto-generated types
- **`src/lib/`** - Utility libraries (offline DB, version management, GitHub releases)
- **`supabase/migrations/`** - Database schema migrations (timestamped SQL files)
- **`supabase/functions/`** - Supabase Edge Functions (ai-inventory, barcode-lookup, send-low-stock-notifications, send-notification)

### State Management

- **React Query** (`@tanstack/react-query`) - Server state and caching
- **Local State** - React hooks (useState, useEffect) for component state
- **Supabase Realtime** - Real-time subscriptions for collaborative features (only when online)

### Authentication & Security

- **Supabase Auth** with email confirmation
- **PIN Lock System** - Optional biometric/PIN authentication (`src/components/PinLockScreen.tsx`, `src/services/biometricService.ts`)
- Auth state stored in localStorage with auto-refresh tokens
- User profiles table tracks username, avatar, and preferences

### Mobile Features (Capacitor)

- **Camera Access** (`src/services/cameraService.ts`) - Photo capture and gallery access
- **Push Notifications** (`src/services/pushNotificationService.ts`) - FCM integration
- **Local Notifications** (`src/services/localNotificationService.ts`) - Low stock alerts
- **Back Button Handling** (`src/hooks/useBackButton.ts`) - Android hardware back button
- **Biometric Authentication** - Fingerprint/Face ID support
- **PWA Support** - Service worker with Workbox for web caching

### Data Model

Main tables:
- **items** - Inventory items (name, category, prices, quantities, photos, soft-delete support)
- **categories** - Item categories
- **profiles** - User profiles (username, avatar, settings)
- **activity_logs** - Audit trail of item changes
- **user_pins** - PIN lock configuration
- **push_subscriptions** - FCM tokens for notifications
- **app_releases** - Version management for OTA updates

## Important Patterns

### Path Alias
Use `@/` for imports relative to `src/`:
```typescript
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
```

### Environment Variables
All environment variables are prefixed with `VITE_` and accessed via `import.meta.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Offline Operations Pattern
```typescript
// Always check online status
const { isOnline } = useOnlineStatus();

// Load data with cache fallback
const { items, fromCache } = await loadItems(isOnline);

// Queue actions when offline
if (!isOnline) {
  await queueOfflineAction({ type: 'add_item', entity_id: id, data: itemData, timestamp: Date.now() });
}

// Sync when coming back online
window.addEventListener("app-online", handleSync);
```

### Capacitor Platform Detection
```typescript
import { Capacitor } from "@capacitor/core";

if (Capacitor.isNativePlatform()) {
  // Native mobile logic
} else {
  // Web/PWA logic
}
```

## Testing & Quality

- **No test framework** - Tests are not currently configured in this project
- **Linting** - ESLint with TypeScript support (`npm run lint`)
- **Type checking** - TypeScript with relaxed config (noImplicitAny: false, strictNullChecks: false)
- Manual testing on Android required for mobile features

## Common Workflows

### Adding a New Page
1. Create component in `src/pages/`
2. Add route in `src/App.tsx` within `<Routes>`
3. Add navigation link if needed (check `Header.tsx` or sidebar components)

### Database Schema Changes
1. Create migration: `npx supabase migration new <name>`
2. Write SQL in `supabase/migrations/<timestamp>_<name>.sql`
3. Apply locally: `npx supabase db push`
4. Regenerate types: `npx supabase gen types typescript --local > src/integrations/supabase/types.ts`
5. Update offline DB schema if needed in `src/lib/offlineDb.ts`

### Adding an Edge Function
1. Create in `supabase/functions/<function-name>/`
2. Add configuration to `supabase/config.toml` if needed
3. Deploy: `npx supabase functions deploy <function-name>`

### Building Android APK
1. Build web assets: `npm run build`
2. Sync to Android: `npx cap sync android`
3. Open Android Studio: `npx cap open android`
4. Build APK from Android Studio (Build → Build Bundle(s)/APK(s) → Build APK(s))

### Updating App Version
1. Update `BUILD_VERSION` in `vite.config.ts`
2. Update `version` in `package.json`
3. Rebuild: `npm run build`

## UI Components

This project uses **shadcn/ui** components (Radix UI + Tailwind CSS):
- Components are in `src/components/ui/`
- Configure via `components.json`
- Add new components: Visit https://ui.shadcn.com/ for component code

**Theme System:**
- Dark mode support via `next-themes`
- Colors defined in `tailwind.config.ts` and `src/index.css`
- User preference stored in `useTheme` hook

**Responsive Design:**
- Mobile-first approach
- `use-mobile` hook for mobile detection
- Adjustable text size via `useTextSize` hook

## Deployment

The app is deployed via **Lovable** (lovable.dev):
- Project URL: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID
- Changes can be made via Lovable interface or pushed to Git
- Production site: https://mienlzvjeyneepkxxnhs.lovable.app

Android APK files are stored in `public/` directory for distribution.

## Known Limitations

- TypeScript strict mode is disabled for rapid development
- No automated tests
- Some Capacitor features only work on native platforms (check with `Capacitor.isNativePlatform()`)
- Offline sync has eventual consistency - conflicts are not automatically resolved
