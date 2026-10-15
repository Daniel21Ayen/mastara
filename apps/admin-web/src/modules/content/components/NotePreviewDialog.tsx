// apps/admin-web/src/modules/content/components/NotePreviewDialog.tsx
'use client';

import { CONTENT_LANGS } from '@mastara/domain';
import type { ContentLang } from '@mastara/domain';
import { useState } from 'react';

import { adminText } from '@/core/i18n';
import { Button, Modal } from '@/shared/ui';

import styles from './EditorDialog.module.css';
import { RichPreview } from './RichPreview';

interface NotePreviewDialogProps {
  title: { en: string; am: string };
  body: { en: string; am: string };
  /** Language to open in. */
  lang?: ContentLang;
  onClose: () => void;
}

/** "Review as student": the note as the student reads it, in either language. */
export function NotePreviewDialog({ title, body, lang = 'en', onClose }: NotePreviewDialogProps) {
  const [shown, setShown] = useState<ContentLang>(lang);
  return (
    <Modal title={adminText('admin.content.preview.title')} onClose={onClose} wide>
      <div className={styles.preview}>
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
        <h3 className={styles.previewTitle} lang={shown}>
          {title[shown] || adminText('admin.content.preview.noTitle')}
        </h3>
        <RichPreview
          text={body[shown]}
          lang={shown}
          empty={adminText('admin.content.preview.empty')}
        />
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
