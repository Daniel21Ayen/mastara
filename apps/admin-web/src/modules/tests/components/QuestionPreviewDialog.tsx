// apps/admin-web/src/modules/tests/components/QuestionPreviewDialog.tsx
'use client';

import { useState } from 'react';
import { BLANK_MARKER } from '@mastara/domain';

import { adminText } from '@/core/i18n';
import { KaTeXRenderer } from '@/shared/math';
import { Button, Icon, Modal } from '@/shared/ui';

import type { QuestionFormState } from '../lib/questionForm';
import styles from './QuestionPreviewDialog.module.css';

/**
 * "Preview as student": renders the question in simulated student UI state.
 * Strips correct-answer indicators and teacher rubrics.
 * Supports Desktop vs Mobile (375px) viewport toggling.
 */
export function QuestionPreviewDialog({
  question,
  onClose,
}: {
  question: QuestionFormState;
  onClose: () => void;
}) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [tfSelection, setTfSelection] = useState<boolean | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');

  const options = question.options.filter((option) => option.trim() !== '');

  return (
    <Modal title={adminText('admin.content.preview.title')} onClose={onClose} wide>
      <div className={`${styles.previewWrapper} ${viewport === 'mobile' ? styles.mobileViewport : ''}`}>
        {/* Viewport Control Bar */}
        <div className={styles.viewportBar}>
          <div className={styles.simNotice}>
            <Icon name="eye" size={14} />
            <span>Student Simulation (Correct answers hidden)</span>
          </div>

          <div className={styles.viewportToggle}>
            <button
              type="button"
              className={`${styles.viewportBtn} ${viewport === 'desktop' ? styles.viewportBtnActive : ''}`}
              onClick={() => setViewport('desktop')}
              title="Desktop View"
            >
              <Icon name="monitor" size={14} />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              className={`${styles.viewportBtn} ${viewport === 'mobile' ? styles.viewportBtnActive : ''}`}
              onClick={() => setViewport('mobile')}
              title="Mobile View (375px)"
            >
              <Icon name="smartphone" size={14} />
              <span>Mobile</span>
            </button>
          </div>
        </div>

        {/* Question Surface */}
        <div className={styles.preview}>
          <h3 className={styles.title}>
            {question.title || adminText('admin.content.preview.noTitle')}
          </h3>

          <div className={styles.prompt}>
            <KaTeXRenderer
              text={question.prompt.split(BLANK_MARKER).join('_____')}
              emptyFallback={adminText('admin.content.preview.empty')}
            />
          </div>

          {question.form === 'MULTIPLE_CHOICE' ? (
            <ul className={styles.choices}>
              {options.map((option, index) => {
                const isSelected = selectedOption === index;
                return (
                  <li
                    key={`${index}-${option}`}
                    className={`${styles.choice} ${isSelected ? styles.choiceSelected : ''}`}
                    onClick={() => setSelectedOption(index)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className={`${styles.letter} ${isSelected ? styles.letterActive : ''}`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className={styles.choiceText}>
                      <KaTeXRenderer text={option} />
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {question.form === 'TRUE_FALSE' ? (
            <div className={styles.tfContainer}>
              <button
                type="button"
                className={`${styles.tfBtn} ${tfSelection === true ? styles.tfBtnActive : ''}`}
                onClick={() => setTfSelection(true)}
              >
                {adminText('admin.tests.true')}
              </button>
              <button
                type="button"
                className={`${styles.tfBtn} ${tfSelection === false ? styles.tfBtnActive : ''}`}
                onClick={() => setTfSelection(false)}
              >
                {adminText('admin.tests.false')}
              </button>
            </div>
          ) : null}

          {question.form === 'SHORT_ANSWER' || question.form === 'BLANK_SPACE' ? (
            <div className={styles.inputContainer}>
              <input
                type="text"
                className={styles.simInput}
                placeholder={adminText('admin.tests.preview.typeAnswer')}
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
              />
            </div>
          ) : null}

          <div className={styles.buttons}>
            <Button variant="outline" onClick={onClose}>
              {adminText('admin.common.close')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
