// apps/admin-web/src/shared/preview/StudentPreviewModal.tsx
'use client';

import React, { useState } from 'react';
import { Icon } from '@/shared/ui';
import { KaTeXRenderer } from '@/shared/math';
import styles from './StudentPreviewModal.module.css';

export interface StudentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  category?: string;
  mode?: 'question' | 'content' | 'assessment';
  prompt?: string;
  content?: string;
  questionType?: string; // 'Multiple Choice' | 'True / False' | 'Short Answer' | 'Blank Space'
  options?: string[];
  questions?: Array<{
    id: string;
    prompt: string;
    type?: string;
    options?: string[];
  }>;
}

export function StudentPreviewModal({
  isOpen,
  onClose,
  title = 'Student Preview',
  subtitle,
  category,
  mode = 'question',
  prompt = '',
  content = '',
  questionType = 'Multiple Choice',
  options = [],
  questions = [],
}: StudentPreviewProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('mobile');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [tfSelection, setTfSelection] = useState<boolean | null>(null);
  const [simulatedAnswer, setSimulatedAnswer] = useState<string>('');

  if (!isOpen) return null;

  const validOptions = options.filter((opt) => opt && opt.trim() !== '');

  const renderQuestionSimulation = () => {
    return (
      <div className={styles.questionCard}>
        {category && <div className={styles.categoryTag}>{category}</div>}
        <div className={styles.promptCard}>
          <KaTeXRenderer text={prompt || 'No question prompt entered yet.'} />
        </div>

        <div className={styles.simulationNotice}>
          <Icon name="eye" size={14} />
          <span>Interactive Student Simulation Mode (Answers &amp; teacher metadata hidden)</span>
        </div>

        {/* Multiple Choice */}
        {questionType.toLowerCase().includes('choice') || questionType === 'Multiple Choice' ? (
          <ul className={styles.optionsList}>
            {validOptions.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const letter = String.fromCharCode(65 + idx);
              return (
                <li
                  key={idx}
                  className={`${styles.optionCard} ${isSelected ? styles.optionCardActive : ''}`}
                  onClick={() => setSelectedOption(idx)}
                  role="button"
                  tabIndex={0}
                >
                  <span className={`${styles.letterBadge} ${isSelected ? styles.letterBadgeActive : ''}`}>
                    {letter}
                  </span>
                  <div className={styles.optionText}>
                    <KaTeXRenderer text={opt} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {/* True / False */}
        {questionType.toLowerCase().includes('true') || questionType === 'True / False' ? (
          <div className={styles.tfGrid}>
            <button
              type="button"
              className={`${styles.tfButton} ${tfSelection === true ? styles.tfButtonActive : ''}`}
              onClick={() => setTfSelection(true)}
            >
              True
            </button>
            <button
              type="button"
              className={`${styles.tfButton} ${tfSelection === false ? styles.tfButtonActive : ''}`}
              onClick={() => setTfSelection(false)}
            >
              False
            </button>
          </div>
        ) : null}

        {/* Short Answer or Blank */}
        {questionType.toLowerCase().includes('short') ||
        questionType.toLowerCase().includes('blank') ||
        questionType === 'Short Answer' ||
        questionType === 'Blank Space' ? (
          <div>
            <input
              type="text"
              className={styles.shortAnswerInput}
              placeholder="Type your answer here as a student..."
              value={simulatedAnswer}
              onChange={(e) => setSimulatedAnswer(e.target.value)}
            />
          </div>
        ) : null}
      </div>
    );
  };

  const renderContentSimulation = () => {
    return (
      <article className={styles.readerArticle}>
        {subtitle && <div className={styles.categoryTag}>{subtitle}</div>}
        <h2 className={styles.readerTitle}>{title}</h2>
        <div className={styles.readerBody}>
          <KaTeXRenderer text={content || 'No content provided.'} />
        </div>
      </article>
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`${styles.modalWindow} ${
          viewport === 'desktop' ? styles.desktopSize : styles.mobileSize
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.badge}>Student View</span>
            <span className={styles.titleText}>{title}</span>
          </div>

          <div className={styles.controlsArea}>
            {/* Viewport frame toggle */}
            <div className={styles.viewportToggle}>
              <button
                type="button"
                className={`${styles.viewportBtn} ${
                  viewport === 'desktop' ? styles.viewportBtnActive : ''
                }`}
                onClick={() => setViewport('desktop')}
                title="Desktop View"
              >
                <Icon name="monitor" size={14} />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                className={`${styles.viewportBtn} ${
                  viewport === 'mobile' ? styles.viewportBtnActive : ''
                }`}
                onClick={() => setViewport('mobile')}
                title="Mobile View (375px)"
              >
                <Icon name="smartphone" size={14} />
                <span>Mobile</span>
              </button>
            </div>

            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close Preview"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Simulation Body */}
        <div className={styles.bodyScrollArea}>
          {viewport === 'mobile' ? (
            <div className={styles.mobileFrame}>
              <div className={styles.statusBar}>
                <span>9:41</span>
                <div className={styles.mobileNotch} />
                <span>100%</span>
              </div>
              <div className={styles.mobileContent}>
                {mode === 'content' ? renderContentSimulation() : renderQuestionSimulation()}
              </div>
            </div>
          ) : (
            <div className={styles.desktopFrame}>
              {mode === 'content' ? renderContentSimulation() : renderQuestionSimulation()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" className={styles.dismissBtn} onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
