// apps/admin-web/src/modules/tests/components/AnswerList.tsx
import { adminText } from '@/core/i18n';
import { Button, Icon } from '@/shared/ui';

import styles from './Editor.module.css';

interface AnswerListProps {
  answers: readonly string[];
  error?: string;
  onChange: (answers: string[]) => void;
}

/** Accepted answers for Short Answer and Blank Space: a student's answer counts if it matches one. */
export function AnswerList({ answers, error, onChange }: AnswerListProps) {
  return (
    <fieldset className={styles.options}>
      <legend className={styles.legend}>{adminText('admin.tests.answers')}</legend>
      <p className={styles.hint}>{adminText('admin.tests.answersHint')}</p>
      {answers.map((answer, index) => (
        <div key={index} className={styles.optionRow}>
          <input
            className={styles.optionInput}
            aria-label={adminText('admin.tests.answerN', { n: index + 1 })}
            placeholder={adminText('admin.tests.answerN', { n: index + 1 })}
            autoComplete="off"
            value={answer}
            onChange={(event) =>
              onChange(answers.map((item, i) => (i === index ? event.target.value : item)))
            }
          />
          <button
            type="button"
            className={styles.remove}
            aria-label={adminText('admin.tests.removeAnswer', { n: index + 1 })}
            disabled={answers.length <= 1}
            onClick={() => onChange(answers.filter((_, i) => i !== index))}
          >
            <Icon name="trash" size={18} />
          </button>
        </div>
      ))}
      {error ? <p className={styles.error}>{error}</p> : null}
      <div>
        <Button
          variant="outline"
          disabled={answers.length >= 10}
          onClick={() => onChange([...answers, ''])}
        >
          <Icon name="plus" size={18} />
          {adminText('admin.tests.addAnswer')}
        </Button>
      </div>
    </fieldset>
  );
}
