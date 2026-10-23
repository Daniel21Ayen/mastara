// packages/domain/src/assessment/csvParser.ts

/**
 * Standard RFC 4180 CSV parser.
 * Handles:
 * - Quoted fields with commas, newlines, and escaped quotes ("")
 * - CRLF (\r\n) and LF (\n) line endings
 * - UTF-8 Byte Order Mark (\uFEFF) removal
 * - Trims extraneous empty trailing lines
 */
export function parseCsv(raw: string): string[][] {
  if (!raw) return [];

  // Strip UTF-8 BOM if present
  let input = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < input.length && input[i + 1] === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i += 1;
          continue;
        }
      } else {
        currentField += char;
        i += 1;
        continue;
      }
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ',') {
      currentRow.push(currentField);
      currentField = '';
      i += 1;
      continue;
    }

    if (char === '\r') {
      if (i + 1 < input.length && input[i + 1] === '\n') {
        i += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      i += 1;
      continue;
    }

    if (char === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      i += 1;
      continue;
    }

    currentField += char;
    i += 1;
  }

  // Final field / row
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filter out any purely empty lines at the end
  while (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last && last.every((cell) => cell.trim() === '')) {
      rows.pop();
    } else {
      break;
    }
  }

  return rows;
}
