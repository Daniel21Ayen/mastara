// apps/admin-web/src/modules/tests/components/QuestionPreviewDialog.tsx
'use client';

import { BLANK_MARKER } from '@mastara/domain';

import { adminText } from '@/core/i18n';
import { RichPreview } from '@/modules/content';
import { Button, Modal } from '@/shared/ui';

import type { QuestionFormState } from '../lib/questionForm';

import styles from './QuestionPreviewDialog.module.css';

/** "Review as student": the question as the quiz shows it, with the right answer noted for the admin. */
export function QuestionPreviewDialog({
  question,
  onClose,
}: {
  question: QuestionFormState;
  onClose: () => void;
}) {
  const options = question.options.filter((option) => option.trim() !== '');
  const correct =
    question.form === 'MULTIPLE_CHOICE'
      ? (question.options[question.correctOption ?? -1] ?? '')
      : question.form === 'TRUE_FALSE'
        ? question.trueIsCorrect === null
          ? ''
          : adminText(question.trueIsCorrect ? 'admin.tests.true' : 'admin.tests.false')
        : question.acceptedAnswers.filter((answer) => answer.trim() !== '').join(', ');

  return (
    <Modal title={adminText('admin.content.preview.title')} onClose={onClose} wide>
      <div className={styles.preview}>
        <h3 className={styles.title}>
          {question.title || adminText('admin.content.preview.noTitle')}
        </h3>
        <RichPreview
          text={question.prompt.split(BLANK_MARKER).join('_____')}
          lang="en"
          empty={adminText('admin.content.preview.empty')}
        />
        {question.form === 'MULTIPLE_CHOICE' ? (
          <ul className={styles.choices}>
            {options.map((option, index) => (
              <li key={`${index}-${option}`} className={styles.choice}>
                <span className={styles.letter}>{String.fromCharCode(65 + index)}</span>
                {option}
              </li>
            ))}
          </ul>
        ) : null}
        {question.form === 'TRUE_FALSE' ? (
          <ul className={styles.choices}>
            {(['admin.tests.true', 'admin.tests.false'] as const).map((key) => (
              <li key={key} className={styles.choice}>
                {adminText(key)}
              </li>
            ))}
          </ul>
        ) : null}
        {question.form === 'SHORT_ANSWER' || question.form === 'BLANK_SPACE' ? (
          <p className={styles.answerBox}>{adminText('admin.tests.preview.typeAnswer')}</p>
        ) : null}
        <p className={styles.hint}>
          {correct
            ? adminText('admin.tests.preview.correct', { answer: correct })
            : adminText('admin.tests.preview.noCorrect')}
        </p>
        <div className={styles.buttons}>
          <Button variant="outline" onClick={onClose}>
            {adminText('admin.common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
