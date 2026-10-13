# App size: under 20 MB

**Rule:** the Android release APK for one phone architecture must be **under 20 MB** (it was 50 MB). The check is automatic:

```bash
npx eas build --platform android --profile preview-arm64     # one architecture, release build
node apps/mobile/scripts/check-app-size.mjs path/to/app.apk  # exits with an error above 20 MB, and shows what takes the space
```

## What "20 MB" means

- **A universal APK (all phone architectures in one file) cannot be under 20 MB** with React Native: each architecture adds its own engine. So the gate is on **one architecture**: `arm64-v8a` (almost all current Tecno, Infinix and Samsung phones) and `armeabi-v7a` (older 32-bit phones) are built as two separate APKs (`preview-arm64`, `preview-arm32`).
- For the Play Store the `production` profile makes an app bundle, and each phone downloads only its own architecture. Measure that with `bundletool get-size total`; it should be about the same as the APK.
- No textbooks, PDFs or question banks are inside the app. All content is downloaded by the student (see the download feature), so content never counts against the 20 MB.

## What is already done to keep it small

| Control | Where | Effect |
|---|---|---|
| R8 code shrinking and resource shrinking | `app.config.ts` (`expo-build-properties`) | Removes unused code and images |
| Compressed native libraries inside the APK | `useLegacyPackaging: true` | Smaller file; the installed app is slightly larger |
| One architecture per APK | `eas.json` (`reactNativeArchitectures`) | Removes the biggest part: other architectures' engines |
| Hermes (bytecode JavaScript) | default | Smaller and faster than plain JavaScript |
| KaTeX fonts cut from 20 to 12, no KaTeX JavaScript inside every page | `scripts/build-katex-assets.mjs` | About 160 KB of fonts instead of about 300 KB |
| Only 4 font files (2 weights each of Plus Jakarta Sans and Noto Sans Ethiopic) and only the Ionicons icon font | `core/theme/fonts.ts` | Fonts stay around 1 MB |
| No downloaded content or images in the app | download feature | Content grows on the phone, not in the app |
| The database encryption library (SQLCipher) is added only when `EXPO_PUBLIC_DB_ENCRYPTION=true` | `app.config.ts` | Encryption adds roughly 2 to 3 MB per architecture. **Decide whether you need it for release; if the size is tight, this is the first thing to review** |

## Rough budget (ESTIMATES, not measurements)

I could not build the Android app in the environment I work in, so **I have not measured the size**. These are typical ranges for a React Native + Expo app with the features Mastara uses; the first real build replaces them.

| Part | Typical size, one architecture |
|---|---|
| React Native and Hermes engine (native libraries) | 8 to 11 MB |
| Expo modules (SQLite, image picker, secure store, screen capture, netinfo, WebView bridge, clock) | 1.5 to 3 MB |
| SQLCipher (only when encryption is on) | 2 to 3 MB |
| JavaScript bytecode (app, KaTeX, i18n, zod) | 1.5 to 3 MB |
| Fonts | about 1 MB |
| Images, resources, manifest | 0.5 to 1.5 MB |
| **Total** | **about 13 to 22 MB** |

So 20 MB is reachable but not guaranteed, and **encryption on top is the risk**. If the first build is over:

1. Run the check script; it shows the largest files and areas.
2. Look at SQLCipher first (turn encryption off, or encrypt only the downloaded content).
3. Then: drop the Noto Sans Ethiopic Bold weight (use the regular weight with a synthetic bold), drop `zod` from the phone (validate on the server only), lazy-load KaTeX.
4. Last resort: ship 32-bit and 64-bit builds only through the Play Store bundle.

## Keeping it under the limit

- Run `check-app-size.mjs` on every release build in CI; the build fails above 20 MB.
- Review every new native dependency for its size before adding it.
- Do not put content (text, PDFs, images) inside the app; use the download feature.
