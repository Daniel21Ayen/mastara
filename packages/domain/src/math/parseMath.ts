// packages/domain/src/math/parseMath.ts
export type MathSegment =
  | { kind: 'text'; value: string }
  | { kind: 'math'; value: string; display: boolean };

/**
 * Splits text into plain text and math: inline $...$ and block $$...$$.
 * "\$" is a literal dollar sign; an unmatched "$" stays plain text.
 */
export function parseMath(input: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let text = '';
  let i = 0;

  const flushText = () => {
    if (text) segments.push({ kind: 'text', value: text });
    text = '';
  };

  while (i < input.length) {
    const char = input[i];

    if (char === '\\' && input[i + 1] === '$') {
      text += '$';
      i += 2;
      continue;
    }

    if (char === '$') {
      const display = input[i + 1] === '$';
      const open = display ? 2 : 1;
      const close = display ? '$$' : '$';

      let end = -1;
      for (let j = i + open; j < input.length; j += 1) {
        if (input[j] === '\\') {
          j += 1;
        } else if (input.startsWith(close, j)) {
          end = j;
          break;
        }
      }

      if (end > i + open) {
        flushText();
        segments.push({ kind: 'math', value: input.slice(i + open, end).trim(), display });
        i = end + close.length;
        continue;
      }
    }

    text += char;
    i += 1;
  }

  flushText();
  return segments;
}
