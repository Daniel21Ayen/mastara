// apps/mobile/plugins/withExpoPatches.js
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to apply Mastara runtime resilience patches to
 * expo-notifications and expo-sqlite during expo prebuild / EAS build.
 */
function applyPatches(projectRoot) {
  const root = path.resolve(projectRoot, '../..');

  // 1. expo-notifications TopicSubscriptionModule patch
  const notifBuildFile = path.join(
    root,
    'node_modules/expo-notifications/build/TopicSubscriptionModule.android.js',
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
    }
  }

  // 2. expo-sqlite getColumnNamesAsync patch
  const sqliteBuildFile = path.join(
    root,
    'node_modules/expo-sqlite/build/SQLiteStatement.js',
  );
  if (fs.existsSync(sqliteBuildFile)) {
    let content = fs.readFileSync(sqliteBuildFile, 'utf8');
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
      fs.writeFileSync(sqliteBuildFile, content);
    }
  }
}

const withExpoPatches = (config) => {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      applyPatches(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);
};

module.exports = withExpoPatches;
