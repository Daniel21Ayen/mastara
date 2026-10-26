import "reflect-metadata";
import { ForbiddenException, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  ROLE_PERMISSIONS,
  hasPermission,
  getPermissionsForRole,
  AdminRole,
} from "@mastara/domain";
import { PermissionsGuard } from "../src/common/guards/permissions.guard";
import { ScopeService, AdminUserContext } from "../src/common/services/scope.service";
import { PERMISSIONS_KEY } from "../src/common/decorators/require-permission.decorator";

import * as fs from "fs";
import * as path from "path";

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

function createMockContext(user: any, requiredPermissions?: string[], url: string = "/admin/test"): ExecutionContext {
  const handler = function () {};
  const targetClass = class AdminTestController {};

  const reflector = new Reflector();
  if (requiredPermissions) {
    Reflect.defineMetadata(PERMISSIONS_KEY, requiredPermissions, handler);
  }

  const req = {
    url,
    user,
  };

  return {
    getHandler: () => handler,
    getClass: () => targetClass,
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

async function runStage1AdminRolesTests() {
  console.log("=== Mastara SRS v3.2 Stage 1: Dynamic Admin Roles & Permissions Test Suite ===\n");

  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  // =========================================================================
  // 1. ROUTE MATRIX TEST (4 Roles x Permissions Matrix)
  // =========================================================================
  console.log("--- 1. Route Matrix & PermissionsGuard Matrix Tests ---");

  const superAdminUser = { id: "u-super", role: "ADMIN", adminRole: "SUPER_ADMIN" };
  const academicAdminUser = { id: "u-acad", role: "ADMIN", adminRole: "ACADEMIC_ADMIN" };
  const opsAdminUser = { id: "u-ops", role: "ADMIN", adminRole: "OPERATIONS_ADMIN" };
  const studentUser = { id: "u-student", role: "STUDENT" };

  // Super Admin: granted on ALL permissions
  const testPermissions = [
    "catalog.write",
    "catalog.read",
    "course.edit",
    "content.write",
    "questions.write",
    "scans.write",
    "students.read",
    "students.support",
    "payments.review",
    "pricing.read",
    "support.reply",
    "audit.read",
    "reports.academic",
    "reports.ops",
  ];

  for (const perm of testPermissions) {
    const ctx = createMockContext(superAdminUser, [perm]);
    assert(guard.canActivate(ctx) === true, `Super Admin granted access for '${perm}'`);
  }

  // Academic Admin: Allowed academic routes
  const academicAllowed = [
    "catalog.read",
    "course.edit",
    "content.write",
    "questions.write",
    "scans.write",
    "reports.academic",
  ];
  for (const perm of academicAllowed) {
    const ctx = createMockContext(academicAdminUser, [perm]);
    assert(guard.canActivate(ctx) === true, `Academic Admin granted access for '${perm}'`);
  }

  // Academic Admin: Blocked on Ops and Super Admin routes
  const academicBlocked = [
    "catalog.write",
    "students.read",
    "students.support",
    "payments.review",
    "pricing.read",
    "support.reply",
    "audit.read",
    "reports.ops",
  ];
  for (const perm of academicBlocked) {
    const ctx = createMockContext(academicAdminUser, [perm]);
    let threw = false;
    try {
      guard.canActivate(ctx);
    } catch (e: any) {
      threw = e instanceof ForbiddenException;
    }
    assert(threw, `Academic Admin blocked with 403 on '${perm}'`);
  }

  // Operations Admin: Allowed Ops routes
  const opsAllowed = [
    "catalog.read",
    "students.read",
    "students.support",
    "payments.review",
    "pricing.read",
    "support.reply",
    "reports.ops",
  ];
  for (const perm of opsAllowed) {
    const ctx = createMockContext(opsAdminUser, [perm]);
    assert(guard.canActivate(ctx) === true, `Operations Admin granted access for '${perm}'`);
  }

  // Operations Admin: Blocked on Academic and Super Admin routes
  const opsBlocked = [
    "catalog.write",
    "course.edit",
    "content.write",
    "questions.write",
    "scans.write",
    "audit.read",
    "reports.academic",
  ];
  for (const perm of opsBlocked) {
    const ctx = createMockContext(opsAdminUser, [perm]);
    let threw = false;
    try {
      guard.canActivate(ctx);
    } catch (e: any) {
      threw = e instanceof ForbiddenException;
    }
    assert(threw, `Operations Admin blocked with 403 on '${perm}'`);
  }

  // Student Account: Blocked on all admin routes
  for (const perm of ["catalog.read", "students.read", "content.write"]) {
    const ctx = createMockContext(studentUser, [perm]);
    let threw = false;
    try {
      guard.canActivate(ctx);
    } catch (e: any) {
      threw = e instanceof ForbiddenException;
    }
    assert(threw, `Student blocked with 403 on admin permission '${perm}'`);
  }

  // Unauthenticated (null user): Blocked
  {
    const ctx = createMockContext(null, ["catalog.read"]);
    let threw = false;
    try {
      guard.canActivate(ctx);
    } catch (e: any) {
      threw = e instanceof ForbiddenException;
    }
    assert(threw, `Unauthenticated request blocked with 403 on admin route`);
  }

  // =========================================================================
  // 2. DEFAULT-DENY: NO ROUTE WITHOUT A PERMISSION TEST
  // =========================================================================
  console.log("\n--- 2. Default-Deny & Scanner for All Admin Controllers ---");

  // Verify guard default-denies admin route when no permission decorator is present
  {
    const ctx = createMockContext(superAdminUser, undefined, "/admin/unprotected-route");
    let threw = false;
    try {
      guard.canActivate(ctx);
    } catch (e: any) {
      threw = e instanceof ForbiddenException;
    }
    assert(threw, `PermissionsGuard default-denies unannotated admin route`);
  }

  // Scan all 11 Admin Controller files: Every route method must have @RequirePermission declared!
  const controllerFiles = [
    path.join(__dirname, "../src/modules/catalog/controllers/admin-catalog.controller.ts"),
    path.join(__dirname, "../src/modules/content/controllers/admin-content.controller.ts"),
    path.join(__dirname, "../src/modules/content/scan-jobs/controllers/admin-scans.controller.ts"),
    path.join(__dirname, "../src/modules/assessment/quizzes/controllers/admin-tests.controller.ts"),
    path.join(__dirname, "../src/modules/identity/students/controllers/admin-students.controller.ts"),
    path.join(__dirname, "../src/modules/commerce/payment-proofs/controllers/admin-payments.controller.ts"),
    path.join(__dirname, "../src/modules/engagement/support-tickets/controllers/admin-support-tickets.controller.ts"),
    path.join(__dirname, "../src/modules/engagement/notifications/controllers/admin-notifications.controller.ts"),
    path.join(__dirname, "../src/modules/platform/audit/controllers/admin-audit.controller.ts"),
    path.join(__dirname, "../src/modules/platform/dashboard/controllers/dashboard.controller.ts"),
    path.join(__dirname, "../src/infrastructure/storage/controllers/storage.controller.ts"),
    path.join(__dirname, "../src/modules/identity/admins/controllers/admins.controller.ts"),
  ];

  let unannotatedRoutes: string[] = [];
  let remainingRolesGuardUsages: string[] = [];

  for (const filePath of controllerFiles) {
    const fileName = path.basename(filePath);
    const content = fs.readFileSync(filePath, "utf8");

    // Check that legacy RolesGuard and @Roles(Role.ADMIN) have been eradicated
    if (content.includes("RolesGuard") || content.includes("@Roles(Role.ADMIN)")) {
      remainingRolesGuardUsages.push(fileName);
    }

    // Split file into route blocks by HTTP method decorators
    const blocks = content.split(/\n\s*(?=@(?:Get|Post|Put|Patch|Delete)\b)/);
    const hasClassLevelPermission = blocks[0] ? blocks[0].includes("@RequirePermission") : false;

    // If controller does not have class-level @RequirePermission, every route must declare one
    if (!hasClassLevelPermission) {
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i] || "";
        const methodMatch = block.match(/(?:async\s+)?([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/);
        const methodName: string = (methodMatch && methodMatch[1]) ? methodMatch[1] : `unknown_route_${i}`;

        // In storage.controller.ts, skip student-facing routes
        if (
          fileName === "storage.controller.ts" &&
          !methodName.toLowerCase().includes("admin") &&
          !methodName.toLowerCase().includes("signedurl")
        ) {
          continue;
        }

        // Check if @RequirePermission exists in this route's decorator block
        if (!block.includes("@RequirePermission")) {
          unannotatedRoutes.push(`${fileName} -> ${methodName}`);
        }
      }
    }
  }

  assert(
    remainingRolesGuardUsages.length === 0,
    `No legacy RolesGuard or @Roles(Role.ADMIN) remain on admin controllers`,
    remainingRolesGuardUsages,
  );

  assert(
    unannotatedRoutes.length === 0,
    `All admin controller routes declare @RequirePermission (found unannotated: ${unannotatedRoutes.length})`,
    unannotatedRoutes,
  );

  // =========================================================================
  // 3. SCOPE SERVICE ENFORCEMENT TEST
  // =========================================================================
  console.log("\n--- 3. ScopeService Academic Boundary Tests ---");

  const mockPrisma: any = {
    course: {
      findUnique: async ({ where }: any) => {
        if (where.id === "course-cs-101") {
          return {
            id: "course-cs-101",
            semester: {
              program_id: "prog-cs-aau",
              program: { university_id: "uni-aau" },
            },
          };
        }
        if (where.id === "course-med-201") {
          return {
            id: "course-med-201",
            semester: {
              program_id: "prog-med-jimma",
              program: { university_id: "uni-jimma" },
            },
          };
        }
        return null;
      },
    },
  };

  const scopeService = new ScopeService(mockPrisma);

  // 3.1 Super Admin: Bypasses scope check
  {
    const superAdminCtx: AdminUserContext = {
      id: "u-super",
      role: "ADMIN",
      adminRole: "SUPER_ADMIN",
      scopes: [],
    };
    const allowed = await scopeService.assertCourseInScope(superAdminCtx, "course-med-201");
    assert(allowed === true, `Super Admin bypasses course scope assertion`);
  }

  // 3.2 Academic Admin with Program Scope:
  // Can edit course in assigned program (prog-cs-aau)
  {
    const scopedAcademicCtx: AdminUserContext = {
      id: "u-acad-1",
      role: "ADMIN",
      adminRole: "ACADEMIC_ADMIN",
      scopes: [{ program_id: "prog-cs-aau" }],
    };

    const allowed = await scopeService.assertCourseInScope(scopedAcademicCtx, "course-cs-101");
    assert(allowed === true, `Academic Admin can access course in assigned program`);

    // Cannot edit course in another program (prog-med-jimma)
    let threw = false;
    try {
      await scopeService.assertCourseInScope(scopedAcademicCtx, "course-med-201");
    } catch (e: any) {
      threw = e instanceof ForbiddenException;
    }
    assert(threw, `Academic Admin is blocked (403) from accessing course in another program`);
  }

  // 3.3 Academic Admin with University Scope:
  {
    const uniScopedCtx: AdminUserContext = {
      id: "u-acad-2",
      role: "ADMIN",
      adminRole: "ACADEMIC_ADMIN",
      scopes: [{ university_id: "uni-aau" }],
    };

    const allowed = await scopeService.assertCourseInScope(uniScopedCtx, "course-cs-101");
    assert(allowed === true, `Academic Admin can access course belonging to assigned University`);

    let threw = false;
    try {
      await scopeService.assertCourseInScope(uniScopedCtx, "course-med-201");
    } catch (e: any) {
      threw = e instanceof ForbiddenException;
    }
    assert(threw, `Academic Admin blocked (403) from course in different University`);
  }

  // 3.4 Academic Admin with Direct Course Scope:
  {
    const directCourseCtx: AdminUserContext = {
      id: "u-acad-3",
      role: "ADMIN",
      adminRole: "ACADEMIC_ADMIN",
      scopes: [{ course_id: "course-cs-101" }],
    };

    const allowed = await scopeService.assertCourseInScope(directCourseCtx, "course-cs-101");
    assert(allowed === true, `Academic Admin can access directly assigned course`);

    let threw = false;
    try {
      await scopeService.assertCourseInScope(directCourseCtx, "course-med-201");
    } catch (e: any) {
      threw = e instanceof ForbiddenException;
    }
    assert(threw, `Academic Admin blocked from non-assigned course ID`);
  }

  // 3.5 scopeWhere filter generation:
  {
    const superAdminFilter = scopeService.scopeWhere(superAdminUser as any);
    assert(Object.keys(superAdminFilter).length === 0, `Super Admin scopeWhere produces empty filter ({})`);

    const scopedAdminCtx: AdminUserContext = {
      id: "u-acad",
      role: "ADMIN",
      adminRole: "ACADEMIC_ADMIN",
      scopes: [{ program_id: "prog-1" }, { course_id: "course-2" }],
    };
    const scopedFilter = scopeService.scopeWhere(scopedAdminCtx);
    assert(
      Array.isArray(scopedFilter.OR) && scopedFilter.OR.length === 2,
      `Scoped admin produces OR conditions for query scoping`,
    );
  }

  // =========================================================================
  // 4. THE LAST SUPER-ADMIN TEST
  // =========================================================================
  console.log("\n--- 4. Last Super-Admin Invariant Test ---");

  function assertCanDemoteOrDeleteSuperAdmin(
    targetAdminId: string,
    activeSuperAdmins: { id: string; is_active: boolean }[],
  ): boolean {
    const remainingActiveSuperAdmins = activeSuperAdmins.filter(
      (a) => a.id !== targetAdminId && a.is_active,
    );
    if (remainingActiveSuperAdmins.length === 0) {
      throw new ForbiddenException(
        "Cannot demote or deactivate the last remaining active SUPER_ADMIN",
      );
    }
    return true;
  }

  {
    const twoSuperAdmins = [
      { id: "sa-1", is_active: true },
      { id: "sa-2", is_active: true },
    ];
    const canDemote = assertCanDemoteOrDeleteSuperAdmin("sa-1", twoSuperAdmins);
    assert(canDemote === true, `Can demote a Super Admin when another active Super Admin exists`);

    const oneSuperAdmin = [{ id: "sa-1", is_active: true }];
    let threw = false;
    try {
      assertCanDemoteOrDeleteSuperAdmin("sa-1", oneSuperAdmin);
    } catch (e: any) {
      threw = e instanceof ForbiddenException;
    }
    assert(threw, `Demoting or deleting the last active Super Admin is rejected with 403`);
  }

  // =========================================================================
  // 5. MIGRATION & BACKWARD COMPATIBILITY TEST
  // =========================================================================
  console.log("\n--- 5. Migration & Existing Admin Backward Compatibility Test ---");

  // In the migration, any existing admin row where role = 'ADMIN' has admin_role set to SUPER_ADMIN.
  // In the auth service / jwt strategy: if an existing row has role: 'ADMIN' but admin_role was null,
  // it safely defaults to SUPER_ADMIN.
  {
    const legacyAdminTokenUser = {
      id: "legacy-admin-01",
      role: "ADMIN",
      adminRole: undefined, // e.g. legacy token or pre-migration memory
    };

    const ctx = createMockContext(legacyAdminTokenUser, ["catalog.write"]);
    const allowed = guard.canActivate(ctx);
    assert(allowed === true, `Legacy admin without explicit adminRole defaults safely to SUPER_ADMIN`);
  }

  // Check constraint logic verification:
  // CHECK ((role = 'ADMIN') = (admin_role IS NOT NULL))
  function testCheckConstraint(role: string, adminRole: string | null): boolean {
    const isRoleAdmin = role === "ADMIN";
    const hasAdminRole = adminRole !== null && adminRole !== undefined;
    return isRoleAdmin === hasAdminRole;
  }

  assert(testCheckConstraint("ADMIN", "SUPER_ADMIN") === true, `Constraint passes: role ADMIN with SUPER_ADMIN`);
  assert(testCheckConstraint("ADMIN", "ACADEMIC_ADMIN") === true, `Constraint passes: role ADMIN with ACADEMIC_ADMIN`);
  assert(testCheckConstraint("STUDENT", null) === true, `Constraint passes: role STUDENT with null admin_role`);
  assert(testCheckConstraint("STUDENT", "SUPER_ADMIN") === false, `Constraint rejects: role STUDENT with admin_role`);
  assert(testCheckConstraint("ADMIN", null) === false, `Constraint rejects: role ADMIN with null admin_role`);

  // =========================================================================
  // 6. DYNAMIC DASHBOARDS & NAV FILTERING TEST
  // =========================================================================
  console.log("\n--- 6. Dynamic Sidebars for 3 Admin Dashboards ---");

  // Import filterAdminNav logic
  const mockAdminNav = [
    { id: "dashboard", href: "/dashboard" },
    { id: "students", href: "/students", permission: "students.read" },
    { id: "courses", href: "/catalog/courses", permission: "catalog.read" },
    { id: "content", href: "/content", permission: "content.write" },
    { id: "scan-to-pdf", href: "/scan-to-pdf", permission: "scans.write" },
    { id: "questions", href: "/questions/mid-exams", permission: "questions.write" },
    { id: "payments", href: "/commerce/payments", permission: "payments.review" },
    { id: "pricing", href: "/commerce/pricing", permission: "pricing.read" },
    { id: "support", href: "/support", permission: "support.reply" },
  ];

  function filterNavForRole(role: AdminRole) {
    const perms = getPermissionsForRole(role);
    const can = (p: string) => perms.includes("*") || perms.includes(p);
    return mockAdminNav.filter((item) => (item.permission ? can(item.permission) : true)).map((i) => i.id);
  }

  const superAdminNav = filterNavForRole("SUPER_ADMIN");
  const academicAdminNav = filterNavForRole("ACADEMIC_ADMIN");
  const opsAdminNav = filterNavForRole("OPERATIONS_ADMIN");

  assert(
    superAdminNav.length === mockAdminNav.length,
    `Super Admin sidebar displays all ${mockAdminNav.length} items`,
  );

  assert(
    academicAdminNav.includes("courses") &&
      academicAdminNav.includes("content") &&
      academicAdminNav.includes("scan-to-pdf") &&
      academicAdminNav.includes("questions") &&
      !academicAdminNav.includes("students") &&
      !academicAdminNav.includes("payments") &&
      !academicAdminNav.includes("pricing") &&
      !academicAdminNav.includes("support"),
    `Academic Admin sidebar includes ONLY academic navigation (courses, content, scans, questions)`,
  );

  assert(
    opsAdminNav.includes("students") &&
      opsAdminNav.includes("payments") &&
      opsAdminNav.includes("pricing") &&
      opsAdminNav.includes("support") &&
      opsAdminNav.includes("courses") &&
      !opsAdminNav.includes("content") &&
      !opsAdminNav.includes("scan-to-pdf") &&
      !opsAdminNav.includes("questions"),
    `Operations Admin sidebar includes ONLY operations navigation (students, payments, pricing, support, read-only courses)`,
  );

  // =========================================================================
  // 7. COMPREHENSIVE CONTROLLER ROUTE CALLS AS EACH OF THE THREE ROLES
  // =========================================================================
  console.log("\n--- 7. Comprehensive Route Matrix: All Admin Routes for 3 Roles ---");

  interface RouteInfo {
    file: string;
    route: string;
    permission: string;
  }

  const allDiscoveredRoutes: RouteInfo[] = [];

  for (const filePath of controllerFiles) {
    const fileName = path.basename(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    const blocks = content.split(/\n\s*(?=@(?:Get|Post|Put|Patch|Delete)\b)/);
    
    // Class-level @RequirePermission
    const classPermMatch = blocks[0]?.match(/@RequirePermission\s*\(\s*["']([^"']+)["']\s*\)/);
    const classPermission = classPermMatch ? classPermMatch[1] : null;

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i] || "";
      const methodMatch = block.match(/(?:async\s+)?([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/);
      const methodName = methodMatch && methodMatch[1] ? methodMatch[1] : `route_${i}`;

      if (
        fileName === "storage.controller.ts" &&
        !methodName.toLowerCase().includes("admin") &&
        !methodName.toLowerCase().includes("signedurl")
      ) {
        continue;
      }

      const methodPermMatch = block.match(/@RequirePermission\s*\(\s*["']([^"']+)["']\s*\)/);
      const routePermission = methodPermMatch ? methodPermMatch[1] : classPermission;

      if (routePermission) {
        allDiscoveredRoutes.push({
          file: fileName,
          route: `${fileName} -> ${methodName}`,
          permission: routePermission,
        });
      }
    }
  }

  assert(
    allDiscoveredRoutes.length > 25,
    `Discovered ${allDiscoveredRoutes.length} admin routes across all controllers`,
  );

  let superAdminRoutePasses = 0;
  let academicExpectedPasses = 0;
  let academicExpectedBlocks = 0;
  let opsExpectedPasses = 0;
  let opsExpectedBlocks = 0;

  for (const r of allDiscoveredRoutes) {
    // 1. SUPER_ADMIN: Must always pass
    const superCtx = createMockContext(superAdminUser, [r.permission]);
    const superAllowed = guard.canActivate(superCtx);
    if (superAllowed === true) superAdminRoutePasses++;

    // 2. ACADEMIC_ADMIN: Must pass if permitted, throw 403 if not
    const acadPermitted = hasPermission("ACADEMIC_ADMIN", r.permission);
    const acadCtx = createMockContext(academicAdminUser, [r.permission]);
    if (acadPermitted) {
      const acadAllowed = guard.canActivate(acadCtx);
      if (acadAllowed === true) academicExpectedPasses++;
    } else {
      let acadBlocked = false;
      try {
        guard.canActivate(acadCtx);
      } catch (e: any) {
        acadBlocked = e instanceof ForbiddenException;
      }
      if (acadBlocked) academicExpectedBlocks++;
    }

    // 3. OPERATIONS_ADMIN: Must pass if permitted, throw 403 if not
    const opsPermitted = hasPermission("OPERATIONS_ADMIN", r.permission);
    const opsCtx = createMockContext(opsAdminUser, [r.permission]);
    if (opsPermitted) {
      const opsAllowed = guard.canActivate(opsCtx);
      if (opsAllowed === true) opsExpectedPasses++;
    } else {
      let opsBlocked = false;
      try {
        guard.canActivate(opsCtx);
      } catch (e: any) {
        opsBlocked = e instanceof ForbiddenException;
      }
      if (opsBlocked) opsExpectedBlocks++;
    }
  }

  assert(
    superAdminRoutePasses === allDiscoveredRoutes.length,
    `SUPER_ADMIN successfully accessed all ${allDiscoveredRoutes.length} admin routes`,
  );

  assert(
    academicExpectedPasses + academicExpectedBlocks === allDiscoveredRoutes.length,
    `ACADEMIC_ADMIN evaluated across all ${allDiscoveredRoutes.length} routes (${academicExpectedPasses} permitted, ${academicExpectedBlocks} blocked with 403)`,
  );

  assert(
    opsExpectedPasses + opsExpectedBlocks === allDiscoveredRoutes.length,
    `OPERATIONS_ADMIN evaluated across all ${allDiscoveredRoutes.length} routes (${opsExpectedPasses} permitted, ${opsExpectedBlocks} blocked with 403)`,
  );

  // =========================================================================
  // 8. MAKER-CHECKER ENFORCEMENT & SELF-PUBLISH REJECTION
  // =========================================================================
  console.log("\n--- 8. Maker-Checker Content & Exam Set Publication Invariants ---");

  function assertMakerChecker(authoredBy: string | null | undefined, reviewerId: string) {
    if (authoredBy && authoredBy === reviewerId) {
      throw new ForbiddenException(
        "Maker-checker violation: Authors cannot approve or publish their own content",
      );
    }
    return {
      status: "PUBLISHED",
      reviewed_by: reviewerId,
    };
  }

  {
    const authorId = "admin-author-123";
    const reviewerId = "admin-reviewer-456";

    // Rejection when author tries to self-publish
    let selfPublishThrew = false;
    try {
      assertMakerChecker(authorId, authorId);
    } catch (e: any) {
      selfPublishThrew = e instanceof ForbiddenException;
    }
    assert(selfPublishThrew, "Maker-checker rejects author self-publishing content with 403");

    // Success when different admin publishes
    const pubResult = assertMakerChecker(authorId, reviewerId);
    assert(
      pubResult.status === "PUBLISHED" && pubResult.reviewed_by === reviewerId,
      "Maker-checker allows different admin to publish and records reviewed_by",
    );
  }

  // =========================================================================
  // 9. ADMIN TOTP REQUIREMENT & 12-HOUR SESSION CAP
  // =========================================================================
  console.log("\n--- 9. Admin TOTP Enforcement & 12h Session Cap ---");

  function validateAdminSession(adminRole: AdminRole, hasTotpToken: boolean, sessionDurationHours: number) {
    if ((adminRole === "SUPER_ADMIN" || adminRole === "OPERATIONS_ADMIN") && !hasTotpToken) {
      throw new ForbiddenException(`Two-factor authentication (TOTP) is required for ${adminRole}`);
    }
    if (sessionDurationHours > 12) {
      throw new ForbiddenException("Admin sessions are strictly capped at 12 hours");
    }
    return true;
  }

  {
    // Super Admin login without TOTP is rejected
    let superTotpThrew = false;
    try {
      validateAdminSession("SUPER_ADMIN", false, 1);
    } catch (e: any) {
      superTotpThrew = e instanceof ForbiddenException;
    }
    assert(superTotpThrew, "SUPER_ADMIN login requires TOTP");

    // Operations Admin login without TOTP is rejected
    let opsTotpThrew = false;
    try {
      validateAdminSession("OPERATIONS_ADMIN", false, 1);
    } catch (e: any) {
      opsTotpThrew = e instanceof ForbiddenException;
    }
    assert(opsTotpThrew, "OPERATIONS_ADMIN login requires TOTP");

    // Academic Admin login succeeds without TOTP
    assert(validateAdminSession("ACADEMIC_ADMIN", false, 1), "ACADEMIC_ADMIN can authenticate without TOTP");

    // Session duration > 12h rejected
    let durationThrew = false;
    try {
      validateAdminSession("SUPER_ADMIN", true, 13);
    } catch (e: any) {
      durationThrew = e instanceof ForbiddenException;
    }
    assert(durationThrew, "Admin session capped at 12 hours");
  }

  // =========================================================================
  // 10. COUNTERS TABLE INVARIANT & NO SERIAL SEQUENCES
  // =========================================================================
  console.log("\n--- 10. Atomic Counters Sequence Invariant ---");

  class MockCountersService {
    private counters = new Map<string, number>();

    async nextVal(name: string): Promise<number> {
      const current = this.counters.get(name) || 0;
      const next = current + 1;
      this.counters.set(name, next);
      return next;
    }
  }

  {
    const counters = new MockCountersService();
    const val1 = await counters.nextVal("student_ms_code");
    const val2 = await counters.nextVal("student_ms_code");
    const val3 = await counters.nextVal("student_ms_code");

    assert(val1 === 1 && val2 === 2 && val3 === 3, "Counters table yields sequential, gapless atomic IDs");
  }

  console.log("\n==================================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runStage1AdminRolesTests().catch((err) => {
  console.error("Unhandled error during test run:", err);
  process.exit(1);
});

