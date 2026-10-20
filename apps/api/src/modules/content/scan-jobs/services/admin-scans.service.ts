import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../infrastructure/database/prisma.service";
import { Role, ScanJobStatus } from "@mastara/database";
import { SCAN_PAGE_SIZE } from "@mastara/domain";
import type { ScanKind, Stream, QuestionForm } from "@mastara/domain";
import type {
  AdminScan,
  ScanCourseOption,
  ScanFile,
  ScanInput,
  ScanListResult,
} from "@mastara/contracts";
import { StorageService } from "../../../../infrastructure/storage/storage.service";
import { QueueService } from "../../../../infrastructure/queue/queue.service";
import { ScanListQueryDto, UploadFileItemDto } from "../dto/admin-scans.dto";

const isUuid = (val: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

const KIND_TEXT: Record<string, string> = {
  COC: "COC",
  EXAM: "Exam",
  MATERIAL: "Material",
  QUIZ: "Quiz",
};

@Injectable()
export class AdminScansService {
  private readonly logger = new Logger(AdminScansService.name);
  private initialSeeded = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queue: QueueService,
  ) {}

  async getUploadUrls(
    files: UploadFileItemDto[],
  ): Promise<Array<{ name: string; key: string; uploadUrl: string; publicUrl: string }>> {
    const timestamp = Date.now();
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const sanitized = (file.name || `page-${i + 1}.jpg`).replace(/[^a-zA-Z0-9.-]/g, "_");
      const key = `scans/staging/${timestamp}-${i + 1}-${sanitized}`;
      const urls = await this.storage.getUploadUrl(key, file.mime || "image/jpeg");
      results.push({
        name: file.name,
        key: urls.key,
        uploadUrl: urls.uploadUrl,
        publicUrl: urls.publicUrl,
      });
    }
    return results;
  }

  async getScanStatus(id: string) {
    const scan = await this.prisma.scanJob.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        error_message: true,
        output_asset_id: true,
        updated_at: true,
      },
    });
    if (!scan) throw new NotFoundException(`Scan job with id '${id}' not found`);
    return scan;
  }

  async saveLocalUpload(key: string, buffer: Buffer): Promise<void> {
    await this.storage.uploadBuffer(key, buffer, "application/octet-stream");
  }

  async getLocalDownload(key: string): Promise<Buffer> {
    return this.storage.downloadBuffer(key);
  }

  async onModuleInit() {
    await this.ensureInitialSeed();
  }

  /**
   * Automatically populate initial demo scan jobs if none exist,
   * guaranteeing admin web scan wizard and list view have live records.
   */
  async ensureInitialSeed(): Promise<void> {
    if (this.initialSeeded) return;
    this.initialSeeded = true;

    try {
      const count = await this.prisma.scanJob.count();
      if (count > 0) return;

      const course = await this.prisma.course.findFirst({
        include: {
          modules: {
            include: { topics: true },
          },
          semester: {
            include: {
              program: {
                include: { university: true },
              },
            },
          },
        },
      });

      const adminUser = await this.prisma.student.findFirst({
        where: { role: Role.ADMIN },
      });
      const adminId = adminUser?.id || "00000000-0000-0000-0000-000000000000";

      if (!course) return;

      const firstTopicId = course.modules[0]?.topics[0]?.id ?? null;
      const university = course.semester.program.university;
      const program = course.semester.program;

      // Seed 4 initial realistic scans
      const demoScans = [
        {
          title: "Quiz 2 paper scan",
          courseId: course.id,
          topicId: firstTopicId,
          metadata: {
            kind: "QUIZ",
            subKind: "2",
            examSetId: "QS-204",
            universityShortName: university.code,
            programName: program.name_en,
            semesterNumber: course.semester.sort_order || 1,
            stream: course.stream,
            courseCode: course.code,
            courseTitle: course.title_en,
            topicLabel: "1.1 Introduction",
            title: "Quiz 2 paper scan",
            description: "Scanned from the teacher copy.",
            answers: [
              { questionId: "Q-1006", questionType: null, text: "B", file: null },
              {
                questionId: "Q-1007",
                questionType: null,
                text: "",
                file: { name: "q1007-answer.jpg", mime: "image/jpeg", sizeBytes: 180000 },
              },
            ],
          },
          pages: [
            { name: "quiz2-p1.jpg", mime: "image/jpeg", sizeBytes: 420000 },
            { name: "quiz2-p2.jpg", mime: "image/jpeg", sizeBytes: 395000 },
          ],
        },
        {
          title: "Mid Exam - Calculus Paper",
          courseId: course.id,
          topicId: null,
          metadata: {
            kind: "EXAM",
            subKind: "MID",
            examSetId: "MID-2016",
            universityShortName: university.code,
            programName: program.name_en,
            semesterNumber: course.semester.sort_order || 1,
            stream: course.stream,
            courseCode: course.code,
            courseTitle: course.title_en,
            title: "Mid Exam - Calculus Paper",
            description: "Official mid-term examination paper.",
            answers: [
              { questionId: "E-01", questionType: "MULTIPLE_CHOICE", text: "C", file: null },
              {
                questionId: "E-02",
                questionType: "SHORT_ANSWER",
                text: "42",
                file: { name: "e02.pdf", mime: "application/pdf", sizeBytes: 640000 },
              },
            ],
          },
          pages: [
            { name: "mid-calculus.pdf", mime: "application/pdf", sizeBytes: 2300000 },
          ],
        },
        {
          title: "National COC Paper 2016",
          courseId: null,
          topicId: null,
          metadata: {
            kind: "COC",
            subKind: null,
            examSetId: null,
            universityShortName: university.code,
            programName: program.name_en,
            semesterNumber: null,
            stream: null,
            courseCode: null,
            courseTitle: null,
            year: 2016,
            title: "National COC Paper 2016",
            description: "Center of Competence exit paper.",
            answers: [
              { questionId: "1", questionType: null, text: "D", file: null },
              { questionId: "2", questionType: null, text: "A", file: null },
              {
                questionId: "3",
                questionType: null,
                text: "Solution attached",
                file: { name: "coc-3.jpg", mime: "image/jpeg", sizeBytes: 210000 },
              },
            ],
          },
          pages: [
            { name: "coc-medicine-2016.pdf", mime: "application/pdf", sizeBytes: 4800000 },
          ],
        },
        {
          title: "Grammar handout lecture notes",
          courseId: course.id,
          topicId: firstTopicId,
          metadata: {
            kind: "MATERIAL",
            subKind: "NOTE",
            examSetId: "MAT-01",
            universityShortName: university.code,
            programName: program.name_en,
            semesterNumber: course.semester.sort_order || 1,
            stream: course.stream,
            courseCode: course.code,
            courseTitle: course.title_en,
            topicLabel: "1.1 Introduction",
            title: "Grammar handout lecture notes",
            description: "Handwritten lecture note, 3 pages.",
            answers: [],
          },
          pages: [
            { name: "grammar-1.jpg", mime: "image/jpeg", sizeBytes: 300000 },
            { name: "grammar-2.jpg", mime: "image/jpeg", sizeBytes: 310000 },
            { name: "grammar-3.jpg", mime: "image/jpeg", sizeBytes: 290000 },
          ],
        },
      ];

      for (const item of demoScans) {
        await this.prisma.scanJob.create({
          data: {
            title: item.title,
            course_id: item.courseId || course.id,
            topic_id: item.topicId,
            status: ScanJobStatus.SUCCEEDED,
            created_by: adminId,
            pages: {
              create: item.pages.map((p, idx) => ({
                page_no: idx + 1,
                image_key: p.name,
                crop_data: { mime: p.mime, sizeBytes: p.sizeBytes },
              })),
            },
          },
        });
      }
      this.logger.log("Seeded initial scan jobs successfully.");
    } catch (err) {
      this.logger.error("Failed to seed initial scan jobs", err);
    }
  }

  /**
   * Helper to format a ScanJob database record into an AdminScan contract object.
   */
  private formatScanRecord(record: any): AdminScan {
    const meta = (record.metadata as Record<string, any>) || {};
    const kind = (meta.kind as ScanKind) || "MATERIAL";

    const universityShortName =
      meta.universityShortName ??
      record.course?.semester?.program?.university?.code ??
      "AASTU";

    const programName =
      meta.programName ??
      record.course?.semester?.program?.name_en ??
      "Software Engineering";

    const courseCode = meta.courseCode ?? record.course?.code ?? null;
    const courseTitle = meta.courseTitle ?? record.course?.title_en ?? null;
    const semesterNumber =
      meta.semesterNumber ?? record.course?.semester?.sort_order ?? null;
    const stream = (meta.stream as Stream) ?? record.course?.stream ?? null;

    const topicLabel =
      meta.topicLabel ??
      (record.topic
        ? `${record.topic.chapter_number} ${record.topic.title_en}`
        : null);

    const pages: ScanFile[] =
      record.pages && record.pages.length > 0
        ? record.pages
            .sort((a: any, b: any) => a.page_no - b.page_no)
            .map((p: any) => {
              const crop = (p.crop_data as Record<string, any>) || {};
              return {
                name: p.image_key,
                mime: (crop.mime as any) || "image/jpeg",
                sizeBytes: Number(crop.sizeBytes) || 250000,
              };
            })
        : (meta.pages as ScanFile[]) || [];

    const rawAnswers = Array.isArray(meta.answers) ? meta.answers : [];
    const answers = rawAnswers.map((a: any) => ({
      questionId: String(a.questionId || ""),
      questionType: (a.questionType as QuestionForm) || null,
      text: String(a.text || ""),
      file: a.file
        ? {
            name: String(a.file.name || ""),
            mime: (a.file.mime as any) || "application/pdf",
            sizeBytes: Number(a.file.sizeBytes) || 100000,
          }
        : null,
    }));

    return {
      id: record.id,
      kind,
      subKind: meta.subKind ?? null,
      examSetId: meta.examSetId ?? null,
      universityShortName,
      programName,
      semesterNumber,
      stream,
      courseCode,
      courseTitle,
      year: meta.year ? Number(meta.year) : null,
      topicLabel,
      title: record.title || meta.title || null,
      description: meta.description ?? null,
      pages,
      answers,
      createdAt: record.created_at.toISOString(),
    };
  }

  async listScans(query: ScanListQueryDto): Promise<ScanListResult> {
    await this.ensureInitialSeed();

    const page = Math.max(1, query.page ?? 1);
    const needle = query.q?.trim().toLowerCase();

    // Query scan jobs from DB with relations
    const allJobs = await this.prisma.scanJob.findMany({
      orderBy: { created_at: "desc" },
      include: {
        pages: true,
        topic: true,
        course: {
          include: {
            semester: {
              include: {
                program: {
                  include: {
                    university: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const formatted = allJobs.map((j) => this.formatScanRecord(j));

    const filtered = formatted.filter((scan) => {
      if (query.kind && scan.kind !== query.kind) return false;
      if (needle) {
        const text = [
          scan.id,
          scan.examSetId,
          scan.title,
          scan.courseCode,
          scan.courseTitle,
          scan.universityShortName,
          scan.programName,
          scan.topicLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(needle)) return false;
      }
      return true;
    });

    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / SCAN_PAGE_SIZE));
    const effectivePage = Math.min(page, pageCount);
    const start = (effectivePage - 1) * SCAN_PAGE_SIZE;
    const items = filtered.slice(start, start + SCAN_PAGE_SIZE);

    return {
      items,
      total,
      page: effectivePage,
      pageCount,
    };
  }

  async getScan(id: string): Promise<AdminScan> {
    await this.ensureInitialSeed();

    const isRecordIdUuid = isUuid(id);
    const job = await this.prisma.scanJob.findFirst({
      where: isRecordIdUuid ? { id } : { id: { equals: id } },
      include: {
        pages: true,
        topic: true,
        course: {
          include: {
            semester: {
              include: {
                program: {
                  include: {
                    university: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Scan job with id '${id}' not found`);
    }

    return this.formatScanRecord(job);
  }

  async listCourses(
    programId: string,
    semesterNumber: 1 | 2,
    stream: Stream,
  ): Promise<ScanCourseOption[]> {
    // 1. Resolve program
    let prog = isUuid(programId)
      ? await this.prisma.program.findUnique({ where: { id: programId } })
      : null;

    if (!prog) {
      prog = await this.prisma.program.findFirst({
        where: {
          OR: [
            { code: { equals: programId, mode: "insensitive" } },
            { code: { equals: programId.split("-").pop() ?? programId, mode: "insensitive" } },
            { name_en: { contains: programId, mode: "insensitive" } },
          ],
        },
      });
    }

    if (!prog) {
      // Fallback to first available program
      prog = await this.prisma.program.findFirst();
    }

    if (!prog) return [];

    // 2. Find semester
    let semester = await this.prisma.semester.findFirst({
      where: {
        program_id: prog.id,
        OR: [
          { sort_order: semesterNumber },
          { code: { equals: `S${semesterNumber}`, mode: "insensitive" } },
        ],
      },
    });

    if (!semester) {
      semester = await this.prisma.semester.findFirst({
        where: { program_id: prog.id },
      });
    }

    if (!semester) return [];

    // 3. Find courses matching semester & stream
    let courses = await this.prisma.course.findMany({
      where: {
        semester_id: semester.id,
        stream: stream as any,
      },
      select: {
        id: true,
        code: true,
        title_en: true,
      },
      orderBy: { code: "asc" },
    });

    // If no course explicitly with that semester & stream, return any courses for that stream
    if (courses.length === 0) {
      courses = await this.prisma.course.findMany({
        where: { stream: stream as any },
        select: {
          id: true,
          code: true,
          title_en: true,
        },
        orderBy: { code: "asc" },
      });
    }

    return courses.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title_en,
    }));
  }

  async createScan(rawInput: unknown, adminId?: string): Promise<AdminScan> {
    const input = rawInput as ScanInput;
    if (!input || typeof input !== "object" || !input.kind || !Array.isArray(input.pages)) {
      throw new BadRequestException("Invalid scan input: kind and pages are required");
    }

    let targetCourseId: string | null = null;
    let targetTopicId: string | null = null;
    let universityShortName = "AASTU";
    let programName = "Software Engineering";
    let courseCode: string | null = null;
    let courseTitle: string | null = null;
    let semesterNumber: number | null = null;
    let stream: Stream | null = null;
    let topicLabel: string | null = null;
    let computedTitle: string = "";
    let subKind: string | null = null;
    let examSetId: string | null = null;
    let description: string | null = null;
    let year: number | null = null;

    // Resolve university & program if provided
    const uniQuery = (input as any).universityId;
    if (uniQuery) {
      const u = isUuid(uniQuery)
        ? await this.prisma.university.findUnique({ where: { id: uniQuery } })
        : await this.prisma.university.findFirst({
            where: {
              code: { equals: uniQuery, mode: "insensitive" },
            },
          });
      if (u) universityShortName = u.code;
    }

    const progQuery = (input as any).programId;
    if (progQuery) {
      const p = isUuid(progQuery)
        ? await this.prisma.program.findUnique({ where: { id: progQuery } })
        : await this.prisma.program.findFirst({
            where: {
              OR: [
                { code: { equals: progQuery, mode: "insensitive" } },
                { code: { equals: progQuery.split("-").pop() ?? progQuery, mode: "insensitive" } },
              ],
            },
          });
      if (p) programName = p.name_en;
    }

    if (input.kind === "COC") {
      year = input.year;
      computedTitle = `${universityShortName} · ${programName} · COC Exam ${year}`;
    } else {
      // Resolve Course
      const rawCourseId = input.courseId;
      let c = isUuid(rawCourseId)
        ? await this.prisma.course.findUnique({
            where: { id: rawCourseId },
            include: {
              modules: { include: { topics: true } },
              semester: { include: { program: { include: { university: true } } } },
            },
          })
        : null;

      if (!c) {
        c = await this.prisma.course.findFirst({
          where: {
            OR: [
              { code: { equals: rawCourseId, mode: "insensitive" } },
              { code: { equals: rawCourseId.split("-").pop() ?? rawCourseId, mode: "insensitive" } },
            ],
          },
          include: {
            modules: { include: { topics: true } },
            semester: { include: { program: { include: { university: true } } } },
          },
        });
      }

      if (!c) {
        c = await this.prisma.course.findFirst({
          include: {
            modules: { include: { topics: true } },
            semester: { include: { program: { include: { university: true } } } },
          },
        });
      }

      if (c) {
        targetCourseId = c.id;
        courseCode = c.code;
        courseTitle = c.title_en;
        semesterNumber = c.semester.sort_order || input.semesterNumber;
        stream = (c.stream as Stream) || input.stream;
        universityShortName = c.semester.program.university.code;
        programName = c.semester.program.name_en;
      }

      examSetId = input.examSetId ? input.examSetId.trim() : null;

      if (input.kind === "EXAM") {
        subKind = input.examKind;
        computedTitle = `${courseTitle ?? courseCode} · ${subKind} Exam`;
      } else if (input.kind === "MATERIAL") {
        subKind = input.materialKind;
        computedTitle = input.title.trim();
        description = input.description.trim();

        // Resolve Topic
        const rawTopicId = input.topicId;
        const topic = isUuid(rawTopicId)
          ? await this.prisma.topic.findUnique({ where: { id: rawTopicId } })
          : c?.modules[0]?.topics[0] ?? null;
        if (topic) {
          targetTopicId = topic.id;
          topicLabel = `${topic.chapter_number} ${topic.title_en}`;
        }
      } else if (input.kind === "QUIZ") {
        subKind = String(input.quizNo);
        computedTitle = input.title.trim();
        description = input.description.trim();

        const rawTopicId = input.topicId;
        const topic = isUuid(rawTopicId)
          ? await this.prisma.topic.findUnique({ where: { id: rawTopicId } })
          : c?.modules[0]?.topics[0] ?? null;
        if (topic) {
          targetTopicId = topic.id;
          topicLabel = `${topic.chapter_number} ${topic.title_en}`;
        }
      }
    }

    const answers = (input as any).answers ?? [];

    const metadata = {
      kind: input.kind,
      subKind,
      examSetId,
      universityShortName,
      programName,
      semesterNumber,
      stream,
      courseCode,
      courseTitle,
      year,
      topicLabel,
      title: computedTitle,
      description,
      answers,
      pages: input.pages,
    };

    // Determine actual admin actor
    let resolvedAdminId = adminId;
    if (!resolvedAdminId || !isUuid(resolvedAdminId)) {
      const adminStudent = await this.prisma.student.findFirst({
        where: { role: Role.ADMIN },
      });
      resolvedAdminId = adminStudent?.id || "00000000-0000-0000-0000-000000000000";
    }

    // Resolve courseId (required non-null by Prisma schema)
    let effectiveCourseId = targetCourseId;
    if (!effectiveCourseId) {
      const anyCourse = await this.prisma.course.findFirst({ select: { id: true } });
      effectiveCourseId = anyCourse?.id || "00000000-0000-0000-0000-000000000000";
    }

    // Save ScanJob + ScanPages
    const newScanJob = await this.prisma.scanJob.create({
      data: {
        title: computedTitle,
        course_id: effectiveCourseId,
        topic_id: targetTopicId,
        status: ScanJobStatus.PROCESSING,
        created_by: resolvedAdminId,
        pages: {
          create: input.pages.map((p, idx) => ({
            page_no: idx + 1,
            image_key: (p as any).key || p.name,
            rotation_deg: (p as any).rotationDeg ?? 0,
            crop_data: { mime: p.mime, sizeBytes: p.sizeBytes, ...(p as any).cropData },
          })),
        },
      },
      include: {
        pages: true,
        topic: true,
        course: {
          include: {
            semester: {
              include: {
                program: {
                  include: {
                    university: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Enqueue PDF conversion and OCR to BullMQ worker pipeline
    try {
      await this.queue.addScanPdfJob({
        jobId: newScanJob.id,
        title: computedTitle,
        kind: input.kind,
        pages: input.pages.map((p, idx) => ({
          pageNo: idx + 1,
          imageKey: (p as any).key || p.name,
          rotationDeg: (p as any).rotationDeg ?? 0,
          cropData: (p as any).cropData ?? null,
          name: p.name,
          mime: p.mime,
        })),
        metadata,
        generateOcr: true,
      });
    } catch (queueErr: any) {
      this.logger.warn(`Could not dispatch to BullMQ: ${queueErr.message}`);
    }

    const formatted = this.formatScanRecord(newScanJob);

    // Record Audit Log entry
    try {
      const targetText = `${KIND_TEXT[formatted.kind]} scan ${formatted.id} · ${formatted.courseCode ?? formatted.universityShortName}`;
      await this.prisma.auditLog.create({
        data: {
          actor_id: resolvedAdminId,
          actor_role: Role.ADMIN,
          action: "SCAN_ADDED",
          target_type: "ScanJob",
          target_id: newScanJob.id,
          metadata: {
            target: targetText,
          },
        },
      });
    } catch (auditErr) {
      this.logger.warn("Failed to write audit log for scan creation", auditErr);
    }

    return formatted;
  }
}
