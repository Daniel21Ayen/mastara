// packages/contracts/src/support.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  adminTicketSchema,
  createTicketSchema,
  replyTicketSchema,
  ticketFilterQuerySchema,
  ticketMessageSchema,
  ticketSchema,
} from './support';

describe('Contracts: Support Schemas', () => {
  it('validates a valid student ticket message', () => {
    const valid = {
      id: 'msg-1',
      from: 'STUDENT',
      text: 'Need help with access',
      createdAt: '2026-10-17T10:00:00Z',
    };
    const parsed = ticketMessageSchema.parse(valid);
    assert.equal(parsed.id, 'msg-1');
    assert.equal(parsed.from, 'STUDENT');
  });

  it('rejects invalid message sender', () => {
    const invalid = {
      id: 'msg-1',
      from: 'BOT',
      text: 'Hello',
      createdAt: '2026-10-17T10:00:00Z',
    };
    assert.throws(() => ticketMessageSchema.parse(invalid));
  });

  it('validates replyTicketSchema with proper trim and length constraints', () => {
    const valid = { message: 'We have unlocked your device. Please try again.' };
    const parsed = replyTicketSchema.parse(valid);
    assert.equal(parsed.message, valid.message);

    // Too short (empty or 1 char)
    assert.throws(() => replyTicketSchema.parse({ message: '' }));
    assert.throws(() => replyTicketSchema.parse({ message: '   ' }));
    assert.throws(() => replyTicketSchema.parse({ message: 'a' }));

    // Valid 2 chars
    assert.ok(replyTicketSchema.parse({ message: 'ok' }));
  });

  it('validates createTicketSchema constraints', () => {
    assert.throws(() => createTicketSchema.parse({ subject: 'ab', message: 'Valid message content' }));
    assert.throws(() => createTicketSchema.parse({ subject: 'Valid subject', message: 'tiny' }));
    assert.ok(createTicketSchema.parse({ subject: 'Valid subject', message: 'Valid longer message' }));
  });

  it('validates adminTicketSchema with default priority and category', () => {
    const ticketData = {
      id: 't-101',
      studentId: 'st-01',
      studentName: 'Abebe Kebede',
      studentIdentifier: '+251911223344',
      subject: 'Payment receipt not recognized',
      status: 'OPEN',
      createdAt: '2026-10-17T09:00:00Z',
      updatedAt: '2026-10-17T09:00:00Z',
      messages: [
        {
          id: 'msg-1',
          from: 'STUDENT',
          text: 'I sent Telebirr receipt an hour ago.',
          createdAt: '2026-10-17T09:00:00Z',
        },
      ],
    };

    const parsed = adminTicketSchema.parse(ticketData);
    assert.equal(parsed.id, 't-101');
    assert.equal(parsed.priority, 'NORMAL'); // Default priority
    assert.equal(parsed.category, 'GENERAL'); // Default category
    assert.equal(parsed.status, 'OPEN');
    assert.equal(parsed.messages.length, 1);
  });

  it('validates ticketFilterQuerySchema with pagination defaults', () => {
    const query = { status: 'OPEN' };
    const parsed = ticketFilterQuerySchema.parse(query);
    assert.equal(parsed.page, 1);
    assert.equal(parsed.pageSize, 20);
    assert.equal(parsed.status, 'OPEN');
  });

  it('accepts RESOLVED status in ticketSchema and adminTicketSchema', () => {
    const ticket = {
      id: 't-202',
      subject: 'Issue resolved',
      status: 'RESOLVED',
      createdAt: '2026-10-17T09:00:00Z',
      messages: [],
    };
    assert.ok(ticketSchema.parse(ticket));
  });
});
