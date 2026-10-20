// apps/admin-web/src/modules/content/components/SavedScanPickerModal.tsx
'use client';

import { useState } from 'react';
import { Icon } from '@/shared/ui';

interface SavedScanItem {
  id: string;
  title: string;
  course: string;
  pagesCount: number;
  sizeKb: number;
  date: string;
}

const DEFAULT_SAVED_SCANS: SavedScanItem[] = [
  {
    id: 'scan-01',
    title: 'English_Grammar_Handwritten_Notes.pdf',
    course: 'Communicative English',
    pagesCount: 6,
    sizeKb: 1420,
    date: 'Oct 19, 2026',
  },
  {
    id: 'scan-02',
    title: 'Vocabulary_Context_Diagrams_Scan.pdf',
    course: 'Communicative English',
    pagesCount: 4,
    sizeKb: 980,
    date: 'Oct 18, 2026',
  },
  {
    id: 'scan-03',
    title: 'Human_Geography_Regional_Cartography.pdf',
    course: 'Introduction to Human Geography',
    pagesCount: 8,
    sizeKb: 2150,
    date: 'Oct 15, 2026',
  },
  {
    id: 'scan-04',
    title: 'Physics_Electromagnetism_Solved_Problems.pdf',
    course: 'General Physics',
    pagesCount: 12,
    sizeKb: 3400,
    date: 'Oct 12, 2026',
  },
];

interface SavedScanPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScan: (name: string, sizeKb: number) => void;
}

export function SavedScanPickerModal({
  isOpen,
  onClose,
  onSelectScan,
}: SavedScanPickerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = DEFAULT_SAVED_SCANS.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.course.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '560px',
          borderRadius: '14px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#1a56db' }}>
              <Icon name="scan" size={20} />
            </span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Select Scanned PDF to Attach
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2rem',
              color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <input
            type="text"
            placeholder="Search saved scans by title or course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              marginBottom: '14px',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {filtered.map((scan) => (
              <div
                key={scan.id}
                onClick={() => {
                  onSelectScan(scan.title, scan.sizeKb);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="scan" size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                      {scan.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {scan.course} · {scan.pagesCount} pages · {scan.sizeKb} KB
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#1a56db',
                    cursor: 'pointer',
                  }}
                >
                  Attach
                </button>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
