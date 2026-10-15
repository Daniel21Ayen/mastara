// apps/admin-web/src/modules/scans/components/AnswersEditor.tsx
'use client';

import { fileSizeText, QUESTION_FORMS, SCAN_ANSWERS_MAX, SCAN_FILE_TYPES } from '@mastara/domain';
import { useRef } from 'react';

import { adminText } from '@/core/i18n';
import { Button, Icon, SelectField, TextArea, TextField } from '@/shared/ui';

import { emptyAnswer, toItem } from '../lib/scanForm';
import type { AnswerItem } from '../lib/scanForm';

import styles from './Scans.module.css';

interface AnswersEditorProps {
  answers: readonly AnswerItem[];
  /** Exam answers also name the question type. */
  withType: boolean;
  /** Messages by "index.field", for example "0.text". */
  errors: Readonly<Record<string, string | undefined>>;
  onChange: (answers: AnswerItem[]) => void;
  onRejected: (problems: string[]) => void;
}

function AttachButton({
  index,
  answer,
  onPick,
  onClear,
  onRejected,
}: {
  index: number;
  answer: AnswerItem;
  onPick: (file: AnswerItem['file']) => void;
  onClear: () => void;
  onRejected: (problems: string[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={styles.attach}>
      <input
        ref={input}
        type="file"
        hidden
        accept={SCAN_FILE_TYPES.join(',')}
        aria-label={adminText('admin.scans.answers.fileInput', { n: index + 1 })}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            const result = toItem(file);
            if ('item' in result) onPick(result.item);
            else
              onRejected([
                adminText(
                  result.problem === 'type'
                    ? 'admin.scans.file.badType'
                    : 'admin.scans.file.tooBig',
                  { name: result.name },
                ),
              ]);
          }
          if (input.current) input.current.value = '';
        }}
      />
      {answer.file ? (
        <span className={styles.attached}>
          {answer.file.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={answer.file.url} alt="" className={styles.smallThumb} />
          ) : (
            <Icon name="note" size={18} />
          )}
          {answer.file.file.name} · {fileSizeText(answer.file.file.sizeBytes)}
          <button
            type="button"
            className={styles.remove}
            aria-label={adminText('admin.scans.answers.removeFile', { n: index + 1 })}
            onClick={onClear}
          >
            <Icon name="trash" size={18} />
          </button>
        </span>
      ) : (
        <Button variant="outline" onClick={() => input.current?.click()}>
          <Icon name="plus" size={18} />
          {adminText('admin.scans.answers.attach')}
        </Button>
      )}
    </div>
  );
}

/** One row per question: its ID, an answer typed with the keyboard, an attached image or PDF, or both. */
export function AnswersEditor({
  answers,
  withType,
  errors,
  onChange,
  onRejected,
}: AnswersEditorProps) {
  const edit = (index: number, change: Partial<AnswerItem>) =>
    onChange(answers.map((answer, i) => (i === index ? { ...answer, ...change } : answer)));

  return (
    <div className={styles.answers}>
      {answers.map((answer, index) => (
        <fieldset key={answer.key} className={styles.answer}>
          <legend className={styles.legend}>
            {adminText('admin.scans.answers.question', { n: index + 1 })}
          </legend>
          <div className={styles.answerTop}>
            <TextField
              label={adminText('admin.scans.field.questionId')}
              autoComplete="off"
              value={answer.questionId}
              onChange={(event) => edit(index, { questionId: event.target.value })}
              error={errors[`${index}.questionId`]}
            />
            {withType ? (
              <SelectField
                label={adminText('admin.scans.field.questionType')}
                placeholder={adminText('admin.scans.field.selectType')}
                options={QUESTION_FORMS.map((value) => ({
                  value,
                  label: adminText(`admin.tests.type.${value}`),
                }))}
                value={answer.questionType}
                onChange={(event) =>
                  edit(index, { questionType: event.target.value as AnswerItem['questionType'] })
                }
                error={errors[`${index}.questionType`]}
              />
            ) : null}
            <button
              type="button"
              className={styles.remove}
              disabled={answers.length <= 1}
              aria-label={adminText('admin.scans.answers.remove', { n: index + 1 })}
              onClick={() => onChange(answers.filter((item) => item.key !== answer.key))}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
          <TextArea
            label={adminText('admin.scans.field.answer')}
            rows={2}
            value={answer.text}
            onChange={(event) => edit(index, { text: event.target.value })}
            error={errors[`${index}.text`]}
          />
          <AttachButton
            index={index}
            answer={answer}
            onPick={(file) => edit(index, { file })}
            onClear={() => edit(index, { file: null })}
            onRejected={onRejected}
          />
        </fieldset>
      ))}
      <div>
        <Button
          variant="outline"
          disabled={answers.length >= SCAN_ANSWERS_MAX}
          onClick={() => onChange([...answers, emptyAnswer()])}
        >
          <Icon name="plus" size={18} />
          {adminText('admin.scans.answers.add')}
        </Button>
      </div>
    </div>
  );
}
