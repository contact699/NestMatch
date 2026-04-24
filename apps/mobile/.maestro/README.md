# Maestro E2E flows

End-to-end flows for the NestMatch mobile app (`com.nestmatch.app`).

## Prerequisites

1. **Install Maestro CLI**
   ```bash
   curl -fsSL "https://get.maestro.mobile.dev" | bash
   ```
   Docs: https://docs.maestro.dev/getting-started/installing-maestro

2. **Install the app on a simulator/emulator or device**
   - iOS: `eas build --profile preview --platform ios`, then install the `.ipa` on a simulator or run `expo run:ios`.
   - Android: `eas build --profile preview --platform android`, then `adb install nestmatch.apk`, or run `expo run:android`.
   - Expo Go is *not* recommended — `clearState: true` won't isolate runs inside Expo Go.

3. **Create a dedicated test user in Supabase** (don't use a real account). Any auth user with a completed profile will do.

## Running

From `apps/mobile/`:

```bash
# one flow
MAESTRO_EMAIL=test@example.com MAESTRO_PASSWORD=... \
  maestro test .maestro/flows/auth/login-email.yaml

# or via npm script (same env vars required)
npm run maestro:login
npm run maestro:tabs
```

On Windows PowerShell:

```powershell
$env:MAESTRO_EMAIL="test@example.com"; $env:MAESTRO_PASSWORD="..."
maestro test .maestro/flows/auth/login-email.yaml
```

## Flow layout

```
.maestro/
  flows/
    auth/
      login-email.yaml   # email/password happy path
    navigation/
      tabs.yaml          # cycles through Home/Search/Messages/Profile
```

## What's intentionally not covered yet

Adding these flows is straightforward once each blocker is resolved:

| Flow | Blocker | Resolution |
|---|---|---|
| Google sign-in | `expo-web-browser` opens native auth session | stub with a test-mode email link, or use Maestro's `runScript` to plant a session token |
| Listing create w/ photo | native image picker | add a dev-only `__DEV__` bypass that seeds a photo URL |
| Payments | not implemented on mobile yet | build first |
| Verification | external redirect to Certn | assert the URL was opened; don't follow |

## testIDs already in place

| ID | Where |
|---|---|
| `login-email`, `login-password`, `login-submit` | `app/(auth)/login.tsx` |
| `tab-home`, `tab-search`, `tab-messages`, `tab-profile` | `app/(tabs)/_layout.tsx` (`tabBarButtonTestID`) |
| `screen-home`, `screen-search`, `screen-messages`, `screen-profile` | root `<SafeAreaView>` of each tab screen |

When you add a new flow, prefer `tapOn: { id: "..." }` / `assertVisible: { id: "..." }` over text matching. The next screens to instrument are listing detail, conversation detail, profile edit, and the primary CTA on each.
