import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../src/infrastructure/database/database.module";
import { PrismaService } from "../src/infrastructure/database/prisma.service";
import { StudentsModule } from "../src/modules/identity/students/students.module";
import { StudentsService } from "../src/modules/identity/students/services/students.service";
import { NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { Role, StudentStatus, Stream } from "@mastara/database";
import { StudentStreamSelection } from "../src/modules/identity/students/dto/update-academic.dto";

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

async function runStudentProfileTests() {
  console.log("=== Testing Step 4: Student Profile & Academic Scope (FR-160 to FR-162) ===\n");

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: [".env", "../../.env"],
      }),
      DatabaseModule,
      StudentsModule,
    ],
  }).compile();

  const studentsService = moduleFixture.get<StudentsService>(StudentsService);
  const prisma = moduleFixture.get<PrismaService>(PrismaService);

  // ----------------------------------------------------
  // 1. Setup Academic Fixtures (University, Program, Semester, Courses)
  // ----------------------------------------------------
  const university = await prisma.university.create({
    data: {
      name_en: "Test University of Science and Technology",
      name_am: "የሳይንስ እና ቴክኖሎጂ ዩኒቨርሲቲ",
      code: `TUST-${Date.now()}`,
    },
  });

  const program = await prisma.program.create({
    data: {
      university_id: university.id,
      name_en: "Freshman Engineering",
      name_am: "ፍሬሽማን ኢንጂነሪንግ",
      code: `ENG-${Date.now()}`,
    },
  });

  const semester = await prisma.semester.create({
    data: {
      program_id: program.id,
      name_en: "Semester 1",
      name_am: "ሴሚስተር 1",
      code: `SEM1-${Date.now()}`,
    },
  });

  const course1 = await prisma.course.create({
    data: {
      semester_id: semester.id,
      code: `MATH-${Date.now()}`,
      title_en: "Calculus I",
      title_am: "ካልኩለስ 1",
      stream: Stream.NATURAL,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      semester_id: semester.id,
      code: `PHYS-${Date.now()}`,
      title_en: "General Physics",
      title_am: "አጠቃላይ ፊዚክስ",
      stream: Stream.NATURAL,
    },
  });

  const course3 = await prisma.course.create({
    data: {
      semester_id: semester.id,
      code: `CHEM-${Date.now()}`,
      title_en: "General Chemistry",
      title_am: "አጠቃላይ ኬሚስትሪ",
      stream: Stream.NATURAL,
    },
  });

  // ----------------------------------------------------
  // 2. Setup Test Student
  // ----------------------------------------------------
  const randomPhone1 = `+2519${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testStudent = await prisma.student.create({
    data: {
      first_name: "Blen",
      last_name: "Tessema",
      phone: randomPhone1,
      password_hash: "hashedsecret123",
      role: Role.STUDENT,
      status: StudentStatus.ACTIVE,
    },
  });

  const studentId = testStudent.id;

  try {
    // ----------------------------------------------------
    // Test 1: Initial Profile Retrieval
    // ----------------------------------------------------
    console.log("1. Get Profile Initial State:");
    const initialProfile = await studentsService.getProfile(studentId);
    assert(
      initialProfile.id === studentId &&
        initialProfile.name === "Blen Tessema" &&
        initialProfile.phone === randomPhone1 &&
        initialProfile.academic === null &&
        initialProfile.courseIds.length === 0 &&
        initialProfile.profileCompleted === false,
      "Returns initial profile with empty academic scope and uncompleted status",
    );

    // ----------------------------------------------------
    // Test 2: Academic Scope Updating & Validation
    // ----------------------------------------------------
    console.log("\n2. Academic Scope Update & Validation:");

    // 2.1 Non-existent university
    let uniThrew = false;
    try {
      await studentsService.updateAcademicScope(studentId, {
        universityId: "00000000-0000-0000-0000-000000000000",
        programId: program.id,
        semesterId: semester.id,
        stream: StudentStreamSelection.NATURAL,
      });
    } catch (e: any) {
      uniThrew = e instanceof NotFoundException;
    }
    assert(uniThrew, "Rejects non-existent university with NotFoundException");

    // 2.2 Non-existent program
    let progThrew = false;
    try {
      await studentsService.updateAcademicScope(studentId, {
        universityId: university.id,
        programId: "00000000-0000-0000-0000-000000000000",
        semesterId: semester.id,
        stream: StudentStreamSelection.NATURAL,
      });
    } catch (e: any) {
      progThrew = e instanceof NotFoundException;
    }
    assert(progThrew, "Rejects non-existent program with NotFoundException");

    // 2.3 Non-existent semester
    let semThrew = false;
    try {
      await studentsService.updateAcademicScope(studentId, {
        universityId: university.id,
        programId: program.id,
        semesterId: "00000000-0000-0000-0000-000000000000",
        stream: StudentStreamSelection.NATURAL,
      });
    } catch (e: any) {
      semThrew = e instanceof NotFoundException;
    }
    assert(semThrew, "Rejects non-existent semester with NotFoundException");

    // 2.4 Valid academic scope update
    const updatedProfile = await studentsService.updateAcademicScope(studentId, {
      universityId: university.id,
      programId: program.id,
      semesterId: semester.id,
      stream: StudentStreamSelection.NATURAL,
    });
    assert(
      updatedProfile.academic !== null &&
        updatedProfile.academic.universityId === university.id &&
        updatedProfile.academic.programId === program.id &&
        updatedProfile.academic.semesterId === semester.id &&
        updatedProfile.academic.stream === Stream.NATURAL &&
        updatedProfile.profileCompleted === true,
      "Successfully updates academic scope and sets profileCompleted to true",
    );

    // ----------------------------------------------------
    // Test 3: Course Selection & Transactional Sync
    // ----------------------------------------------------
    console.log("\n3. Course Selection Synchronization:");

    // 3.1 Invalid course ID rejection
    let courseThrew = false;
    try {
      await studentsService.updateCourses(studentId, {
        courseIds: [course1.id, "00000000-0000-0000-0000-000000000000"],
      });
    } catch (e: any) {
      courseThrew = e instanceof BadRequestException;
    }
    assert(courseThrew, "Rejects non-existent course IDs with BadRequestException");

    // 3.2 Enroll initial courses [course1, course2]
    const enroll1 = await studentsService.updateCourses(studentId, {
      courseIds: [course1.id, course2.id],
    });
    assert(
      enroll1.success &&
        enroll1.courseIds.length === 2 &&
        enroll1.courseIds.includes(course1.id) &&
        enroll1.courseIds.includes(course2.id),
      "Successfully enrolls initial course selections",
    );

    const dbCourses1 = await prisma.studentCourse.findMany({
      where: { student_id: studentId, is_active: true },
    });
    assert(dbCourses1.length === 2, "Database records 2 active studentCourse records");

    // 3.3 Synchronize course update: remove course1, keep course2, add course3
    const enroll2 = await studentsService.updateCourses(studentId, {
      courseIds: [course2.id, course3.id],
    });
    assert(
      enroll2.success &&
        enroll2.courseIds.length === 2 &&
        !enroll2.courseIds.includes(course1.id) &&
        enroll2.courseIds.includes(course3.id),
      "Successfully updates course list (removes course1, retains course2, adds course3)",
    );

    const deactivatedCourse1 = await prisma.studentCourse.findUnique({
      where: {
        student_id_course_id: {
          student_id: studentId,
          course_id: course1.id,
        },
      },
    });
    assert(
      deactivatedCourse1?.is_active === false && deactivatedCourse1.removed_at !== null,
      "Deactivates unselected course with is_active=false and timestamped removed_at",
    );

    const recheckProfile = await studentsService.getProfile(studentId);
    assert(
      recheckProfile.courseIds.length === 2 &&
        recheckProfile.courseIds.includes(course2.id) &&
        recheckProfile.courseIds.includes(course3.id),
      "getProfile reflects synchronized active courses",
    );

    // ----------------------------------------------------
    // Test 4: Account Details Update & Conflict Checking
    // ----------------------------------------------------
    console.log("\n4. Account Details Update & Conflicts:");

    // 4.1 Create a second student for collision checking
    const randomPhone2 = `+2519${Math.floor(10000000 + Math.random() * 90000000)}`;
    const secondStudent = await prisma.student.create({
      data: {
        first_name: "Dawit",
        last_name: "Alemu",
        phone: randomPhone2,
        email: "dawit@mastara.edu.et",
        password_hash: "hashedsecret456",
      },
    });

    // 4.2 Attempt conflict update
    let conflictThrew = false;
    try {
      await studentsService.updateAccount(studentId, {
        identifier: randomPhone2,
      });
    } catch (e: any) {
      conflictThrew = e instanceof ConflictException;
    }
    assert(conflictThrew, "Rejects identifier conflict with 409 ConflictException");

    // 4.3 Update account name and phone successfully
    const newPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const updatedAccount = await studentsService.updateAccount(studentId, {
      name: "Blen Girma Tessema",
      identifier: newPhone,
    });
    assert(
      updatedAccount.name === "Blen Girma Tessema" &&
        updatedAccount.phone === `+251${newPhone.slice(1)}`,
      "Updates student name and normalizes Ethiopian local phone (09... -> +2519...)",
    );

    // Cleanup second student
    await prisma.student.delete({ where: { id: secondStudent.id } });
  } finally {
    // ----------------------------------------------------
    // 5. Cleanup Fixtures
    // ----------------------------------------------------
    await prisma.studentCourse.deleteMany({ where: { student_id: studentId } });
    await prisma.student.delete({ where: { id: studentId } });
    await prisma.course.deleteMany({
      where: { id: { in: [course1.id, course2.id, course3.id] } },
    });
    await prisma.semester.delete({ where: { id: semester.id } });
    await prisma.program.delete({ where: { id: program.id } });
    await prisma.university.delete({ where: { id: university.id } });
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  await moduleFixture.close();

  if (failed > 0) {
    process.exit(1);
  }
}

runStudentProfileTests().catch((err) => {
  console.error("Student profile test failed:", err);
  process.exit(1);
});
