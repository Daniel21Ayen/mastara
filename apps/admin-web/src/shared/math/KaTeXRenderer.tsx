// apps/admin-web/src/shared/math/KaTeXRenderer.tsx
'use client';

import React from 'react';
import katex from 'katex';
import { parseMath } from '@mastara/domain';
import styles from './MathInputHelper.module.css';

interface KaTeXRendererProps {
  text: string;
  className?: string;
  emptyFallback?: React.ReactNode;
}

/**
 * Safely parses and renders a string containing plain text and LaTeX formulas ($...$ and $$...$$).
 * Gracefully captures errors with soft-red styling without throwing or crashing.
 */
export function KaTeXRenderer({ text, className, emptyFallback }: KaTeXRendererProps) {
  if (!text || !text.trim()) {
    return emptyFallback ? <>{emptyFallback}</> : null;
  }

  const segments = parseMath(text);

  return (
    <span className={`${styles.katexContainer} ${className ?? ''}`}>
      {segments.map((segment, index) => {
        if (segment.kind === 'text') {
          return <span key={index}>{segment.value}</span>;
        }

        try {
          const html = katex.renderToString(segment.value, {
            displayMode: segment.display,
            throwOnError: true,
          });

          return (
            <span
              key={index}
              className={segment.display ? styles.blockMath : styles.inlineMath}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Invalid LaTeX syntax';
          return (
            <span
              key={index}
              className={styles.mathError}
              title={`LaTeX Error: ${message}`}
            >
              {segment.display ? `$$${segment.value}$$` : `$${segment.value}$`}
              <span className={styles.mathErrorBadge}>syntax error</span>
            </span>
          );
        }
      })}
    </span>
  );
}
