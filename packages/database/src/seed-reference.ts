/**
 * Reference data seed: universities, programs, semesters and courses.
 *
 * - Safe for production. It contains no demo students, payments, tickets, fake questions or default passwords.
 * - Idempotent. Run it as often as you like; rows are matched on their natural keys and updated in place.
 * - Every course is placed in the semester it belongs to, for every university and program (the earlier
 *   seed put all courses in one semester of one program, so every other scope showed an empty course list).
 * - New rows get a deterministic UUID (v5) so the bundled mobile seed (scripts/generate-seed-catalog.mjs)
 *   and the server agree on every id.
 *
 * Source of truth: packages/database/data/curriculum.json
 *
 * Run:  npm run db:seed:reference --workspace=@mastara/database
 */
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import { PublicationStatus, Stream } from "@prisma/client";

import { prisma } from "./client";

interface Curriculum {
  idNamespace: string;
  universities: Array<{ code: string; nameEn: string; nameAm: string }>;
  programs: Array<{ code: string; nameEn: string; nameAm: string }>;
  semesters: Array<{ number: 1 | 2; code: string; nameEn: string; nameAm: string }>;
  courses: Array<{
    semester: 1 | 2;
    stream: keyof typeof Stream;
    code: string;
    titleEn: string;
    titleAm: string;
    accent: string;
    icon: string;
    promotional: boolean;
  }>;
}

/** UUID v5 (SHA-1, RFC 4122). Must stay identical to the copy in scripts/generate-seed-catalog.mjs. */
export function stableId(namespace: string, name: string): string {
  const ns = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(ns).update(name, "utf8").digest();
  hash[6] = ((hash[6] ?? 0) & 0x0f) | 0x50;
  hash[8] = ((hash[8] ?? 0) & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function loadCurriculum(): Curriculum {
  // Works from src/ (ts-node) and from dist/ (compiled): both sit next to ../data.
  const file = path.resolve(__dirname, "../data/curriculum.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as Curriculum;
}

export async function seedReference(): Promise<{
  universities: number;
  programs: number;
  semesters: number;
  courses: number;
}> {
  const data = loadCurriculum();
  const ns = data.idNamespace;
  const counts = { universities: 0, programs: 0, semesters: 0, courses: 0 };

  for (const [uIndex, u] of data.universities.entries()) {
    const university = await prisma.university.upsert({
      where: { code: u.code },
      update: { name_en: u.nameEn, name_am: u.nameAm, status: PublicationStatus.PUBLISHED, sort_order: uIndex + 1 },
      create: {
        id: stableId(ns, `university:${u.code}`),
        code: u.code,
        name_en: u.nameEn,
        name_am: u.nameAm,
        status: PublicationStatus.PUBLISHED,
        sort_order: uIndex + 1,
      },
    });
    counts.universities++;

    for (const [pIndex, p] of data.programs.entries()) {
      const program = await prisma.program.upsert({
        where: { university_id_code: { university_id: university.id, code: p.code } },
        update: { name_en: p.nameEn, name_am: p.nameAm, status: PublicationStatus.PUBLISHED, sort_order: pIndex + 1 },
        create: {
          id: stableId(ns, `program:${u.code}:${p.code}`),
          university_id: university.id,
          code: p.code,
          name_en: p.nameEn,
          name_am: p.nameAm,
          status: PublicationStatus.PUBLISHED,
          sort_order: pIndex + 1,
        },
      });
      counts.programs++;

      for (const s of data.semesters) {
        const semester = await prisma.semester.upsert({
          where: { program_id_code: { program_id: program.id, code: s.code } },
          update: { name_en: s.nameEn, name_am: s.nameAm, status: PublicationStatus.PUBLISHED, sort_order: s.number },
          create: {
            id: stableId(ns, `semester:${u.code}:${p.code}:${s.code}`),
            program_id: program.id,
            code: s.code,
            name_en: s.nameEn,
            name_am: s.nameAm,
            status: PublicationStatus.PUBLISHED,
            sort_order: s.number,
          },
        });
        counts.semesters++;

        const semesterCourses = data.courses.filter((c) => c.semester === s.number);
        for (const [cIndex, c] of semesterCourses.entries()) {
          await prisma.course.upsert({
            where: { semester_id_code: { semester_id: semester.id, code: c.code } },
            update: {
              university_id: university.id,
              title_en: c.titleEn,
              title_am: c.titleAm,
              stream: Stream[c.stream],
              icon: c.icon,
              accent: c.accent,
              is_promotional: c.promotional,
              status: PublicationStatus.PUBLISHED,
              sort_order: cIndex + 1,
            },
            create: {
              id: stableId(ns, `course:${u.code}:${p.code}:${s.code}:${c.code}`),
              semester_id: semester.id,
              university_id: university.id,
              code: c.code,
              title_en: c.titleEn,
              title_am: c.titleAm,
              stream: Stream[c.stream],
              icon: c.icon,
              accent: c.accent,
              is_promotional: c.promotional,
              status: PublicationStatus.PUBLISHED,
              sort_order: cIndex + 1,
            },
          });
          counts.courses++;
        }
      }
    }
  }

  return counts;
}

/**
 * The API serves the catalog snapshot from a version kept in Redis. Rows written straight to PostgreSQL do not
 * move that version, so phones that already synced would be told "304 Not Modified" and never see the new
 * courses. Bump the version and drop the cached snapshots after seeding.
 */
async function invalidateCatalogCache(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("REDIS_URL is not set: restart the API (or bump the catalog version) so phones pick up the new catalog.");
    return;
  }
  try {
    // ioredis is installed for the API workspace; resolve it lazily so this package does not depend on it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis");
    const client = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: false });
    try {
      await client.set("catalog:version", `v-${Date.now()}`);
      const keys: string[] = await client.keys("catalog:snapshot:*");
      if (keys.length > 0) await client.del(...keys);
      console.log("Catalog cache invalidated: phones will download the new catalog on their next sync.");
    } finally {
      await client.quit().catch(() => undefined);
    }
  } catch (error) {
    console.warn("Could not invalidate the catalog cache in Redis:", (error as Error).message);
  }
}

async function main() {
  console.log("Seeding reference catalog (universities, programs, semesters, courses)...");
  const counts = await seedReference();
  console.log(
    `Done: ${counts.universities} universities, ${counts.programs} programs, ${counts.semesters} semesters, ${counts.courses} courses.`,
  );
  await invalidateCatalogCache();
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("Reference seed failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
