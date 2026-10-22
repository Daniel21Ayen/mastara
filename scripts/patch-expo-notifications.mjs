// scripts/patch-expo-notifications.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const buildFile = path.join(
  root,
  'node_modules/expo-notifications/build/TopicSubscriptionModule.android.js',
);
const srcFile = path.join(
  root,
  'node_modules/expo-notifications/src/TopicSubscriptionModule.android.ts',
);

if (fs.existsSync(buildFile)) {
  const content = fs.readFileSync(buildFile, 'utf8');
  if (content.includes("requireNativeModule('ExpoTopicSubscriptionModule')")) {
    fs.writeFileSync(
      buildFile,
      content.replace(
        "import { requireNativeModule } from 'expo-modules-core';\nexport default requireNativeModule('ExpoTopicSubscriptionModule');",
        "import { requireOptionalNativeModule } from 'expo-modules-core';\nexport default requireOptionalNativeModule('ExpoTopicSubscriptionModule') || {};",
      ),
    );
    console.log('[patch-expo-notifications] Patched TopicSubscriptionModule.android.js');
  }
}

if (fs.existsSync(srcFile)) {
  const content = fs.readFileSync(srcFile, 'utf8');
  if (content.includes("requireNativeModule<TopicSubscriptionModule>('ExpoTopicSubscriptionModule')")) {
    fs.writeFileSync(
      srcFile,
      content.replace(
        "import { requireNativeModule } from 'expo-modules-core';",
        "import { requireOptionalNativeModule } from 'expo-modules-core';",
      ).replace(
        "export default requireNativeModule<TopicSubscriptionModule>('ExpoTopicSubscriptionModule');",
        "export default (requireOptionalNativeModule<TopicSubscriptionModule>('ExpoTopicSubscriptionModule') || ({} as TopicSubscriptionModule));",
      ),
    );
    console.log('[patch-expo-notifications] Patched TopicSubscriptionModule.android.ts');
  }
}
