// scripts/apply-patches.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// 1. expo-notifications TopicSubscriptionModule patch
const notifBuildFile = path.join(
  root,
  'node_modules/expo-notifications/build/TopicSubscriptionModule.android.js',
);
const notifSrcFile = path.join(
  root,
  'node_modules/expo-notifications/src/TopicSubscriptionModule.android.ts',
);

if (fs.existsSync(notifBuildFile)) {
  const content = fs.readFileSync(notifBuildFile, 'utf8');
  if (content.includes("requireNativeModule('ExpoTopicSubscriptionModule')")) {
    fs.writeFileSync(
      notifBuildFile,
      content.replace(
        "import { requireNativeModule } from 'expo-modules-core';\nexport default requireNativeModule('ExpoTopicSubscriptionModule');",
        "import { requireOptionalNativeModule } from 'expo-modules-core';\nexport default requireOptionalNativeModule('ExpoTopicSubscriptionModule') || {};",
      ),
    );
    console.log('[apply-patches] Applied patch to expo-notifications TopicSubscriptionModule.android.js');
  }
}

if (fs.existsSync(notifSrcFile)) {
  const content = fs.readFileSync(notifSrcFile, 'utf8');
  if (content.includes("requireNativeModule<TopicSubscriptionModule>('ExpoTopicSubscriptionModule')")) {
    fs.writeFileSync(
      notifSrcFile,
      content.replace(
        "import { requireNativeModule } from 'expo-modules-core';",
        "import { requireOptionalNativeModule } from 'expo-modules-core';",
      ).replace(
        "export default requireNativeModule<TopicSubscriptionModule>('ExpoTopicSubscriptionModule');",
        "export default (requireOptionalNativeModule<TopicSubscriptionModule>('ExpoTopicSubscriptionModule') || ({} as TopicSubscriptionModule));",
      ),
    );
    console.log('[apply-patches] Applied patch to expo-notifications TopicSubscriptionModule.android.ts');
  }
}

// 2. expo-sqlite getColumnNamesAsync patch
const sqliteBuildFile = path.join(
  root,
  'node_modules/expo-sqlite/build/SQLiteStatement.js',
);
const sqliteSrcFile = path.join(
  root,
  'node_modules/expo-sqlite/src/SQLiteStatement.ts',
);

if (fs.existsSync(sqliteBuildFile)) {
  let content = fs.readFileSync(sqliteBuildFile, 'utf8');
  let changed = false;

  const targetBuildMethod = `    async getColumnNamesAsync() {
        if (this.columnNames == null) {
            this.columnNames = await this.statement.getColumnNamesAsync();
        }
        return this.columnNames;
    }`;

  const replacementBuildMethod = `    async getColumnNamesAsync() {
        if (this.columnNames == null) {
            try {
                if (typeof this.statement.getColumnNamesSync === 'function') {
                    this.columnNames = this.statement.getColumnNamesSync();
                } else {
                    this.columnNames = await this.statement.getColumnNamesAsync();
                }
            } catch {
                this.columnNames = [];
            }
        }
        return this.columnNames;
    }`;

  if (content.includes(targetBuildMethod)) {
    content = content.replace(targetBuildMethod, replacementBuildMethod);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(sqliteBuildFile, content);
    console.log('[apply-patches] Applied patch to expo-sqlite SQLiteStatement.js');
  }
}

if (fs.existsSync(sqliteSrcFile)) {
  let content = fs.readFileSync(sqliteSrcFile, 'utf8');
  let changed = false;

  const targetSrcMethod = `  private async getColumnNamesAsync(): Promise<string[]> {
    if (this.columnNames == null) {
      this.columnNames = await this.statement.getColumnNamesAsync();
    }
    return this.columnNames;
  }`;

  const replacementSrcMethod = `  private async getColumnNamesAsync(): Promise<string[]> {
    if (this.columnNames == null) {
      try {
        if (typeof (this.statement as any).getColumnNamesSync === 'function') {
          this.columnNames = (this.statement as any).getColumnNamesSync();
        } else {
          this.columnNames = await this.statement.getColumnNamesAsync();
        }
      } catch {
        this.columnNames = [];
      }
    }
    return this.columnNames;
  }`;

  if (content.includes(targetSrcMethod)) {
    content = content.replace(targetSrcMethod, replacementSrcMethod);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(sqliteSrcFile, content);
    console.log('[apply-patches] Applied patch to expo-sqlite SQLiteStatement.ts');
  }
}
