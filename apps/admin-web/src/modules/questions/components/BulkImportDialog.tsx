// apps/admin-web/src/modules/questions/components/BulkImportDialog.tsx
'use client';

import type { ExamQuestionInput } from '@mastara/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';

import { adminText } from '@/core/i18n';
import { Button } from '@/shared/ui';

import {
  getSampleCsvTemplate,
  parseQuestionsInput,
  type CsvParseResult,
} from '../lib/questionCsvParser';

import styles from './BulkImportDialog.module.css';

interface BulkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: ExamQuestionInput[], mode: 'append' | 'replace') => void;
  currentCount: number;
  defaultTopic?: string;
}

export function BulkImportDialog({
  isOpen,
  onClose,
  onImport,
  currentCount,
  defaultTopic = 'General',
}: BulkImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [parseResult, setParseResult] = useState<CsvParseResult>({
    totalRows: 0,
    validRows: [],
    invalidRows: [],
    allQuestions: [],
  });
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Sync dialog modal state
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Re-parse when text changes
  const handleContentChange = useCallback(
    (text: string) => {
      setPastedText(text);
      const res = parseQuestionsInput(text, defaultTopic);
      setParseResult(res);
    },
    [defaultTopic],
  );

  // Process uploaded file
  const handleFile = useCallback(
    (file: File) => {
      setFileError(null);
      const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
      if (!isCsv) {
        setFileName(null);
        setFileError('Bulk question import accepts CSV files only. PDF and other formats are strictly disallowed.');
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = String(e.target?.result || '');
        handleContentChange(content);
      };
      reader.readAsText(file);
    },
    [handleContentChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]!);
      }
    },
    [handleFile],
  );

  const handleDownloadTemplate = () => {
    const templateContent = getSampleCsvTemplate();
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exam_questions_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmImport = () => {
    if (parseResult.allQuestions.length === 0) return;
    onImport(parseResult.allQuestions, importMode);
    onClose();
  };

  const validCount = parseResult.validRows.length;
  const invalidCount = parseResult.invalidRows.length;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{adminText('admin.questions.bulk.title')}</h2>
            <p className={styles.subtitle}>{adminText('admin.questions.bulk.desc')}</p>
          </div>
          <div className={styles.headerActions}>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              📥 {adminText('admin.questions.bulk.downloadTemplate')}
            </Button>
            <Button variant="outline" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {fileError ? (
            <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
              ⚠️ {fileError}
            </div>
          ) : null}

          {/* Tabs */}
          <div className={styles.tabBar}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'upload' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              📂 {adminText('admin.questions.bulk.uploadTab')}
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'paste' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('paste')}
            >
              📝 {adminText('admin.questions.bulk.pasteTab')}
            </button>
          </div>

          {/* Upload Dropzone */}
          {activeTab === 'upload' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) handleFile(files[0]!);
                }}
              />
              <div
                className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <p className={styles.dropzoneTitle}>
                  {fileName ? `📄 ${fileName}` : adminText('admin.questions.bulk.dropzone')}
                </p>
                <p className={styles.dropzoneSubtitle}>Accepts .CSV files only (PDF and other formats are disallowed)</p>
              </div>
            </div>
          ) : (
            <textarea
              className={styles.textArea}
              placeholder={adminText('admin.questions.bulk.pastePlaceholder')}
              value={pastedText}
              onChange={(e) => handleContentChange(e.target.value)}
            />
          )}

          {/* Validation Summary */}
          {parseResult.totalRows > 0 ? (
            <div className={styles.summaryBar}>
              <div className={styles.badgeGroup}>
                <span className={styles.badgeSuccess}>
                  ✓ {adminText('admin.questions.bulk.valid', { n: validCount })}
                </span>
                {invalidCount > 0 ? (
                  <span className={styles.badgeDanger}>
                    ⚠ {adminText('admin.questions.bulk.invalid', { n: invalidCount })}
                  </span>
                ) : null}
              </div>

              {/* Mode Selector */}
              <div className={styles.modeSelector}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                  />
                  {adminText('admin.questions.bulk.modeAppend', { n: currentCount })}
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                  />
                  {adminText('admin.questions.bulk.modeReplace')}
                </label>
              </div>
            </div>
          ) : null}

          {/* Error Diagnostics List */}
          {invalidCount > 0 ? (
            <div className={styles.errorList}>
              <strong>Validation Issues:</strong>
              {parseResult.invalidRows.map((inv) => (
                <div key={inv.rowNumber}>
                  Row {inv.rowNumber}: {inv.errors.join(', ')}
                </div>
              ))}
            </div>
          ) : null}

          {/* Live Preview Table */}
          {validCount > 0 ? (
            <div className={styles.previewContainer}>
              <h3 className={styles.previewTitle}>
                Questions Preview (showing first {Math.min(validCount, 15)} of {validCount})
              </h3>
              <div className={styles.previewTableWrapper}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>ID</th>
                      <th>Form</th>
                      <th>Question Prompt</th>
                      <th>Options</th>
                      <th>Correct Answer</th>
                      <th>Topic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.validRows.slice(0, 15).map((row, idx) => {
                      const q = row.question;
                      let answerText = 'N/A';
                      if (q.form === 'TRUE_FALSE') {
                        answerText = q.trueIsCorrect ? 'True' : 'False';
                      } else if (q.correctOption !== null && q.correctOption !== undefined) {
                        const optLetter = ['A', 'B', 'C', 'D', 'E'][q.correctOption] || String(q.correctOption);
                        answerText = `${optLetter}: ${q.options[q.correctOption] || ''}`;
                      }

                      return (
                        <tr key={row.rowNumber}>
                          <td>{idx + 1}</td>
                          <td><strong>{q.id}</strong></td>
                          <td>{q.form}</td>
                          <td title={q.prompt}>{q.prompt}</td>
                          <td>{q.options.join(' | ')}</td>
                          <td><strong>{answerText}</strong></td>
                          <td>{q.topic}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
          <Button variant="outline" onClick={onClose}>
            {adminText('admin.common.cancel')}
          </Button>
          <Button disabled={validCount === 0} onClick={handleConfirmImport}>
            {adminText('admin.questions.bulk.importAction', { n: validCount })}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
