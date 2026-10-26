// apps/admin-web/src/modules/tests/components/SharedQuestionEditor.tsx
'use client';

import React, { useState } from 'react';
import { Icon } from '@/shared/ui';
import { MathInputHelper } from '@/shared/math';
import { StudentPreviewModal } from '@/shared/preview';
import styles from './SharedQuestionEditor.module.css';

export interface QuestionData {
  id?: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'BLANK_SPACE';
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  trueIsCorrect: boolean;
  acceptedAnswers: string[];
  explanation: string;
  points?: number;
}

interface SharedQuestionEditorProps {
  initialData?: Partial<QuestionData>;
  onSave?: (data: QuestionData) => void;
  onCancel?: () => void;
  title?: string;
}

const QUESTION_TYPES = [
  { id: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { id: 'TRUE_FALSE', label: 'True / False' },
  { id: 'SHORT_ANSWER', label: 'Short Answer' },
  { id: 'BLANK_SPACE', label: 'Fill in Blank' },
] as const;

export function SharedQuestionEditor({
  initialData,
  onSave,
  onCancel,
  title = 'Question Authoring',
}: SharedQuestionEditorProps) {
  const [type, setType] = useState<QuestionData['type']>(
    initialData?.type || 'MULTIPLE_CHOICE',
  );
  const [prompt, setPrompt] = useState(initialData?.prompt || '');
  const [options, setOptions] = useState<string[]>(
    initialData?.options && initialData.options.length > 0
      ? initialData.options
      : ['Option A', 'Option B', 'Option C', 'Option D'],
  );
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(
    initialData?.correctOptionIndex ?? 0,
  );
  const [trueIsCorrect, setTrueIsCorrect] = useState<boolean>(
    initialData?.trueIsCorrect ?? true,
  );
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>(
    initialData?.acceptedAnswers || [''],
  );
  const [explanation, setExplanation] = useState(initialData?.explanation || '');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleOptionChange = (idx: number, text: string) => {
    const next = [...options];
    next[idx] = text;
    setOptions(next);
  };

  const handleAddOption = () => {
    setOptions([...options, `Option ${String.fromCharCode(65 + options.length)}`]);
  };

  const handleDeleteOption = (idx: number) => {
    if (options.length <= 2) return;
    const next = options.filter((_, i) => i !== idx);
    setOptions(next);
    if (correctOptionIndex >= next.length) {
      setCorrectOptionIndex(0);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        type,
        prompt,
        options,
        correctOptionIndex,
        trueIsCorrect,
        acceptedAnswers: acceptedAnswers.filter((a) => a.trim() !== ''),
        explanation,
      });
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Question Type Selector */}
      <div className={styles.typeRow}>
        <span className={styles.typeLabel}>Question Type:</span>
        <div className={styles.typePills}>
          {QUESTION_TYPES.map((qt) => (
            <button
              key={qt.id}
              type="button"
              className={`${styles.typePill} ${type === qt.id ? styles.typePillActive : ''}`}
              onClick={() => setType(qt.id)}
            >
              {qt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Question Prompt with KaTeX Hint & Live Preview */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Question Prompt (LaTeX Supported)</label>
        <textarea
          className={styles.textarea}
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter question prompt here. Example: Solve for x: $x^2 + 5x + 6 = 0$..."
        />
        <MathInputHelper
          value={prompt}
          onInsert={(snippet) => setPrompt((prev) => prev + snippet)}
          showLivePreview
        />
      </div>

      {/* 3. Options block for Multiple Choice */}
      {type === 'MULTIPLE_CHOICE' && (
        <div className={styles.optionsSection}>
          <label className={styles.fieldLabel}>Answer Choices (Radio indicates correct answer)</label>
          {options.map((opt, idx) => (
            <div key={idx} className={styles.optionItem}>
              <label className={styles.radioLabel} title="Mark as correct answer">
                <input
                  type="radio"
                  name="correct-choice"
                  checked={correctOptionIndex === idx}
                  onChange={() => setCorrectOptionIndex(idx)}
                  className={styles.radioInput}
                />
                <span className={styles.optionLetter}>{String.fromCharCode(65 + idx)}</span>
              </label>
              <input
                type="text"
                className={styles.optionInput}
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + idx)} text or LaTeX...`}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteOption(idx)}
                  title="Remove option"
                >
                  <Icon name="trash" size={16} />
                </button>
              )}
            </div>
          ))}
          <button type="button" className={styles.addOptionBtn} onClick={handleAddOption}>
            <Icon name="plus" size={14} />
            <span>Add Option</span>
          </button>
        </div>
      )}

      {/* True / False Selection */}
      {type === 'TRUE_FALSE' && (
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Correct Answer</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="tf-correct"
                checked={trueIsCorrect}
                onChange={() => setTrueIsCorrect(true)}
              />
              <strong>True</strong>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="tf-correct"
                checked={!trueIsCorrect}
                onChange={() => setTrueIsCorrect(false)}
              />
              <strong>False</strong>
            </label>
          </div>
        </div>
      )}

      {/* Short Answer / Fill in Blank */}
      {(type === 'SHORT_ANSWER' || type === 'BLANK_SPACE') && (
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Accepted Answer(s)</label>
          <input
            type="text"
            className={styles.optionInput}
            value={acceptedAnswers.join(', ')}
            onChange={(e) =>
              setAcceptedAnswers(
                e.target.value.split(',').map((s) => s.trim()),
              )
            }
            placeholder="e.g. photosynthesis, Photosynthesis"
          />
          <small style={{ color: 'var(--color-text-muted)' }}>Separate alternative acceptable spellings with commas</small>
        </div>
      )}

      {/* 4. Answer Explanation / Rubric with KaTeX */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Answer Description / Explanation</label>
        <textarea
          className={styles.textarea}
          rows={3}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Shown to students after they submit their response..."
        />
        <MathInputHelper
          value={explanation}
          onInsert={(snippet) => setExplanation((prev) => prev + snippet)}
          showLivePreview
        />
      </div>

      {/* Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.leftActions}>
          <button
            type="button"
            className={styles.previewBtn}
            onClick={() => setIsPreviewOpen(true)}
            title="Preview as student"
          >
            <Icon name="eye" size={16} />
            <span>Preview as Student</span>
          </button>
        </div>

        <div className={styles.rightActions}>
          {onCancel && (
            <button
              type="button"
              className={styles.typePill}
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className={styles.typePillActive}
            onClick={handleSave}
          >
            Save Question
          </button>
        </div>
      </div>

      {/* Student Preview Modal Simulation */}
      <StudentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={title}
        mode="question"
        prompt={prompt}
        questionType={
          type === 'MULTIPLE_CHOICE'
            ? 'Multiple Choice'
            : type === 'TRUE_FALSE'
              ? 'True / False'
              : 'Short Answer'
        }
        options={type === 'MULTIPLE_CHOICE' ? options : []}
      />
    </div>
  );
}
