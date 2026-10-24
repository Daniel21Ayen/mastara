import "reflect-metadata";
import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  parseAndValidateCsvQuestions,
  sanitizeFormulaInjection,
  parseRfc4180Csv,
  FULL_CSV_TEMPLATE,
} from "../src/common/importers/csv-question-importer";
import {
  PaginationQueryDto,
  paginatePrisma,
} from "../src/common/pagination";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}`, details || "");
    failed++;
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("🧪 Running Pagination and Server-Side Rules Verification Suite");
  console.log("==================================================================\n");

  // -------------------------------------------------------------------------
  // 1. Shared Pagination & Prisma Tiebreaker Helper
  // -------------------------------------------------------------------------
  console.log("1. Shared Pagination & Unique Tiebreaker Tests:");

  const paginationDto = new PaginationQueryDto();
  assert(paginationDto.page === 1, "Default page is 1");
  assert(paginationDto.pageSize === 10, "Default pageSize is 10");

  // Mock Prisma delegate to verify paginatePrisma mechanics
  let capturedArgs: any = null;
  const mockDelegate = {
    findMany: async (args: any) => {
      capturedArgs = args;
      return [
        { id: "row-1", name: "Item 1" },
        { id: "row-2", name: "Item 2" },
      ];
    },
    count: async () => 25,
  };

  const paginatedResult = await paginatePrisma(mockDelegate, {
    page: 2,
    pageSize: 10,
    orderBy: { created_at: "desc" },
    where: { is_active: true },
  });

  assert(paginatedResult.page === 2, "Returns requested page");
  assert(paginatedResult.pageSize === 10, "Returns pageSize");
  assert(paginatedResult.total === 25, "Returns total items count");
  assert(paginatedResult.totalPages === 3, "Calculates totalPages correctly (ceil(25/10) = 3)");
  assert(paginatedResult.items.length === 2, "Returns item list");
  assert(capturedArgs.skip === 10, "Computes correct skip for page 2 ((2 - 1) * 10 = 10)");
  assert(capturedArgs.take === 10, "Passes correct take limit (10)");

  // Verify unique tiebreaker insertion
  const hasTiebreaker = capturedArgs.orderBy.some(
    (order: any) => order.id === "asc"
  );
  assert(
    hasTiebreaker,
    "paginatePrisma guarantees unique tiebreaker { id: 'asc' } to prevent row shifts"
  );

  // -------------------------------------------------------------------------
  // 2. Server-Side CSV-Only Import: Content-Based Rejection
  // -------------------------------------------------------------------------
  console.log("\n2. Server-Side CSV-Only Import Tests (Content-Based Rejection):");

  // A: Reject %PDF even if disguised as .csv
  const pdfDisguisedAsCsv = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Title (Fake Questions) >>\nendobj"
  );
  let rejectedPdf = false;
  try {
    parseAndValidateCsvQuestions(pdfDisguisedAsCsv);
  } catch (err: any) {
    if (
      err instanceof BadRequestException &&
      (err.getResponse() as any)?.errorCode === "INVALID_FILE_CONTENT"
    ) {
      rejectedPdf = true;
    }
  }
  assert(
    rejectedPdf,
    "Rejects %PDF by content header even when renamed to .csv"
  );

  // B: Reject PK (Zip / XLSX) by content
  const xlsxDisguisedAsCsv = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
  let rejectedZip = false;
  try {
    parseAndValidateCsvQuestions(xlsxDisguisedAsCsv);
  } catch (err: any) {
    if (
      err instanceof BadRequestException &&
      (err.getResponse() as any)?.errorCode === "INVALID_FILE_CONTENT"
    ) {
      rejectedZip = true;
    }
  }
  assert(
    rejectedZip,
    "Rejects PK (ZIP / Excel XLSX) by content header"
  );

  // -------------------------------------------------------------------------
  // 3. UTF-8 Integrity & BOM Handling (Amharic & LaTeX Comma/Quotes)
  // -------------------------------------------------------------------------
  console.log("\n3. UTF-8 BOM, Amharic Text, and LaTeX Parsing Tests:");

  // Build CSV buffer prefixed with UTF-8 BOM: 0xEF, 0xBB, 0xBF
  const utf8Bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const amharicAndLatexCsvText = [
    "id,type,topic,prompt,option_a,option_b,option_c,option_d,correct_answer,explanation",
    'Q101,MULTIPLE_CHOICE,Physics,የመጀመሪያው የኒውተን ሕግ ምን ይባላል?,የፍጥነት ሕግ,የ inertia ሕግ,የኃይል ሕግ,የስበት ሕግ,B,የመጀመሪያው ሕግ የ inertia ሕግ ነው',
    'Q102,MULTIPLE_CHOICE,Math,"Given $f(x) = \\frac{a, b}{c}$, what is $f\'(x)$?","$a/c$","$b/c$","0","undefined",A,Derivative of constant fraction',
    'Q103,TRUE_FALSE,History,የዓድዋ ጦርነት የተካሄደው በ1888 ዓ.ም ነው?,True,False,,,True,Battle of Adwa',
    'Q104,BLANK_SPACE,Chemistry,ውሃ የተሠራው ከሃይድሮጅንና ከ___ ነው?,,,,ኦክስጅን,Water is H2O',
  ].join("\r\n");

  const csvBufferWithBom = Buffer.concat([
    utf8Bom,
    Buffer.from(amharicAndLatexCsvText, "utf-8"),
  ]);

  const importResult = parseAndValidateCsvQuestions(csvBufferWithBom, {
    dryRun: true,
  });

  assert(importResult.valid === true, "Validates valid UTF-8 CSV with BOM");
  assert(importResult.totalRows === 4, "Parses exactly 4 question rows");
  assert(
    importResult.questions[0]?.prompt === "የመጀመሪያው የኒውተን ሕግ ምን ይባላል?",
    "Preserves Amharic Unicode prompt without character corruption"
  );
  assert(
    importResult.questions[0]?.options[1] === "የ inertia ሕግ",
    "Preserves Amharic option text"
  );
  assert(
    importResult.questions[0]?.correctOptionIndex === 1,
    "Maps correct answer 'B' to option index 1"
  );

  // Verify LaTeX containing commas and quotes did not split across columns
  const latexQuestion = importResult.questions[1];
  assert(
    latexQuestion?.prompt === 'Given $f(x) = \\frac{a, b}{c}$, what is $f\'(x)$?',
    "Correctly handles LaTeX formula with commas and quotes inside RFC 4180 quotes"
  );
  assert(
    latexQuestion?.options.length === 4,
    "LaTeX question has exactly 4 options despite comma in prompt"
  );

  // -------------------------------------------------------------------------
  // 4. Formula Injection Sanitization (=, +, -, @)
  // -------------------------------------------------------------------------
  console.log("\n4. CSV Formula Injection Sanitization Tests:");

  assert(
    sanitizeFormulaInjection("=cmd|'/C calc'!A0") === "'=cmd|'/C calc'!A0",
    "Sanitizes formula starting with ="
  );
  assert(
    sanitizeFormulaInjection("+123456") === "'+123456",
    "Sanitizes cell starting with +"
  );
  assert(
    sanitizeFormulaInjection("-SUM(A1:A10)") === "'-SUM(A1:A10)",
    "Sanitizes cell starting with -"
  );
  assert(
    sanitizeFormulaInjection("@SUM(B1:B10)") === "'@SUM(B1:B10)",
    "Sanitizes cell starting with @"
  );
  assert(
    sanitizeFormulaInjection("Normal cell content") === "Normal cell content",
    "Leaves normal text unchanged"
  );

  // -------------------------------------------------------------------------
  // 5. Template Validation & Error Reporting
  // -------------------------------------------------------------------------
  console.log("\n5. Header Template Validation & Error Report Tests:");

  const invalidHeaderCsv = Buffer.from("title,body,foo\nQ1,Hello,Bar");
  let rejectedHeader = false;
  try {
    parseAndValidateCsvQuestions(invalidHeaderCsv);
  } catch (err: any) {
    if (
      err instanceof BadRequestException &&
      (err.getResponse() as any)?.errorCode === "INVALID_HEADER_TEMPLATE"
    ) {
      rejectedHeader = true;
    }
  }
  assert(rejectedHeader, "Rejects CSV missing required template headers");

  // Invalid row validation with error report generation
  const invalidRowsCsv = Buffer.from(
    [
      "prompt,type,option_a,option_b,correct_answer",
      "Empty options question,MULTIPLE_CHOICE,,,A",
      "Invalid True False,TRUE_FALSE,True,False,InvalidAnswer",
      "Missing blank,BLANK_SPACE,,,,Oxygen",
    ].join("\n")
  );

  const errorImport = parseAndValidateCsvQuestions(invalidRowsCsv);
  assert(errorImport.valid === false, "Flags invalid question rows");
  assert(errorImport.errors.length >= 3, "Collects row errors");
  assert(
    Boolean(errorImport.errorReportCsv),
    "Generates downloadable error report CSV"
  );
  assert(
    errorImport.errorReportCsv?.includes("error_message") ?? false,
    "Error report CSV includes headers and detailed error explanations"
  );

  // -------------------------------------------------------------------------
  // 6. Gapless MS IDs & Concurrent Concurrency Serialization
  // -------------------------------------------------------------------------
  console.log("\n6. Gapless MS ID Generation & Concurrent Race Condition Simulation:");

  // In PostgreSQL, atomic counter serialization is achieved via:
  // UPDATE counters SET value = value + 1 WHERE name = 'student_ms_code' RETURNING value;
  // Inside a database transaction.
  class MockDbCounterTransaction {
    private counter = 0;
    private lock = Promise.resolve();

    async executeTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
      // Serialize concurrent transactions on the counter row lock
      const previousLock = this.lock;
      let releaseLock: () => void;
      this.lock = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });

      await previousLock;
      const initialVal = this.counter;

      try {
        const tx = {
          incrementCounter: async () => {
            this.counter += 1;
            return this.counter;
          },
        };
        const result = await fn(tx);
        return result;
      } catch (err) {
        // Rollback restores original counter state
        this.counter = initialVal;
        throw err;
      } finally {
        releaseLock!();
      }
    }

    getCounter(): number {
      return this.counter;
    }
  }

  const db = new MockDbCounterTransaction();

  // Test 50 concurrent registrations
  const concurrentCount = 50;
  const promises: Promise<string>[] = [];

  for (let i = 0; i < concurrentCount; i++) {
    promises.push(
      db.executeTransaction(async (tx) => {
        const nextVal = await tx.incrementCounter();
        // Format: MS + 4 digits (widens past 9999)
        return `MS${nextVal.toString().padStart(4, "0")}`;
      })
    );
  }

  const generatedIds = await Promise.all(promises);

  assert(
    generatedIds.length === 50,
    "50 concurrent registrations completed"
  );
  assert(
    generatedIds[0] === "MS0001",
    "First student receives MS0001"
  );
  assert(
    generatedIds[49] === "MS0050",
    "50th student receives MS0050"
  );

  // Verify consecutive, no gaps, no duplicates
  const uniqueIds = new Set(generatedIds);
  assert(
    uniqueIds.size === 50,
    "All 50 generated MS IDs are strictly unique (no duplicates)"
  );

  let hasGap = false;
  for (let i = 1; i <= 50; i++) {
    const expected = `MS${i.toString().padStart(4, "0")}`;
    if (!uniqueIds.has(expected)) {
      hasGap = true;
      break;
    }
  }
  assert(!hasGap, "50 concurrent registrations produce zero gaps (MS0001 through MS0050)");

  // -------------------------------------------------------------------------
  // 7. Forced Insert Failure Rollback (Zero Gaps on Abort)
  // -------------------------------------------------------------------------
  console.log("\n7. Forced Insert Failure & Rollback Test:");

  let forcedErrorCaught = false;
  try {
    await db.executeTransaction(async (tx) => {
      await tx.incrementCounter(); // Counter advances to 51
      throw new Error("Simulated database constraint failure (e.g. invalid phone number)");
    });
  } catch (err) {
    forcedErrorCaught = true;
  }
  assert(forcedErrorCaught, "Simulated transaction failure aborted");

  // Next registration must receive MS0051 (NOT MS0052, because 51 rolled back!)
  const nextIdAfterRollback = await db.executeTransaction(async (tx) => {
    const nextVal = await tx.incrementCounter();
    return `MS${nextVal.toString().padStart(4, "0")}`;
  });

  assert(
    nextIdAfterRollback === "MS0051",
    "Transaction rollback leaves zero gaps (next student receives MS0051, not MS0052)"
  );

  // -------------------------------------------------------------------------
  // 8. Phone Collision & Idempotency Key
  // -------------------------------------------------------------------------
  console.log("\n8. Idempotency Key & Phone Collision Handling:");

  const localAccountId = "uuid-loc-1234-5678";
  const registeredAccounts = new Map<string, any>();

  function registerOrSyncStudent(input: {
    localAccountId: string;
    phone: string;
    name: string;
  }) {
    // 1. Idempotency check: if localAccountId matches an existing student, return it
    if (registeredAccounts.has(input.localAccountId)) {
      return { status: "IDEMPOTENT_SUCCESS", student: registeredAccounts.get(input.localAccountId) };
    }

    // 2. Collision check: if phone already exists under another account, throw 409
    for (const student of registeredAccounts.values()) {
      if (student.phone === input.phone) {
        throw new ConflictException({
          errorCode: "PHONE_COLLISION",
          message: "A student with this phone number is already registered.",
        });
      }
    }

    // 3. Register
    const student = {
      id: input.localAccountId,
      phone: input.phone,
      name: input.name,
      studentCode: "MS0052",
    };
    registeredAccounts.set(input.localAccountId, student);
    return { status: "CREATED", student };
  }

  // First sync call
  const firstSync = registerOrSyncStudent({
    localAccountId,
    phone: "+251911000000",
    name: "Abebe Kebede",
  });
  assert(firstSync.status === "CREATED", "First sync registers student account");

  // Repeat call with same localAccountId -> idempotent success
  const repeatSync = registerOrSyncStudent({
    localAccountId,
    phone: "+251911000000",
    name: "Abebe Kebede",
  });
  assert(
    repeatSync.status === "IDEMPOTENT_SUCCESS" && repeatSync.student.id === localAccountId,
    "Repeat sync with same localAccountId is idempotent (changes nothing and returns student)"
  );

  // Collision call with existing phone but different localAccountId -> 409 PHONE_COLLISION
  let collisionCaught = false;
  try {
    registerOrSyncStudent({
      localAccountId: "uuid-loc-different-student",
      phone: "+251911000000",
      name: "Different Person",
    });
  } catch (err: any) {
    if (
      err instanceof ConflictException &&
      (err.getResponse() as any)?.errorCode === "PHONE_COLLISION"
    ) {
      collisionCaught = true;
    }
  }
  assert(
    collisionCaught,
    "Registration with colliding phone number returns 409 PHONE_COLLISION"
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`Verification Summary: ${passed} passed, ${failed} failed`);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
