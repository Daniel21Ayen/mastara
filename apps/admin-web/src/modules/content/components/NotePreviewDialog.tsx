// apps/admin-web/src/modules/content/components/NotePreviewDialog.tsx
'use client';

import { CONTENT_LANGS } from '@mastara/domain';
import type { ContentLang } from '@mastara/domain';
import { useState } from 'react';

import { adminText } from '@/core/i18n';
import { Button, Icon, Modal } from '@/shared/ui';

import styles from './EditorDialog.module.css';
import { RichPreview } from './RichPreview';

interface NotePreviewDialogProps {
  title: { en: string; am: string };
  body: { en: string; am: string };
  /** Language to open in. */
  lang?: ContentLang;
  onClose: () => void;
}

/** "Review as student": the note as the student reads it, in either language, with Desktop/Mobile preview modes. */
export function NotePreviewDialog({ title, body, lang = 'en', onClose }: NotePreviewDialogProps) {
  const [shown, setShown] = useState<ContentLang>(lang);
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <Modal title={adminText('admin.content.preview.title')} onClose={onClose} wide>
      <div className={styles.preview}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className={styles.langs}>
            {CONTENT_LANGS.map((value) => (
              <Button
                key={value}
                variant={shown === value ? 'primary' : 'outline'}
                aria-pressed={shown === value}
                onClick={() => setShown(value)}
              >
                {adminText(`admin.content.lang.${value}`)}
              </Button>
            ))}
          </div>

          <div style={{ display: 'inline-flex', background: 'var(--color-surface-subtle)', padding: '3px', borderRadius: '8px', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: viewport === 'desktop' ? 'var(--color-surface)' : 'transparent',
                color: viewport === 'desktop' ? 'var(--color-text)' : 'var(--color-text-muted)',
                boxShadow: viewport === 'desktop' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Icon name="monitor" size={14} />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: viewport === 'mobile' ? 'var(--color-surface)' : 'transparent',
                color: viewport === 'mobile' ? 'var(--color-text)' : 'var(--color-text-muted)',
                boxShadow: viewport === 'mobile' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Icon name="smartphone" size={14} />
              Mobile (375px)
            </button>
          </div>
        </div>

        <div
          style={{
            maxWidth: viewport === 'mobile' ? '375px' : '100%',
            margin: viewport === 'mobile' ? '0 auto' : undefined,
            transition: 'max-width 0.2s ease',
            border: viewport === 'mobile' ? '2px solid var(--color-border)' : 'none',
            borderRadius: viewport === 'mobile' ? '18px' : '0',
            padding: viewport === 'mobile' ? '1.25rem' : '0',
            background: viewport === 'mobile' ? 'var(--color-surface)' : 'transparent',
          }}
        >
        <h3 className={styles.previewTitle} lang={shown}>
          {title[shown] || adminText('admin.content.preview.noTitle')}
        </h3>
        <RichPreview
          text={body[shown]}
          lang={shown}
          empty={adminText('admin.content.preview.empty')}
        />
        </div>
        <p className={styles.hint}>{adminText('admin.content.preview.hint')}</p>
        <div className={styles.buttons}>
          <Button variant="outline" onClick={onClose}>
            {adminText('admin.common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
