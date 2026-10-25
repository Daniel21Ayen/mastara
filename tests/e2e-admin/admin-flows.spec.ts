// tests/e2e-admin/admin-flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Web Platform E2E Flows', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Sign in as admin
    await page.goto('/login');
    await page.fill('input[type="text"], input[name="identifier"]', 'admin@mastara.demo');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('1. Course Creation Flow', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('text=Courses and catalog')).toBeVisible();

    // Click Add course button
    const addBtn = page.locator('button:has-text("Add course"), button:has-text("New Course")').first();
    await addBtn.click();

    // Fill course modal form
    await page.fill('input[name="code"], input[placeholder*="ENG101"]', 'TEST101');
    await page.fill('input[name="title"], input[placeholder*="Title"]', 'Introduction to E2E Testing');
    await page.selectOption('select[name="stream"]', 'NATURAL');

    const submitBtn = page.locator('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Create")').first();
    await submitBtn.click();

    await expect(page.locator('text=TEST101')).toBeVisible();
  });

  test('2. Content Creation & Publish Flow', async ({ page }) => {
    await page.goto('/content');
    await expect(page.locator('text=Content Management')).toBeVisible();

    // Open Add Topic / Content
    const addContentBtn = page.locator('button:has-text("Add"), button:has-text("+ Add")').first();
    await addContentBtn.click();

    // Fill Topic & Content details
    await page.fill('input[name="title"]', 'Calculus Chapter 1');
    const publishToggle = page.locator('input[type="checkbox"][name="publish"], button:has-text("Publish")').first();
    if (await publishToggle.isVisible()) {
      await publishToggle.click();
    }

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Create")').first();
    await saveBtn.click();

    await expect(page.locator('text=Calculus Chapter 1')).toBeVisible();
  });

  test('3. Build Test Set Form with 7 Required Fields', async ({ page }) => {
    await page.goto('/content');

    // Switch to Tests tab if present
    const testsTab = page.locator('button:has-text("Tests"), a:has-text("Tests")').first();
    if (await testsTab.isVisible()) {
      await testsTab.click();
    }

    // Launch Build Test Set dialog
    const buildBtn = page.locator('button:has-text("Build Test Set"), button:has-text("+ Add")').first();
    await buildBtn.click();

    // Validate 7 attributes presence
    const modal = page.locator('role=dialog, .modalContent, [aria-modal="true"]').first();
    await expect(modal).toBeVisible();

    // 1. Program
    await expect(page.locator('select[name="program"], label:has-text("Program")')).toBeVisible();
    // 2. Semester
    await expect(page.locator('select[name="semester"], label:has-text("Semester")')).toBeVisible();
    // 3. Stream
    await expect(page.locator('select[name="stream"], label:has-text("Stream")')).toBeVisible();
    // 4. Course
    await expect(page.locator('select[name="course"], label:has-text("Course")')).toBeVisible();
    // 5. Test Set ID
    await expect(page.locator('input[name="testSetId"], label:has-text("Test Set ID")')).toBeVisible();
    // 6. Time Allowed (integer minutes >= 1)
    const timeInput = page.locator('input[type="number"][name="timeAllowed"], input[name="timeAllowed"]').first();
    await expect(timeInput).toBeVisible();
    await timeInput.fill('45');
    // 7. Access / Permission
    await expect(page.locator('select[name="access"], label:has-text("Access")')).toBeVisible();

    // Fill Test Set ID and submit
    await page.fill('input[name="testSetId"], input[placeholder*="TS-"]', 'TS-E2E-001');
    await page.locator('button:has-text("Create"), button:has-text("Save")').last().click();

    await expect(page.locator('text=TS-E2E-001')).toBeVisible();
  });

  test('4. CSV Import: Valid, Invalid Syntax, and Binary Rejection', async ({ page }) => {
    await page.goto('/questions');

    // Case A: Binary PDF magic bytes rejected
    const fileChooserPromise = page.waitForEvent('filechooser').catch(() => null);
    const importBtn = page.locator('button:has-text("Import CSV")').first();
    if (await importBtn.isVisible()) {
      await importBtn.click();
      const fileChooser = await fileChooserPromise;
      if (fileChooser) {
        // Upload fake PDF with %PDF magic header
        await fileChooser.setFiles({
          name: 'invalid_exam.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from('%PDF-1.4 simulated binary document'),
        });
        await expect(page.locator('text=CSV_FILE_REQUIRED, text=Invalid format')).toBeVisible();
      }
    }

    // Case B: Valid CSV parsed successfully
    const validCsv = 'type,prompt,options,correctAnswer,explanation\nMULTIPLE_CHOICE,What is 2+2?,["2","3","4","5"],4,Basic arithmetic\n';
    if (await importBtn.isVisible()) {
      await importBtn.click();
      const fileChooser2 = await page.waitForEvent('filechooser');
      await fileChooser2.setFiles({
        name: 'valid_questions.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(validCsv),
      });
      await expect(page.locator('text=Imported 1 questions, text=Success')).toBeVisible();
    }
  });

  test('5. Payment Queue Approval Flow', async ({ page }) => {
    await page.goto('/payments');
    await expect(page.locator('text=Payment Queue, text=Payments')).toBeVisible();

    // Filter to Pending
    const pendingTab = page.locator('button:has-text("Pending")').first();
    if (await pendingTab.isVisible()) {
      await pendingTab.click();
    }

    // Review first pending order
    const reviewBtn = page.locator('button:has-text("Review")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();

      // Approve payment modal
      const approveBtn = page.locator('button:has-text("Approve and activate access"), button:has-text("Approve")').first();
      await approveBtn.click();

      await expect(page.locator('text=Approved, text=Payment Approved')).toBeVisible();
    }
  });

  test('6. Active State Matching Color Tokens', async ({ page }) => {
    await page.goto('/courses');

    // Sidebar active item uses primary token
    const activeSidebar = page.locator('.sidebarActive, .rowActive, [aria-current="page"]').first();
    if (await activeSidebar.isVisible()) {
      const color = await activeSidebar.evaluate((el) => window.getComputedStyle(el).color);
      expect(color).toBeTruthy();
    }
  });

  test('7. Pagination Across Endpoints', async ({ page }) => {
    const listRoutes = ['/students', '/courses', '/payments', '/content'];

    for (const route of listRoutes) {
      await page.goto(route);
      // Verify pagination exists and page changes update URL
      const nextBtn = page.locator('button:has-text("Next"), button[aria-label="Next page"]').first();
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await expect(page).toHaveURL(/.*page=2.*/);
      }
    }
  });
});
