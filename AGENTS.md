This is an Expo/React Native mobile application (SDK 58, React Native 0.88). It is JavaScript-only: no TypeScript and no `tsconfig.json`.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing code that touches an Expo, EAS, or React Native API:

1. Read the `expo` version in `package.json` (currently SDK 58).
2. Fetch the matching docs: `https://docs.expo.dev/versions/v58.0.0/`
3. For anything else, use https://docs.expo.dev/llms.txt and follow its links; do not answer from memory.

## Commands

This project uses pnpm (`pnpm-lock.yaml`, `pnpm-workspace.yaml`). A stale `package-lock.json` also exists; do not use npm to install dependencies.

```bash
pnpm install
pnpm start                  # Expo dev server
pnpm lint                   # expo lint
node --test tests/*.mjs     # tests; the directory form fails

pnpm exec expo install <package>   # ALWAYS use for Expo deps; resolves SDK-compatible versions
```

Run lint and tests before declaring a task done. There is no typecheck step.

## Navigation

Navigation is a plain state machine in `src/app/AppNavigator.js`: route names map to screens in `src/screens/`. Do **not** add Expo Router files (`src/app/*.tsx`, `_layout.tsx`) or an `expo-router` dependency unless the app is deliberately migrated.

## Configuration

- `EXPO_PUBLIC_API_URL` comes from `.env`; restart Expo after changing it.
- `http://localhost:8000` works for web/iOS; Android emulator uses `http://10.0.2.2:8000`; a physical phone needs the host’s LAN IP.
- Never put backend or InfluxDB secrets in `EXPO_PUBLIC_*`; they are embedded in the client bundle.

## Building with EAS

Use EAS to build, sign, submit, and ship over-the-air updates (`eas build`, `eas submit`, `eas update`). Run it as `pnpm dlx eas-cli <command>` or `npx eas-cli@latest <command>`. Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes bundled native modules. After adding a library with native code, use a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer Expo modules over third-party libraries. Docs: https://docs.expo.dev/versions/latest/index.md
