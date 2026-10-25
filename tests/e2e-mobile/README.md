# Mobile E2E Testing Suite (Maestro)

Automated end-to-end integration flows designed for real budget Android devices (Tecno Spark/Pop series, Infinix Smart, Samsung Galaxy A03) and Android emulators.

## Prerequisites
1. Install [Maestro CLI](https://maestro.mobile.dev/):
   ```bash
   curl -FsSL "https://get.maestro.mobile.dev" | bash
   ```
2. Enable USB Debugging on your physical device or boot an Android Emulator.
3. Verify connection:
   ```bash
   adb devices
   ```

## Running the E2E Flows

### 1. Complete Student Journey (Offline Register -> Profile -> Free Content -> Purchase -> MS ID)
```bash
maestro test tests/e2e-mobile/flow-student-journey.yaml
```

### 2. Device Lock & Release Flow
```bash
maestro test tests/e2e-mobile/flow-device-lock-and-release.yaml
```

### 3. Paywall & Download Lifecycle
```bash
maestro test tests/e2e-mobile/flow-downloads-and-paywall.yaml
```

### 4. Offline Exam & Outbox Sync
```bash
maestro test tests/e2e-mobile/flow-offline-exam-and-sync.yaml
```

## Running All Flows
```bash
maestro test tests/e2e-mobile/
```
