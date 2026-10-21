// apps/admin-web/src/shared/math/MathInputHelper.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/shared/ui';
import { KaTeXRenderer } from './KaTeXRenderer';
import styles from './MathInputHelper.module.css';

export interface MathInputHelperProps {
  value: string;
  onChange?: (val: string) => void;
  onInsert?: (latexSnippet: string) => void;
  placeholderHelp?: string;
  showLivePreview?: boolean;
}

const COMMON_SYMBOLS = [
  { label: '×', code: '\\times ' },
  { label: '÷', code: '\\div ' },
  { label: '≤', code: '\\le ' },
  { label: '≥', code: '\\ge ' },
  { label: 'θ', code: '\\theta ' },
  { label: '∫', code: '\\int ' },
  { label: '∑', code: '\\sum ' },
  { label: '√x', code: '\\sqrt{x} ' },
  { label: 'a/b', code: '\\frac{a}{b} ' },
  { label: 'x²', code: 'x^2 ' },
  { label: 'x₁', code: 'x_1 ' },
  { label: 'π', code: '\\pi ' },
  { label: '±', code: '\\pm ' },
  { label: '∞', code: '\\infty ' },
];

export function MathInputHelper({
  value,
  onChange,
  onInsert,
  placeholderHelp,
  showLivePreview = true,
}: MathInputHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 150);
    return () => clearTimeout(timer);
  }, [value]);

  const handleInsert = (snippet: string) => {
    if (onInsert) {
      onInsert(snippet);
    } else if (onChange) {
      onChange(value ? `${value} ${snippet}` : snippet);
    }
  };

  const hasMath = debouncedValue.includes('$');

  return (
    <div className={styles.helperBox}>
      <button
        type="button"
        className={styles.helperTrigger}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={14} />
        <span>Insert Math (LaTeX)</span>
      </button>

      {isOpen && (
        <div className={styles.syntaxBar}>
          <div className={styles.syntaxRow}>
            <span className={styles.syntaxLabel}>Syntax:</span>
            <button
              type="button"
              className={styles.syntaxChip}
              onClick={() => handleInsert('$E = mc^2$')}
              title="Click to insert inline formula"
            >
              Inline: $E = mc^2$
            </button>
            <button
              type="button"
              className={styles.syntaxChip}
              onClick={() => handleInsert('$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$')}
              title="Click to insert display block formula"
            >
              Block: {'$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$'}
            </button>
          </div>

          <div className={styles.syntaxRow}>
            <span className={styles.syntaxLabel}>Symbols:</span>
            <div className={styles.symbolGrid}>
              {COMMON_SYMBOLS.map((sym) => (
                <button
                  key={sym.label}
                  type="button"
                  className={styles.symbolBtn}
                  onClick={() => handleInsert(sym.code)}
                  title={`Insert ${sym.code}`}
                >
                  {sym.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showLivePreview && hasMath && (
        <div className={styles.livePreviewCard}>
          <div className={styles.previewHeader}>
            <span className={styles.previewTitle}>Live KaTeX Preview</span>
          </div>
          <div className={styles.previewBody}>
            <KaTeXRenderer
              text={debouncedValue}
              emptyFallback={<span className={styles.previewEmpty}>Type formula to preview...</span>}
            />
          </div>
        </div>
      )}
    </div>
  );
}
