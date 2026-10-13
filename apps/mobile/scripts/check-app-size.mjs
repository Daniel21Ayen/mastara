// apps/mobile/scripts/check-app-size.mjs
// Release gate: fails when an Android APK is larger than the limit, and shows what is taking the space.
// Usage: node scripts/check-app-size.mjs path/to/app.apk [--limit-mb 20]
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';

const args = process.argv.slice(2);
const limitFlag = args.indexOf('--limit-mb');
const limitMb = limitFlag !== -1 ? Number(args[limitFlag + 1]) : 20;
// The file is the first argument that is neither the flag nor the flag's value.
const file = args.find((arg, index) => !arg.startsWith('--') && (limitFlag === -1 || index !== limitFlag + 1));

if (!file || !Number.isFinite(limitMb) || limitMb <= 0) {
  console.error('Usage: node scripts/check-app-size.mjs <app.apk> [--limit-mb 20]');
  process.exit(2);
}
if (file.endsWith('.aab')) {
  console.error(
    'An .aab file is not what a phone downloads. Build an APK per architecture (eas build --profile preview-arm64), or measure\n' +
      'the per-device download with bundletool: bundletool get-size total --apks=<app.apks>. Then run this check on the APK.',
  );
  process.exit(2);
}

const MB = 1024 * 1024;
const total = statSync(file).size;

/** Lists the entries of a zip (an APK is a zip) with their stored sizes. Reads the central directory only. */
function listEntries(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error('Not a zip/APK file (end of central directory not found).');
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < count; n += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Damaged zip directory.');
    const compressed = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    entries.push({ name, size: compressed });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function category(name) {
  if (name.startsWith('lib/')) return 'native libraries (lib/)';
  if (/^classes\d*\.dex$/.test(name)) return 'Java/Kotlin code (classes.dex)';
  if (name.startsWith('assets/')) return 'JavaScript bundle and assets (assets/)';
  if (name.startsWith('res/') || name === 'resources.arsc') return 'images and resources (res/)';
  return 'other';
}

const entries = listEntries(readFileSync(file));
const groups = new Map();
for (const entry of entries) groups.set(category(entry.name), (groups.get(category(entry.name)) ?? 0) + entry.size);

const mb = (bytes) => `${(bytes / MB).toFixed(2)} MB`;
console.log(`${basename(file)}: ${mb(total)} (limit ${limitMb} MB)\n`);
console.log('By area:');
[...groups.entries()].sort((a, b) => b[1] - a[1]).forEach(([name, size]) => console.log(`  ${mb(size).padStart(9)}  ${name}`));
console.log('\nLargest files:');
[...entries].sort((a, b) => b.size - a.size).slice(0, 10).forEach((e) => console.log(`  ${mb(e.size).padStart(9)}  ${e.name}`));

if (total > limitMb * MB) {
  console.error(`\nFAIL: ${mb(total)} is over the ${limitMb} MB limit by ${mb(total - limitMb * MB)}.`);
  process.exit(1);
}
console.log(`\nPASS: ${mb(limitMb * MB - total)} under the limit.`);
