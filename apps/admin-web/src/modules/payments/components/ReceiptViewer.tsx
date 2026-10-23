// apps/admin-web/src/modules/payments/components/ReceiptViewer.tsx
'use client';

import type { AdminPayment } from '@mastara/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';

import { env } from '@/core/config/env';
import { formatDate } from '@/core/format';
import { adminText } from '@/core/i18n';
import { Button } from '@/shared/ui';

import { amountText } from '../lib/paymentText';

import styles from './Payments.module.css';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4.0;
const ZOOM_STEP = 0.25;

/**
 * Advanced Payment Receipt Inspector.
 * Renders the student's real bank slip screenshot (CBE Mobile / Telebirr) with smooth
 * pan, zoom, rotation, and fullscreen lightbox modal. Gracefully falls back to a structured
 * digital paper slip when no screenshot is uploaded or during mock testing.
 */
export function ReceiptViewer({ payment }: { payment: AdminPayment }) {
  const [zoom, setZoom] = useState(1);
  const [turns, setTurns] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgError, setImgError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Lightbox-specific zoom/pan states
  const [lightboxZoom, setLightboxZoom] = useState(1.25);
  const [lightboxTurns, setLightboxTurns] = useState(0);
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 });
  const [lightboxDragging, setLightboxDragging] = useState(false);
  const [lightboxDragStart, setLightboxDragStart] = useState({ x: 0, y: 0 });

  const lightboxDialogRef = useRef<HTMLDialogElement>(null);

  // Build accessible image URL
  const rawKeyOrUrl = payment.imageUrl || payment.imageKey;
  let resolvedUrl: string | null = null;
  if (rawKeyOrUrl && !imgError) {
    if (rawKeyOrUrl.startsWith('http://') || rawKeyOrUrl.startsWith('https://') || rawKeyOrUrl.startsWith('blob:') || rawKeyOrUrl.startsWith('data:')) {
      resolvedUrl = rawKeyOrUrl;
    } else {
      const base = env.apiUrl.replace(/\/$/, '');
      if (rawKeyOrUrl.startsWith('/')) {
        resolvedUrl = `${base}${rawKeyOrUrl}`;
      } else {
        resolvedUrl = `${base}/api/v1/storage/file?key=${encodeURIComponent(rawKeyOrUrl)}`;
      }
    }
  }

  // Manage native dialog open/close
  useEffect(() => {
    const dialog = lightboxDialogRef.current;
    if (!dialog) return;
    if (isLightboxOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isLightboxOpen && dialog.open) {
      dialog.close();
    }
  }, [isLightboxOpen]);

  // Handle ESC key for modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  // Copy reference code to clipboard
  const handleCopyRef = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(payment.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write rejection
    }
  }, [payment.reference]);

  // Reset viewport
  const handleReset = useCallback(() => {
    setZoom(1);
    setTurns(0);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleLightboxReset = useCallback(() => {
    setLightboxZoom(1.25);
    setLightboxTurns(0);
    setLightboxPan({ x: 0, y: 0 });
  }, []);

  // Inline Stage Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Primary click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom on inline stage
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setZoom((prev) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((prev + delta) * 100) / 100)));
  };

  // Lightbox Mouse Drag Handlers
  const handleLightboxMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setLightboxDragging(true);
    setLightboxDragStart({ x: e.clientX - lightboxPan.x, y: e.clientY - lightboxPan.y });
  };

  const handleLightboxMouseMove = (e: React.MouseEvent) => {
    if (!lightboxDragging) return;
    setLightboxPan({ x: e.clientX - lightboxDragStart.x, y: e.clientY - lightboxDragStart.y });
  };

  const handleLightboxMouseUp = () => setLightboxDragging(false);

  const handleLightboxWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setLightboxZoom((prev) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((prev + delta) * 100) / 100)));
  };

  const paperRows: Array<[string, string]> = [
    [adminText('admin.payments.receipt.from'), payment.studentName],
    [adminText('admin.payments.receipt.to'), adminText('admin.payments.receipt.account')],
    [adminText('admin.payments.receipt.amount'), amountText(payment.amount)],
    [adminText('admin.payments.receipt.reference'), payment.reference],
    [adminText('admin.payments.receipt.date'), formatDate(payment.createdAt)],
  ];

  return (
    <div className={styles.viewer}>
      {/* Inspector Top Meta Bar */}
      <div className={styles.inspectorHeader}>
        <div className={styles.quickActions}>
          <span className={`${styles.typeBadge} ${!resolvedUrl ? styles.typeBadgeFallback : ''}`}>
            {resolvedUrl
              ? `📷 ${adminText('admin.payments.receipt.uploadedScreenshot')}`
              : `📄 ${adminText('admin.payments.receipt.digitalSlip')}`}
          </span>
          {payment.imageSizeBytes ? (
            <span className={styles.typeBadge}>
              {(payment.imageSizeBytes / 1024).toFixed(1)} KB
            </span>
          ) : null}
        </div>

        <div className={styles.quickActions}>
          <Button
            variant="outline"
            onClick={handleCopyRef}
            title={adminText('admin.payments.receipt.copyRef')}
          >
            {copied ? `✓ ${adminText('admin.payments.receipt.copied')}` : `📋 ${payment.reference}`}
          </Button>

          {resolvedUrl && (
            <Button
              variant="outline"
              onClick={() => {
                setLightboxTurns(turns);
                setLightboxZoom(Math.max(1.25, zoom));
                setLightboxPan({ x: 0, y: 0 });
                setIsLightboxOpen(true);
              }}
              title={adminText('admin.payments.receipt.fullscreen')}
            >
              ⛶ {adminText('admin.payments.receipt.fullscreen')}
            </Button>
          )}

          {resolvedUrl && (
            <a
              href={`${resolvedUrl}&download=true`}
              download={`receipt-${payment.reference}.jpg`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" title={adminText('admin.payments.receipt.download')}>
                📥
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Main Inspector Toolbar */}
      <div className={styles.toolbar} role="group" aria-label={adminText('admin.payments.receipt.tools')}>
        <div className={styles.toolGroup}>
          <Button
            variant="outline"
            aria-label={adminText('admin.payments.receipt.zoomOut')}
            disabled={zoom <= ZOOM_MIN}
            onClick={() => setZoom((v) => Math.max(ZOOM_MIN, Math.round((v - ZOOM_STEP) * 100) / 100))}
          >
            −
          </Button>
          <span className={styles.zoomText} aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            aria-label={adminText('admin.payments.receipt.zoomIn')}
            disabled={zoom >= ZOOM_MAX}
            onClick={() => setZoom((v) => Math.min(ZOOM_MAX, Math.round((v + ZOOM_STEP) * 100) / 100))}
          >
            +
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            {adminText('admin.payments.receipt.actualSize')}
          </Button>
        </div>

        <div className={styles.toolGroup}>
          <Button
            variant="outline"
            aria-label={adminText('admin.payments.receipt.rotateLeft')}
            onClick={() => setTurns((v) => v - 1)}
          >
            ↺
          </Button>
          <Button
            variant="outline"
            aria-label={adminText('admin.payments.receipt.rotateRight')}
            onClick={() => setTurns((v) => v + 1)}
          >
            ↻
          </Button>
          <Button variant="outline" onClick={handleReset}>
            {adminText('admin.payments.receipt.reset')}
          </Button>
        </div>
      </div>

      {/* Viewing Stage */}
      <div
        className={`${styles.stage} ${resolvedUrl ? (isDragging ? styles.stageDragging : styles.stageDraggable) : ''}`}
        onMouseDown={resolvedUrl ? handleMouseDown : undefined}
        onMouseMove={resolvedUrl ? handleMouseMove : undefined}
        onMouseUp={resolvedUrl ? handleMouseUp : undefined}
        onMouseLeave={resolvedUrl ? handleMouseUp : undefined}
        onWheel={resolvedUrl ? handleWheel : undefined}
      >
        {resolvedUrl ? (
          <div
            className={styles.imageCanvas}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) rotate(${turns * 90}deg) scale(${zoom})`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedUrl}
              alt={adminText('admin.payments.receipt.alt', { name: payment.studentName })}
              className={styles.receiptImg}
              onError={() => setImgError(true)}
              draggable={false}
            />
          </div>
        ) : (
          <div
            className={styles.paper}
            role="img"
            aria-label={adminText('admin.payments.receipt.alt', { name: payment.studentName })}
            data-zoom={zoom}
            data-turns={turns}
            style={{ transform: `rotate(${turns * 90}deg) scale(${zoom})` }}
          >
            <p className={styles.paperTitle}>{adminText(`admin.payments.method.${payment.method}`)}</p>
            <p className={styles.paperOk}>{adminText('admin.payments.receipt.success')}</p>
            <dl className={styles.paperRows}>
              {paperRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {resolvedUrl && (
          <>
            <div className={styles.stageOverlayInfo}>
              <span>{amountText(payment.amount)}</span>
              <span>•</span>
              <span>{adminText(`admin.payments.method.${payment.method}`)}</span>
            </div>
            <div className={styles.stageHint}>Drag to Pan • Scroll to Zoom</div>
          </>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      <dialog
        ref={lightboxDialogRef}
        className={styles.lightboxDialog}
        onCancel={(e) => {
          e.preventDefault();
          setIsLightboxOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsLightboxOpen(false);
        }}
      >
        <div className={styles.lightboxCard}>
          <div className={styles.lightboxHeader}>
            <div>
              <h2 className={styles.lightboxTitle}>
                {adminText('admin.payments.receipt.alt', { name: payment.studentName })}
              </h2>
              <p className={styles.lightboxSubtitle}>
                {payment.reference} • {amountText(payment.amount)} •{' '}
                {adminText(`admin.payments.method.${payment.method}`)} • {formatDate(payment.createdAt)}
              </p>
            </div>

            <div className={styles.quickActions}>
              <Button variant="outline" onClick={handleCopyRef}>
                {copied ? `✓ ${adminText('admin.payments.receipt.copied')}` : `📋 ${payment.reference}`}
              </Button>
              {resolvedUrl && (
                <a
                  href={`${resolvedUrl}&download=true`}
                  download={`receipt-${payment.reference}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline">📥 {adminText('admin.payments.receipt.download')}</Button>
                </a>
              )}
              <Button variant="outline" onClick={() => setIsLightboxOpen(false)}>
                ✕ Close
              </Button>
            </div>
          </div>

          <div className={styles.lightboxBody}>
            {/* Lightbox Controls */}
            <div className={styles.toolbar}>
              <div className={styles.toolGroup}>
                <Button
                  variant="outline"
                  disabled={lightboxZoom <= ZOOM_MIN}
                  onClick={() =>
                    setLightboxZoom((v) => Math.max(ZOOM_MIN, Math.round((v - ZOOM_STEP) * 100) / 100))
                  }
                >
                  −
                </Button>
                <span className={styles.zoomText}>{Math.round(lightboxZoom * 100)}%</span>
                <Button
                  variant="outline"
                  disabled={lightboxZoom >= ZOOM_MAX}
                  onClick={() =>
                    setLightboxZoom((v) => Math.min(ZOOM_MAX, Math.round((v + ZOOM_STEP) * 100) / 100))
                  }
                >
                  +
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLightboxZoom(1);
                    setLightboxPan({ x: 0, y: 0 });
                  }}
                >
                  {adminText('admin.payments.receipt.actualSize')}
                </Button>
              </div>

              <div className={styles.toolGroup}>
                <Button variant="outline" onClick={() => setLightboxTurns((v) => v - 1)}>
                  ↺
                </Button>
                <Button variant="outline" onClick={() => setLightboxTurns((v) => v + 1)}>
                  ↻
                </Button>
                <Button variant="outline" onClick={handleLightboxReset}>
                  {adminText('admin.payments.receipt.reset')}
                </Button>
              </div>
            </div>

            {/* Lightbox Stage */}
            <div
              className={`${styles.stage} ${styles.lightboxStage} ${
                lightboxDragging ? styles.stageDragging : styles.stageDraggable
              }`}
              onMouseDown={handleLightboxMouseDown}
              onMouseMove={handleLightboxMouseMove}
              onMouseUp={handleLightboxMouseUp}
              onMouseLeave={handleLightboxMouseUp}
              onWheel={handleLightboxWheel}
            >
              {resolvedUrl && (
                <div
                  className={styles.imageCanvas}
                  style={{
                    transform: `translate(${lightboxPan.x}px, ${lightboxPan.y}px) rotate(${
                      lightboxTurns * 90
                    }deg) scale(${lightboxZoom})`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolvedUrl}
                    alt={adminText('admin.payments.receipt.alt', { name: payment.studentName })}
                    className={`${styles.receiptImg} ${styles.lightboxImg}`}
                    draggable={false}
                  />
                </div>
              )}
              <div className={styles.stageHint}>Drag to Pan • Scroll to Zoom • ESC to Close</div>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}

