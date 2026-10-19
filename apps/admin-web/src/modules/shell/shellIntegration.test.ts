// apps/admin-web/src/modules/shell/shellIntegration.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ADMIN_NAV } from '@/core/navigation/adminNav';
import { listAudit } from '@/core/mock/data';
import { buildCssVariables } from '@/core/theme/cssVariables';
import type { AuditAction } from '@mastara/domain';

describe('Admin Shell & Theme Integration Tests', () => {
  it('excludes Audit Log, Announcements, and Reports from sidebar ADMIN_NAV', () => {
    // Collect all nav items recursively
    const allNavIds: string[] = [];

    function collectIds(items: typeof ADMIN_NAV) {
      for (const item of items) {
        allNavIds.push(item.id);
        if (item.items) {
          for (const sub of item.items) {
            allNavIds.push(sub.id);
          }
        }
        if (item.groups) {
          for (const grp of item.groups) {
            allNavIds.push(grp.id);
            if (grp.items) {
              for (const sub of grp.items) {
                allNavIds.push(sub.id);
              }
            }
          }
        }
      }
    }

    collectIds(ADMIN_NAV);

    assert.ok(!allNavIds.includes('audit'), 'Audit log must not be in sidebar');
    assert.ok(!allNavIds.includes('announcements'), 'Announcements must not be in sidebar');
    assert.ok(!allNavIds.includes('reports'), 'Reports must not be in sidebar');

    // Confirm that support and core items remain
    assert.ok(allNavIds.includes('support'), 'Support page must be in navigation');
    assert.ok(allNavIds.includes('dashboard'), 'Dashboard must be in navigation');
    assert.ok(allNavIds.includes('students'), 'Students must be in navigation');
  });

  it('filters audit entries strictly for Attention-required items in profile', () => {
    const ATTENTION_ACTIONS = new Set<AuditAction>([
      'PAYMENT_REJECTED',
      'DEVICE_REVOKED',
      'STUDENT_SUSPENDED',
      'ACCESS_EXTENDED',
      'PRICE_CHANGED',
    ]);

    const allAudit = listAudit();
    const attentionAudit = allAudit.filter((entry) =>
      ATTENTION_ACTIONS.has(entry.action as AuditAction),
    );

    assert.ok(attentionAudit.length > 0, 'There should be attention-required audit entries');

    for (const entry of attentionAudit) {
      assert.ok(
        ATTENTION_ACTIONS.has(entry.action as AuditAction),
        `Entry ${entry.action} must be an attention action`,
      );
    }
  });

  it('generates canonical admin color CSS variables from single source of truth', () => {
    const css = buildCssVariables();

    // Must define canonical admin primary blue #1a56db
    assert.ok(
      css.includes('--color-primary: #1a56db;'),
      '--color-primary must be #1a56db',
    );

    // Must define canonical admin ink text #0f172a
    assert.ok(
      css.includes('--color-text: #0f172a;'),
      '--color-text must be #0f172a',
    );

    // Must define canonical admin danger #b91c1c
    assert.ok(
      css.includes('--color-danger: #b91c1c;'),
      '--color-danger must be #b91c1c',
    );

    // Must define surface as white
    assert.ok(
      css.includes('--color-surface: #ffffff;'),
      '--color-surface must be #ffffff',
    );

    // Must define primary hover
    assert.ok(
      css.includes('--color-primary-hover: #1e40af;'),
      '--color-primary-hover must be #1e40af',
    );
  });
});
