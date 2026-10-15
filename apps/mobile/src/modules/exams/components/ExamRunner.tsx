// apps/mobile/src/modules/exams/components/ExamRunner.tsx
import type { Question } from '@mastara/contracts';
import type { Answer, ExamScore, ExamSubmitReason } from '@mastara/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, FlatList, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles } from '@/core/theme';
import { attemptStore } from '@/core/db';
import { getBootId, getUptimeMs } from '@/core/timer';
import { useScrollList, useVisibleIndex } from '@/shared/hooks';
import { AppButton, AppText, BottomSheet, ProgressBar } from '@/shared/ui';

import { useExamSession } from '../hooks/useExamSession';
import { useExamTimer } from '../hooks/useExamTimer';
import { activeExams } from '../lib/activeExams';
import { examQuestionsKey } from '../lib/savedExam';
import type { ResumeData, SavedExam, SavedExamMeta, Sitting } from '../lib/savedExam';

import { ExamQuestionItem } from './ExamQuestionItem';
import { ExamTimerBadge } from './ExamTimerBadge';
import { QuestionPalette } from './QuestionPalette';

interface ExamRunnerProps {
  questions: Question[];
  minutes: number;
  /** Where this sitting is saved on the phone. */
  attemptKey: string;
  /** Present when an unfinished exam is being resumed. */
  resume?: ResumeData;
  /** Identifies this sitting for the server (the same ID is kept when the exam is resumed). */
  sitting: Sitting;
  /** Saved with the sitting so it can be finished later without this screen. */
  meta: SavedExamMeta;
  onFinish: (score: ExamScore, info: FinishInfo) => void;
}

/** What the server needs besides the score. */
export interface FinishInfo {
  answers: Readonly<Record<string, Answer>>;
  elapsedMs: number;
  reason: ExamSubmitReason;
}

/** The running exam: timer, every question in one scrolling list, flags, the All Questions palette and submit. */
export function ExamRunner({ questions, minutes, attemptKey, resume, sitting, meta, onFinish }: ExamRunnerProps) {
  const styles = useStyles();
  const { t, language } = useI18n();
  const session = useExamSession(questions, resume?.session);
  const timer = useExamTimer(minutes * 60_000, resume?.elapsedMs ?? 0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const scroll = useScrollList<Question>();
  const listRef = scroll.listRef;
  const finished = useRef(false);
  const latest = useRef({ state: session.state, elapsedMs: timer.elapsedMs });
  latest.current = { state: session.state, elapsedMs: timer.elapsedMs };
  const identity = useRef({ sitting, meta });
  identity.current = { sitting, meta };

  // The questions are saved once, before the first sitting save, so the sitting can be graded without this screen.
  useEffect(() => {
    void attemptStore.save(examQuestionsKey(meta.examId), questions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save the sitting on the phone after every answer, every 5 seconds and when the app goes to the background.
  const persist = useCallback(async () => {
    if (finished.current) return;
    const uptime = await getUptimeMs();
    if (finished.current) return;
    const saved: SavedExam = {
      sittingId: identity.current.sitting.sittingId,
      startedAt: identity.current.sitting.startedAt,
      meta: identity.current.meta,
      session: latest.current.state,
      elapsedMs: latest.current.elapsedMs,
      savedWallMs: Date.now(),
      savedUptimeMs: uptime,
      savedBootId: getBootId(),
    };
    await attemptStore.save(attemptKey, saved);
  }, [attemptKey]);

  // While this screen is open the background finisher leaves the sitting alone.
  useEffect(() => {
    activeExams.add(attemptKey);
    return () => {
      activeExams.remove(attemptKey);
      void persist(); // leaving keeps the sitting; save the latest state at once
    };
  }, [attemptKey, persist]);

  useEffect(() => {
    void persist();
  }, [session.state, persist]);

  useEffect(() => {
    const interval = setInterval(() => void persist(), 5000);
    const subscription = AppState.addEventListener('change', (state) => state !== 'active' && void persist());
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [persist]);

  const left = session.total - session.answered;

  function submit(reason: ExamSubmitReason) {
    if (finished.current) return;
    finished.current = true;
    setConfirmOpen(false);
    setPaletteOpen(false);
    session.submit();
    onFinish(session.score(), {
      answers: latest.current.state.answers,
      elapsedMs: timer.elapsedMs,
      reason,
    });
  }

  // The exam submits by itself when time runs out.
  useEffect(() => {
    if (timer.expired) submit(resume && resume.elapsedMs >= minutes * 60_000 ? 'overdue' : 'timeout');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.expired]);

  const { scrollTo, onScrollToIndexFailed } = scroll;

  // Back where the student was after the app was closed.
  useEffect(() => {
    const index = resume?.session.index ?? 0;
    if (index > 0) setTimeout(() => scrollTo(index), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The question at the top of the screen is the "current" one (highlighted in the palette and saved to return to).
  const { onViewableItemsChanged, viewabilityConfig } = useVisibleIndex(session.goto);

  const renderItem = useCallback(
    ({ item, index }: { item: Question; index: number }) => (
      <ExamQuestionItem
        question={item}
        number={index + 1}
        total={session.total}
        index={index}
        isLast={index === session.total - 1}
        lang={language}
        answer={session.state.answers[item.id]}
        flagged={Boolean(session.state.flagged[item.id])}
        onChoose={session.chooseFor}
        onText={session.setTextFor}
        onFlag={session.toggleFlagFor}
        onNext={scrollTo}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.state.answers, session.state.flagged, session.total, language, scrollTo],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.info}>
        <View style={styles.flex}>
          <AppText variant="caption" muted>
            {t('exam.answered', { done: session.answered, total: session.total })}
          </AppText>
          <ProgressBar value={(session.answered / session.total) * 100} accent="fuchsia" />
        </View>
        <ExamTimerBadge remainingMs={timer.remainingMs} />
      </View>
      <AppButton label={t('exam.allQuestions')} variant="outline" onPress={() => setPaletteOpen(true)} />

      <FlatList
        ref={listRef}
        style={styles.flex}
        contentContainerStyle={styles.list}
        data={questions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={[session.state.answers, session.state.flagged, language]}
        // Only the questions near the screen are built: a long exam with formulas stays light on memory.
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onScrollToIndexFailed={onScrollToIndexFailed}
        ListFooterComponent={<AppButton label={t('exam.submit')} onPress={() => setConfirmOpen(true)} />}
      />

      <BottomSheet visible={paletteOpen} title={t('exam.allQuestions')} onClose={() => setPaletteOpen(false)} scroll>
        <QuestionPalette
          cells={session.cells}
          onSelect={(index) => {
            setPaletteOpen(false);
            setTimeout(() => scrollTo(index), 250); // after the sheet has closed
          }}
        />
      </BottomSheet>

      <BottomSheet visible={confirmOpen} title={t('exam.submit.title')} onClose={() => setConfirmOpen(false)}>
        <AppText muted>{left > 0 ? t('exam.submit.body', { left }) : t('exam.submit.bodyAll')}</AppText>
        <AppButton label={t('exam.submit.confirm')} onPress={() => submit('manual')} />
        <AppButton label={t('exam.keep')} variant="outline" onPress={() => setConfirmOpen(false)} />
      </BottomSheet>
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { flex: 1, gap: theme.spacing.md },
  info: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  flex: { flex: 1 },
  list: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
}));
