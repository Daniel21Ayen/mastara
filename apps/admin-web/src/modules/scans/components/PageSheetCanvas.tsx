// apps/admin-web/src/modules/scans/components/PageSheetCanvas.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { ScanPageItem } from '../lib/samplePages';
import { renderPageToCanvas } from '../lib/pdfGenerator';
import styles from './ScanWizard.module.css';

interface PageSheetCanvasProps {
  page: ScanPageItem;
  pageIndex: number;
  totalPages: number;
  zoom: number; // e.g. 100 for 100%
}

export function PageSheetCanvas({ page, pageIndex, totalPages, zoom }: PageSheetCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    renderPageToCanvas(page)
      .then((canvas) => {
        if (!active) return;
        const container = containerRef.current;
        if (!container) return;

        // Clear existing canvas
        container.innerHTML = '';
        canvas.className = styles.pageCanvas || '';
        container.appendChild(canvas);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to render page canvas:', err);
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page.url, page.rotation, page.name]);

  const maxWidthPx = Math.round(680 * (zoom / 100));

  return (
    <div
      className={styles.modalPageSheet}
      style={{ maxWidth: `${maxWidthPx}px` }}
    >
      <div className={styles.pageSheetHeader}>
        <span className={styles.pageSheetBadge}>
          Page {pageIndex + 1} of {totalPages}
        </span>
        <span className={styles.pageSheetMeta}>{page.name}</span>
      </div>

      <div ref={containerRef} className={styles.pageCanvasWrapper}>
        {loading && (
          <div className={styles.pageLoadingSkeleton}>
            <span className={styles.loadingSpinner} />
            <span>Rendering page {pageIndex + 1}...</span>
          </div>
        )}
        {error && (
          <div className={styles.pageErrorFallback}>
            {/* Fallback to direct img */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.url}
              alt={page.name}
              className={styles.pageFallbackImg}
              style={{ transform: `rotate(${page.rotation}deg)` }}
            />
          </div>
        )}
      </div>

      <div className={styles.pageSheetFooter}>
        <span>Mastara Enterprise Document</span>
        <span>•</span>
        <span>{pageIndex + 1}</span>
      </div>
    </div>
  );
}
