// scripts/patch-expo-sqlite.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const buildFile = path.join(
  root,
  'node_modules/expo-sqlite/build/SQLiteStatement.js',
);
const srcFile = path.join(
  root,
  'node_modules/expo-sqlite/src/SQLiteStatement.ts',
);

if (fs.existsSync(buildFile)) {
  let content = fs.readFileSync(buildFile, 'utf8');
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

  const targetBuildNative = `    getColumnNamesAsync() {
        return this.nativeStatement.getColumnNamesAsync();
    }`;

  const replacementBuildNative = `    getColumnNamesAsync() {
        if (typeof this.nativeStatement.getColumnNamesSync === 'function') {
            try {
                return Promise.resolve(this.nativeStatement.getColumnNamesSync());
            } catch {
                // fallback
            }
        }
        return this.nativeStatement.getColumnNamesAsync();
    }`;

  if (content.includes(targetBuildNative)) {
    content = content.replace(targetBuildNative, replacementBuildNative);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(buildFile, content);
    console.log('[patch-expo-sqlite] Patched SQLiteStatement.js');
  }
}

if (fs.existsSync(srcFile)) {
  let content = fs.readFileSync(srcFile, 'utf8');
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
    fs.writeFileSync(srcFile, content);
    console.log('[patch-expo-sqlite] Patched SQLiteStatement.ts');
  }
}
