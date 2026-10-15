// apps/admin-web/src/modules/content/api/content.api.ts
import {
  adminModuleSchema,
  adminNoteSchema,
  adminTopicSchema,
  amharicNoteInputSchema,
  contentCourseSchema,
  contentSummarySchema,
  moduleInputSchema,
  noteInputSchema,
  topicInputSchema,
} from '@mastara/contracts';
import type {
  AdminModule,
  AdminNote,
  AdminTopic,
  AmharicNoteInput,
  ContentCourse,
  ContentSummary,
  ModuleInput,
  NoteInput,
  TopicInput,
} from '@mastara/contracts';
import { statusChange } from '@mastara/domain';
import type { AuditAction, CatalogStatus } from '@mastara/domain';

import { env } from '@/core/config/env';
import {
  contentSummary,
  courseById,
  createCourseModule,
  createCourseNote,
  createModuleTopic,
  listContentCourses,
  listCourseModules,
  listCourseNotes,
  recordAudit,
  saveAmharicNote,
  updateCourseModule,
  updateCourseNote,
} from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

/**
 * Unpublishing needs a reason, and publishing a note needs both languages. Every write is recorded in
 * the audit log. A save that leaves a note published is a new version students will see.
 */
export interface ContentApi {
  listCourses(): Promise<ContentCourse[]>;
  getSummary(courseId: string): Promise<ContentSummary>;
  listModules(courseId: string): Promise<AdminModule[]>;
  createModule(input: ModuleInput): Promise<AdminModule>;
  updateModule(id: string, input: ModuleInput): Promise<AdminModule>;
  addTopic(input: TopicInput): Promise<AdminTopic>;
  listNotes(courseId: string): Promise<AdminNote[]>;
  createNote(input: NoteInput): Promise<AdminNote>;
  updateNote(id: string, input: NoteInput): Promise<AdminNote>;
  /** Saves the Amharic view of an existing note. */
  saveAmharicNote(id: string, input: AmharicNoteInput): Promise<AdminNote>;
}

const courseCode = (courseId: string): string => courseById(courseId)?.code ?? courseId;

/** The audit entry for an edit: publishing and unpublishing are named, other edits are "updated". */
function editAction(
  before: CatalogStatus,
  after: CatalogStatus,
  updated: AuditAction,
): AuditAction {
  const change = statusChange(before, after);
  if (change === 'PUBLISH') return 'CONTENT_PUBLISHED';
  if (change === 'UNPUBLISH') return 'CONTENT_UNPUBLISHED';
  return updated;
}

const mockContentApi: ContentApi = {
  async listCourses() {
    await simulateLatency(100);
    return listContentCourses().map((course) => contentCourseSchema.parse(course));
  },

  async getSummary(courseId) {
    await simulateLatency();
    return contentSummarySchema.parse(contentSummary(courseId));
  },

  async listModules(courseId) {
    await simulateLatency();
    return listCourseModules(courseId).map((item) => adminModuleSchema.parse(item));
  },

  async createModule(input) {
    await simulateLatency();
    const created = createCourseModule(moduleInputSchema.parse(input));
    recordAudit({
      actor: 'ADMIN',
      action: 'MODULE_CREATED',
      target: `Module ${created.number} · ${courseCode(created.courseId)}`,
    });
    return adminModuleSchema.parse(created);
  },

  async updateModule(id, input) {
    await simulateLatency();
    const parsed = moduleInputSchema.parse(input);
    const { module, before } = updateCourseModule(id, parsed);
    recordAudit({
      actor: 'ADMIN',
      action: editAction(before, module.status, 'MODULE_UPDATED'),
      target: `Module ${module.number} · ${courseCode(module.courseId)}`,
      reason: parsed.reason,
    });
    return adminModuleSchema.parse(module);
  },

  async addTopic(input) {
    await simulateLatency();
    const topic = createModuleTopic(topicInputSchema.parse(input));
    const owner = topic.moduleId.split('~')[0] ?? '';
    recordAudit({
      actor: 'ADMIN',
      action: 'TOPIC_ADDED',
      target: `Topic ${topic.code} · ${courseCode(owner)}`,
    });
    return adminTopicSchema.parse(topic);
  },

  async listNotes(courseId) {
    await simulateLatency();
    return listCourseNotes(courseId).map((item) => adminNoteSchema.parse(item));
  },

  async createNote(input) {
    await simulateLatency();
    const note = createCourseNote(noteInputSchema.parse(input));
    recordAudit({
      actor: 'ADMIN',
      action: note.status === 'PUBLISHED' ? 'CONTENT_PUBLISHED' : 'NOTE_CREATED',
      target:
        note.status === 'PUBLISHED'
          ? `Note · ${note.title.en} · v${note.version}`
          : `Note · ${note.title.en}`,
    });
    return adminNoteSchema.parse(note);
  },

  async updateNote(id, input) {
    await simulateLatency();
    const parsed = noteInputSchema.parse(input);
    const { note, before } = updateCourseNote(id, parsed);
    // Saving a note that stays published is a republish, so it is a new version too.
    const action =
      note.status === 'PUBLISHED'
        ? 'CONTENT_PUBLISHED'
        : editAction(before, note.status, 'NOTE_UPDATED');
    recordAudit({
      actor: 'ADMIN',
      action,
      target:
        note.status === 'PUBLISHED'
          ? `Note · ${note.title.en} · v${note.version}`
          : `Note · ${note.title.en}`,
      reason: parsed.reason,
    });
    return adminNoteSchema.parse(note);
  },

  async saveAmharicNote(id, input) {
    await simulateLatency();
    const note = saveAmharicNote(id, amharicNoteInputSchema.parse(input));
    recordAudit({
      actor: 'ADMIN',
      action: note.status === 'PUBLISHED' ? 'CONTENT_PUBLISHED' : 'NOTE_UPDATED',
      target:
        note.status === 'PUBLISHED'
          ? `Amharic note · ${note.title.en} · v${note.version}`
          : `Amharic note · ${note.title.en}`,
    });
    return adminNoteSchema.parse(note);
  },
};

function createContentApi(): ContentApi {
  if (env.useMocks) return mockContentApi;
  throw new Error('The real content API is added in the backend integration phase.');
}

export const contentApi = createContentApi();
