// apps/admin-web/src/modules/support/supportIntegration.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getSupportStats,
  getSupportTicket,
  listAudit,
  listSupportTickets,
  replySupportTicket,
  setSupportTicketStatus,
} from '../../../dev-mocks/data';

describe('Admin Support System Integration', () => {
  it('lists initial tickets with default pagination', () => {
    const result = listSupportTickets({});
    assert.ok(result.tickets.length > 0);
    assert.ok(result.total >= result.tickets.length);
  });

  it('filters tickets by status accurately', () => {
    const openResult = listSupportTickets({ status: 'OPEN' });
    for (const t of openResult.tickets) {
      assert.equal(t.status, 'OPEN');
    }

    const resolvedResult = listSupportTickets({ status: 'RESOLVED' });
    for (const t of resolvedResult.tickets) {
      assert.equal(t.status, 'RESOLVED');
    }
  });

  it('filters tickets by category', () => {
    const paymentTickets = listSupportTickets({ category: 'PAYMENT' });
    assert.ok(paymentTickets.tickets.length > 0);
    for (const t of paymentTickets.tickets) {
      assert.equal(t.category, 'PAYMENT');
    }
  });

  it('searches tickets by query string across name, subject, and identifier', () => {
    const searchByName = listSupportTickets({ q: 'Selam' });
    assert.ok(searchByName.tickets.length > 0);
    assert.ok(
      searchByName.tickets.some((t) => t.studentName.toLowerCase().includes('selam')),
    );

    const searchByIdentifier = listSupportTickets({ q: '0911' });
    assert.ok(searchByIdentifier.tickets.length > 0);
  });

  it('retrieves single ticket by ID with complete conversation thread', () => {
    const list = listSupportTickets({});
    const firstId = list.tickets[0]?.id;
    assert.ok(firstId);

    const ticket = getSupportTicket(firstId);
    assert.ok(ticket);
    assert.equal(ticket.id, firstId);
    assert.ok(Array.isArray(ticket.messages));
    assert.ok(ticket.messages.length > 0);
  });

  it('replies to ticket: appends ADMIN message, updates status to ANSWERED, and writes audit log', () => {
    const list = listSupportTickets({ status: 'OPEN' });
    assert.ok(list.tickets.length > 0);
    const targetTicket = list.tickets[0];
    assert.ok(targetTicket);
    const initialMessageCount = targetTicket.messages.length;

    const replyText = 'Test admin automated reply: We have checked your transaction.';
    const updated = replySupportTicket(targetTicket.id, { message: replyText });

    assert.ok(updated);
    assert.equal(updated.messages.length, initialMessageCount + 1);
    const lastMsg = updated.messages[updated.messages.length - 1];
    assert.ok(lastMsg);
    assert.equal(lastMsg.text, replyText);
    assert.equal(lastMsg.from, 'ADMIN');
    assert.equal(updated.status, 'ANSWERED');

    // Verify audit log entry
    const auditLogs = listAudit();
    const supportAudit = auditLogs.find(
      (a) => a.action === 'SUPPORT_TICKET_REPLIED' && a.target.includes(targetTicket.id),
    );
    assert.ok(supportAudit, 'SUPPORT_TICKET_REPLIED audit log must be recorded');
  });

  it('updates ticket status to RESOLVED and records audit log', () => {
    const list = listSupportTickets({});
    const target = list.tickets[0];
    assert.ok(target);

    const resolved = setSupportTicketStatus(target.id, 'RESOLVED');
    assert.ok(resolved);
    assert.equal(resolved.status, 'RESOLVED');

    const auditLogs = listAudit();
    const resolvedAudit = auditLogs.find(
      (a) => a.action === 'SUPPORT_TICKET_RESOLVED' && a.target.includes(target.id),
    );
    assert.ok(resolvedAudit, 'SUPPORT_TICKET_RESOLVED audit log must be recorded');
  });

  it('reopens ticket back to OPEN', () => {
    const list = listSupportTickets({ status: 'RESOLVED' });
    assert.ok(list.tickets.length > 0);
    const target = list.tickets[0];
    assert.ok(target);

    const reopened = setSupportTicketStatus(target.id, 'OPEN');
    assert.ok(reopened);
    assert.equal(reopened.status, 'OPEN');
  });

  it('computes accurate support overview statistics', () => {
    const stats = getSupportStats();
    assert.ok(typeof stats.total === 'number');
    assert.ok(typeof stats.open === 'number');
    assert.ok(typeof stats.answered === 'number');
    assert.ok(typeof stats.resolved === 'number');
    assert.equal(stats.total, stats.open + stats.answered + stats.resolved);
  });
});
