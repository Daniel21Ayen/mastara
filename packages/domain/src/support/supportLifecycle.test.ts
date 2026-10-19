// packages/domain/src/support/supportLifecycle.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AUDIT_ACTIONS,
  SUPPORT_MESSAGE_MAX,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '../index';
import type { AuditAction, TicketCategory, TicketPriority, TicketStatus } from '../index';

describe('Domain: Support & Audit Attention Constants', () => {
  it('defines valid ticket statuses including RESOLVED', () => {
    assert.deepEqual(Array.from(TICKET_STATUSES), ['OPEN', 'ANSWERED', 'RESOLVED']);
    assert.ok(TICKET_STATUSES.includes('OPEN' as TicketStatus));
    assert.ok(TICKET_STATUSES.includes('ANSWERED' as TicketStatus));
    assert.ok(TICKET_STATUSES.includes('RESOLVED' as TicketStatus));
  });

  it('defines valid ticket categories and priorities', () => {
    assert.ok(TICKET_CATEGORIES.includes('PAYMENT' as TicketCategory));
    assert.ok(TICKET_CATEGORIES.includes('DEVICE' as TicketCategory));
    assert.ok(TICKET_CATEGORIES.includes('ACCESS' as TicketCategory));

    assert.ok(TICKET_PRIORITIES.includes('LOW' as TicketPriority));
    assert.ok(TICKET_PRIORITIES.includes('NORMAL' as TicketPriority));
    assert.ok(TICKET_PRIORITIES.includes('HIGH' as TicketPriority));
    assert.ok(TICKET_PRIORITIES.includes('URGENT' as TicketPriority));
  });

  it('enforces maximum support message length', () => {
    assert.equal(SUPPORT_MESSAGE_MAX, 1000);
  });

  it('includes support audit actions in AUDIT_ACTIONS', () => {
    assert.ok(AUDIT_ACTIONS.includes('SUPPORT_TICKET_REPLIED' as AuditAction));
    assert.ok(AUDIT_ACTIONS.includes('SUPPORT_TICKET_RESOLVED' as AuditAction));
  });

  it('filters attention-only audit actions strictly', () => {
    const ATTENTION_ACTIONS = new Set<AuditAction>([
      'PAYMENT_REJECTED',
      'DEVICE_REVOKED',
      'STUDENT_SUSPENDED',
      'ACCESS_EXTENDED',
      'PRICE_CHANGED',
    ]);

    // Critical attention actions must match
    assert.ok(ATTENTION_ACTIONS.has('PAYMENT_REJECTED'));
    assert.ok(ATTENTION_ACTIONS.has('DEVICE_REVOKED'));
    assert.ok(ATTENTION_ACTIONS.has('STUDENT_SUSPENDED'));
    assert.ok(ATTENTION_ACTIONS.has('ACCESS_EXTENDED'));
    assert.ok(ATTENTION_ACTIONS.has('PRICE_CHANGED'));

    // Routine actions must NOT be flagged as attention
    assert.ok(!ATTENTION_ACTIONS.has('PAYMENT_APPROVED'));
    assert.ok(!ATTENTION_ACTIONS.has('COURSE_CREATED'));
    assert.ok(!ATTENTION_ACTIONS.has('CONTENT_PUBLISHED'));
    assert.ok(!ATTENTION_ACTIONS.has('STUDENT_ADDED'));
  });
});
