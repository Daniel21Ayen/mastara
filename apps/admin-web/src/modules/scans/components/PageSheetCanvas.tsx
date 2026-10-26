// apps/admin-web/src/modules/scans/components/PageSheetCanvas.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { ScanPageItem } from '../lib/samplePages';
import styles from './ScanWizard.module.css';

interface PageSheetCanvasProps {
  page: ScanPageItem;
  pageIndex: number;
  totalPages: number;
  zoom: number; // e.g. 100 for 100%
}

export function PageSheetCanvas({ page, pageIndex, totalPages, zoom }: PageSheetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (!active) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rot = ((page.rotation % 360) + 360) % 360;
      const isQuarterTurn = rot === 90 || rot === 270;
      const width = isQuarterTurn ? img.naturalHeight : img.naturalWidth;
      const height = isQuarterTurn ? img.naturalWidth : img.naturalHeight;

      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError(true);
        setLoading(false);
        return;
      }

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      setLoading(false);
    };

    img.onerror = () => {
      if (!active) return;
      setError(true);
      setLoading(false);
    };

    img.src = page.url;

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

      <div className={styles.pageCanvasWrapper}>
        {loading && (
          <div className={styles.pageLoadingSkeleton}>
            <span className={styles.loadingSpinner} />
            <span>Rendering page {pageIndex + 1}...</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={styles.pageCanvas}
          style={{ display: loading || error ? 'none' : 'block' }}
        />
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
