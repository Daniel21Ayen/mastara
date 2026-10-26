// apps/admin-web/src/modules/scans/lib/pdfGenerator.ts
import { PDFDocument } from 'pdf-lib';
import type { ScanPageItem } from './samplePages';

/**
 * Render a ScanPageItem (handling rotation) to an HTML5 Canvas.
 */
export async function renderPageToCanvas(page: ScanPageItem): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const rot = ((page.rotation % 360) + 360) % 360;
      const isQuarterTurn = rot === 90 || rot === 270;
      const width = isQuarterTurn ? img.naturalHeight : img.naturalWidth;
      const height = isQuarterTurn ? img.naturalWidth : img.naturalHeight;

      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      resolve(canvas);
    };

    img.onerror = (err) => reject(new Error(`Failed to load image: ${page.name}`));
    img.src = page.url;
  });
}

/**
 * Convert canvas to PNG blob.
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert canvas to blob'));
    }, 'image/png');
  });
}

export interface GeneratedPdfResult {
  blob: Blob;
  url: string;
  sizeBytes: number;
}

/**
 * Compiles an array of ScanPageItems into a single real PDF Document.
 */
export async function generatePdfFromPages(
  pages: readonly ScanPageItem[],
  title: string,
): Promise<GeneratedPdfResult> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(title);
  pdfDoc.setCreator('Mastara Enterprise Platform');
  pdfDoc.setProducer('Mastara Scan-to-PDF Engine');

  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;

  for (const page of pages) {
    try {
      const canvas = await renderPageToCanvas(page);
      const pngBlob = await canvasToBlob(canvas);
      const pngBytes = await pngBlob.arrayBuffer();
      const embeddedPng = await pdfDoc.embedPng(pngBytes);

      // Fit on standard A4 page with 20pt margin
      const margin = 20;
      const maxWidth = A4_WIDTH - margin * 2;
      const maxHeight = A4_HEIGHT - margin * 2;

      const scale = Math.min(maxWidth / embeddedPng.width, maxHeight / embeddedPng.height, 1);
      const drawWidth = embeddedPng.width * scale;
      const drawHeight = embeddedPng.height * scale;

      const x = (A4_WIDTH - drawWidth) / 2;
      const y = (A4_HEIGHT - drawHeight) / 2;

      const pdfPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      pdfPage.drawImage(embeddedPng, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    } catch (pageErr) {
      console.warn(`Could not embed page '${page.name}' in PDF:`, pageErr);
      // Fallback empty page with error notice
      const pdfPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      pdfPage.drawText(`[Page: ${page.name}]`, { x: 50, y: A4_HEIGHT - 50, size: 14 });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    sizeBytes: blob.size,
  };
}
