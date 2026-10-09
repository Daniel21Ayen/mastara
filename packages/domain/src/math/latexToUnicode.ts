// packages/domain/src/math/latexToUnicode.ts
/**
 * Best-effort offline rendering of common LaTeX as plain Unicode text.
 * Used until the full KaTeX renderer is plugged in. Unknown commands stay visible as \command.
 */

const SYMBOLS: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ',
  pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', omega: 'ω', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω', Pi: 'Π',
  infty: '∞', to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', leftrightarrow: '↔',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', equiv: '≡',
  pm: '±', mp: '∓', times: '×', cdot: '·', div: '÷', circ: '∘', sum: '∑', prod: '∏', int: '∫',
  partial: '∂', nabla: '∇', in: '∈', subset: '⊂', cup: '∪', cap: '∩', forall: '∀', exists: '∃',
};

const FUNCTIONS = new Set(['lim', 'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'max', 'min']);
const TEXT_COMMANDS = new Set(['text', 'mathrm', 'mathbf', 'mathit', 'operatorname']);
const SPACE_COMMANDS = new Set([',', ';', ':', ' ', 'quad', 'qquad']);

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ',
};
const SUBSCRIPT: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ',
  l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
};

interface Arg {
  text: string;
  next: number;
}

/** Reads one argument: {group}, a \command, or a single character. */
function readArg(src: string, from: number): Arg {
  let i = from;
  while (src[i] === ' ') i += 1;

  if (src[i] === '{') {
    let depth = 0;
    for (let j = i; j < src.length; j += 1) {
      if (src[j] === '{') depth += 1;
      if (src[j] === '}') {
        depth -= 1;
        if (depth === 0) return { text: src.slice(i + 1, j), next: j + 1 };
      }
    }
    return { text: src.slice(i + 1), next: src.length };
  }

  if (src[i] === '\\') {
    const match = /^\\([a-zA-Z]+|.)/.exec(src.slice(i));
    const length = match ? match[0].length : 1;
    return { text: src.slice(i, i + length), next: i + length };
  }

  return { text: src.charAt(i), next: i + 1 };
}

function wrap(value: string): string {
  return /^[\w.'α-ωΑ-Ω]+$/.test(value) ? value : `(${value})`;
}

function script(marker: '^' | '_', inner: string): string {
  const map = marker === '^' ? SUPERSCRIPT : SUBSCRIPT;
  const mapped = [...inner].map((char) => map[char]);
  return mapped.every((char) => char !== undefined) ? mapped.join('') : `${marker}(${inner})`;
}

function convert(src: string): string {
  let out = '';
  let i = 0;

  while (i < src.length) {
    const char = src.charAt(i);

    if (char === '\\') {
      const match = /^\\([a-zA-Z]+|.)/.exec(src.slice(i));
      const command = match?.[1] ?? '';
      i += match ? match[0].length : 1;

      if (command === 'frac') {
        const top = readArg(src, i);
        const bottom = readArg(src, top.next);
        out += `${wrap(convert(top.text))}/${wrap(convert(bottom.text))}`;
        i = bottom.next;
      } else if (command === 'sqrt') {
        let index = '';
        if (src[i] === '[') {
          const close = src.indexOf(']', i);
          index = script('^', src.slice(i + 1, close));
          i = close + 1;
        }
        const arg = readArg(src, i);
        const inner = convert(arg.text);
        out += `${index}√${inner.length === 1 ? inner : `(${inner})`}`;
        i = arg.next;
      } else if (TEXT_COMMANDS.has(command)) {
        const arg = readArg(src, i);
        out += arg.text;
        i = arg.next;
      } else if (command === 'left' || command === 'right') {
        if (src[i] === '.') i += 1;
      } else if (command in SYMBOLS) {
        out += SYMBOLS[command];
      } else if (FUNCTIONS.has(command)) {
        out += command;
      } else if (SPACE_COMMANDS.has(command)) {
        out += ' ';
      } else if (command === '!') {
        // negative thin space: nothing to draw
      } else {
        out += `\\${command}`;
      }
      continue;
    }

    if (char === '^' || char === '_') {
      const arg = readArg(src, i + 1);
      out += script(char, convert(arg.text));
      i = arg.next;
      continue;
    }

    if (char !== '{' && char !== '}') out += char;
    i += 1;
  }

  return out;
}

export function latexToUnicode(latex: string): string {
  return convert(latex).replace(/ {2,}/g, ' ').trim();
}
