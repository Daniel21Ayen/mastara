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
import { z } from 'zod';
import { httpClient } from '@/core/network';

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
  saveAmharicNote(id: string, input: AmharicNoteInput): Promise<AdminNote>;
}

export const realContentApi: ContentApi = {
  async listCourses(): Promise<ContentCourse[]> {
    const raw = await httpClient.get<ContentCourse[]>('/content/admin/courses');
    return z.array(contentCourseSchema).parse(raw);
  },

  async getSummary(courseId: string): Promise<ContentSummary> {
    const raw = await httpClient.get<ContentSummary>(`/content/admin/courses/${courseId}/summary`);
    return contentSummarySchema.parse(raw);
  },

  async listModules(courseId: string): Promise<AdminModule[]> {
    const raw = await httpClient.get<AdminModule[]>(`/content/admin/courses/${courseId}/modules`);
    return z.array(adminModuleSchema).parse(raw);
  },

  async createModule(input: ModuleInput): Promise<AdminModule> {
    const payload = moduleInputSchema.parse(input);
    const raw = await httpClient.post<AdminModule>('/content/admin/modules', payload);
    return adminModuleSchema.parse(raw);
  },

  async updateModule(id: string, input: ModuleInput): Promise<AdminModule> {
    const payload = moduleInputSchema.parse(input);
    const raw = await httpClient.put<AdminModule>(`/content/admin/modules/${id}`, payload);
    return adminModuleSchema.parse(raw);
  },

  async addTopic(input: TopicInput): Promise<AdminTopic> {
    const payload = topicInputSchema.parse(input);
    const raw = await httpClient.post<AdminTopic>('/content/admin/topics', payload);
    return adminTopicSchema.parse(raw);
  },

  async listNotes(courseId: string): Promise<AdminNote[]> {
    const raw = await httpClient.get<AdminNote[]>(`/content/admin/courses/${courseId}/notes`);
    return z.array(adminNoteSchema).parse(raw);
  },

  async createNote(input: NoteInput): Promise<AdminNote> {
    const payload = noteInputSchema.parse(input);
    const raw = await httpClient.post<AdminNote>('/content/admin/notes', payload);
    return adminNoteSchema.parse(raw);
  },

  async updateNote(id: string, input: NoteInput): Promise<AdminNote> {
    const payload = noteInputSchema.parse(input);
    const raw = await httpClient.put<AdminNote>(`/content/admin/notes/${id}`, payload);
    return adminNoteSchema.parse(raw);
  },

  async saveAmharicNote(id: string, input: AmharicNoteInput): Promise<AdminNote> {
    const payload = amharicNoteInputSchema.parse(input);
    const raw = await httpClient.put<AdminNote>(`/content/admin/notes/${id}/amharic`, payload);
    return adminNoteSchema.parse(raw);
  },
};

export const contentApi: ContentApi = realContentApi;
