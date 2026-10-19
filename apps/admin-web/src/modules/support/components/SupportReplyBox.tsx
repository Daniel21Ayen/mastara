// apps/admin-web/src/modules/support/components/SupportReplyBox.tsx
'use client';

import React, { useState } from 'react';
import { adminText } from '@/core/i18n';
import { Icon } from '@/shared/ui';
import styles from './Support.module.css';

interface SupportReplyBoxProps {
  onSendReply: (text: string) => Promise<void>;
  busy?: boolean;
}

const QUICK_TEMPLATES = [
  {
    label: 'Device Unbound',
    text: 'Dear student, we have released your previous device binding. You may now log in to your account from your new phone without restriction.',
  },
  {
    label: 'Payment Verified',
    text: 'Hello, your bank transfer reference has been verified by the billing team and your bundle access has been unlocked. Please pull down to refresh in your app.',
  },
  {
    label: 'Exam Reset',
    text: 'Greetings, we reviewed the system logs for the reported connectivity disruption and have reset your exam attempt. You may now retake it from the Assessments tab.',
  },
  {
    label: 'New Scans Uploaded',
    text: 'Hi, our content team has re-scanned and published higher-clarity OCR materials for this chapter. Please pull down to refresh on your mobile screen.',
  },
  {
    label: 'Investigating',
    text: 'Thank you for bringing this to our attention. We have escalated the issue to our engineering team and will follow up with you as soon as possible.',
  },
];

export function SupportReplyBox({ onSendReply, busy = false }: SupportReplyBoxProps) {
  const [text, setText] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || busy || text.length > 1000) return;
    await onSendReply(text);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charsLeft = 1000 - text.length;

  return (
    <div className={styles.replyArea}>
      <div className={styles.templatesRow}>
        <span className={styles.templatesLabel}>{adminText('admin.support.quickTemplates')}:</span>
        {QUICK_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.label}
            type="button"
            className={styles.templateChip}
            onClick={() => setText(tmpl.text)}
          >
            {tmpl.label}
          </button>
        ))}
      </div>

      <div className={styles.replyInputWrap}>
        <textarea
          className={styles.replyTextarea}
          placeholder={adminText('admin.support.replyPlaceholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={1000}
          rows={3}
          disabled={busy}
        />

        <div className={styles.replyBottomBar}>
          <span className={styles.replyHint}>
            Press <kbd style={{ background: 'var(--color-text-soft)', padding: '2px 5px', borderRadius: '4px' }}>Ctrl + Enter</kbd> to send
          </span>

          <div className={styles.replyActions}>
            <span className={styles.charCount}>
              {text.length}/1000
            </span>

            <button
              type="button"
              className={styles.sendBtn}
              onClick={() => handleSubmit()}
              disabled={busy || !text.trim() || text.length > 1000}
            >
              <Icon name="send" size={15} />
              <span>{busy ? 'Sending...' : adminText('admin.support.sendReply')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
