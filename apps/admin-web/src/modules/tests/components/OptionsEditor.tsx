// apps/admin-web/src/modules/tests/components/OptionsEditor.tsx
import { OPTIONS_MAX, OPTIONS_MIN } from '@mastara/domain';

import { adminText } from '@/core/i18n';
import { Button, Icon, SelectField } from '@/shared/ui';

import styles from './Editor.module.css';

interface OptionsEditorProps {
  options: readonly string[];
  correctOption: number | null;
  optionsError?: string;
  correctError?: string;
  onChange: (options: string[], correctOption: number | null) => void;
}

/** Multiple-choice answers: one radio per option marks the right one, and a select mirrors it. */
export function OptionsEditor({
  options,
  correctOption,
  optionsError,
  correctError,
  onChange,
}: OptionsEditorProps) {
  const edit = (index: number, value: string) =>
    onChange(
      options.map((option, i) => (i === index ? value : option)),
      correctOption,
    );

  const remove = (index: number) => {
    const next = options.filter((_, i) => i !== index);
    const correct =
      correctOption === null || correctOption === index
        ? null
        : correctOption > index
          ? correctOption - 1
          : correctOption;
    onChange(next, correct);
  };

  return (
    <div className={styles.section}>
      <fieldset className={styles.options}>
        <legend className={styles.legend}>{adminText('admin.tests.options')}</legend>
        {options.map((option, index) => (
          <div key={index} className={styles.optionRow}>
            <input
              type="radio"
              name="correct-option"
              className={styles.radio}
              checked={correctOption === index}
              aria-label={adminText('admin.tests.optionIsCorrect', { n: index + 1 })}
              onChange={() => onChange([...options], index)}
            />
            <input
              className={styles.optionInput}
              aria-label={adminText('admin.tests.optionN', { n: index + 1 })}
              placeholder={adminText('admin.tests.optionN', { n: index + 1 })}
              autoComplete="off"
              value={option}
              onChange={(event) => edit(index, event.target.value)}
            />
            <button
              type="button"
              className={styles.remove}
              aria-label={adminText('admin.tests.removeOption', { n: index + 1 })}
              disabled={options.length <= OPTIONS_MIN}
              onClick={() => remove(index)}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
        {optionsError ? <p className={styles.error}>{optionsError}</p> : null}
        <div>
          <Button
            variant="outline"
            disabled={options.length >= OPTIONS_MAX}
            onClick={() => onChange([...options, ''], correctOption)}
          >
            <Icon name="plus" size={18} />
            {adminText('admin.tests.addOption')}
          </Button>
        </div>
      </fieldset>
      <SelectField
        label={adminText('admin.tests.correctAnswer')}
        placeholder={adminText('admin.tests.selectCorrect')}
        options={options.map((option, index) => ({
          value: String(index),
          label: `${String.fromCharCode(65 + index)}. ${option.trim() || adminText('admin.tests.optionN', { n: index + 1 })}`,
        }))}
        value={correctOption === null ? '' : String(correctOption)}
        onChange={(event) =>
          onChange([...options], event.target.value === '' ? null : Number(event.target.value))
        }
        error={correctError}
      />
    </div>
  );
}
