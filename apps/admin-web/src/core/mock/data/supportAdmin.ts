// apps/admin-web/src/core/mock/data/supportAdmin.ts
import type { AdminTicket, ReplyTicketInput, SupportStats, TicketFilterQuery, TicketMessage } from '@mastara/contracts';
import type { TicketCategory, TicketPriority, TicketStatus } from '@mastara/domain';

import { recordAudit } from './audit';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const SEED_TICKETS: readonly (Omit<AdminTicket, 'id' | 'createdAt' | 'updatedAt' | 'messages'> & {
  id: string;
  createdAgoMs: number;
  updatedAgoMs: number;
  messages: readonly (Omit<TicketMessage, 'id' | 'createdAt'> & { agoMs: number })[];
})[] = [
  {
    id: 't-101',
    studentId: 'ST003',
    studentName: 'Selam Getachew',
    studentIdentifier: '0911223344',
    studentUniversity: 'Hawassa University',
    studentProgram: 'Medicine & Health Sciences',
    category: 'DEVICE',
    priority: 'HIGH',
    subject: 'Phone replaced – need device released',
    status: 'OPEN',
    createdAgoMs: 25 * MINUTE_MS,
    updatedAgoMs: 25 * MINUTE_MS,
    messages: [
      {
        agoMs: 25 * MINUTE_MS,
        from: 'STUDENT',
        text: "Hello Admin, I lost my Android phone yesterday on campus. I bought a new Samsung device today, but when I try to log in, the app shows 'Device limit reached: Account already bound to another phone'. Could you please release my old phone binding so I can continue studying for my midterms?",
      },
    ],
  },
  {
    id: 't-102',
    studentId: 'ST001',
    studentName: 'Abebe Kebede',
    studentIdentifier: '0922334455',
    studentUniversity: 'Addis Ababa University',
    studentProgram: 'Freshman Natural Science',
    category: 'PAYMENT',
    priority: 'URGENT',
    subject: 'CBE Mobile receipt verified but Semester Bundle still locked',
    status: 'OPEN',
    createdAgoMs: 45 * MINUTE_MS,
    updatedAgoMs: 45 * MINUTE_MS,
    messages: [
      {
        agoMs: 45 * MINUTE_MS,
        from: 'STUDENT',
        text: 'I transferred 200 ETB via CBE Mobile banking with reference number FT2409187312 this morning. The payment status shows Approved in CBE, but when I open Calculus I, it still prompts me to purchase and says trial expired. Please verify and unlock access.',
      },
    ],
  },
  {
    id: 't-103',
    studentId: 'ST004',
    studentName: 'Tewodros Kassahun',
    studentIdentifier: '0933445566',
    studentUniversity: 'Jimma University',
    studentProgram: 'Electrical & Computer Engineering',
    category: 'EXAMS',
    priority: 'NORMAL',
    subject: 'COC Mock Exam 2 timer submitted prematurely',
    status: 'ANSWERED',
    createdAgoMs: 4 * HOUR_MS,
    updatedAgoMs: 1 * HOUR_MS,
    messages: [
      {
        agoMs: 4 * HOUR_MS,
        from: 'STUDENT',
        text: 'While taking the COC Comprehensive Mock Exam 2, my campus Wi-Fi dropped for two minutes. When I refreshed, the test had auto-submitted with 0 marks for all unanswered questions. Can my attempt please be reset?',
      },
      {
        agoMs: 1 * HOUR_MS,
        from: 'ADMIN',
        text: 'Dear Tewodros, we inspected the network drop log and have reset your attempt for COC Comprehensive Mock Exam 2. You may now retake the test from your Assessments tab without penalty.',
      },
    ],
  },
  {
    id: 't-104',
    studentId: 'ST002',
    studentName: 'Bethlehem Tadesse',
    studentIdentifier: '0944556677',
    studentUniversity: 'AASTU',
    studentProgram: 'Civil & Environmental Engineering',
    category: 'ACCESS',
    priority: 'LOW',
    subject: 'Amharic Notes chapter 3 scan quality issue',
    status: 'RESOLVED',
    createdAgoMs: 2 * DAY_MS,
    updatedAgoMs: 5 * HOUR_MS,
    messages: [
      {
        agoMs: 2 * DAY_MS,
        from: 'STUDENT',
        text: 'Greetings, pages 14 through 18 in the Amharic Notes for Communicative English Chapter 3 are blurry and difficult to read on smaller phone screens.',
      },
      {
        agoMs: 1 * DAY_MS,
        from: 'ADMIN',
        text: 'Hi Bethlehem, our scanning team has re-scanned those five pages at 300 DPI and updated the document. Please pull down to refresh on your mobile screen.',
      },
      {
        agoMs: 5 * HOUR_MS,
        from: 'STUDENT',
        text: 'Thank you very much, the new pages look crystal clear now!',
      },
    ],
  },
  {
    id: 't-105',
    studentId: 'ST005',
    studentName: 'Almaz Ayana',
    studentIdentifier: '0955667788',
    studentUniversity: 'Addis Ababa University',
    studentProgram: 'Freshman Social Science',
    category: 'PAYMENT',
    priority: 'HIGH',
    subject: 'Telebirr transaction reference casing typo',
    status: 'OPEN',
    createdAgoMs: 3 * HOUR_MS,
    updatedAgoMs: 3 * HOUR_MS,
    messages: [
      {
        agoMs: 3 * HOUR_MS,
        from: 'STUDENT',
        text: "When uploading my Telebirr receipt for the Freshman Social Bundle, I accidentally typed lowercase 'tb884920' instead of capital letters 'TB884920'. Will this cause my transaction to be rejected by the automated check?",
      },
    ],
  },
  {
    id: 't-106',
    studentId: 'ST006',
    studentName: 'Dawit Mengistu',
    studentIdentifier: '0966778899',
    studentUniversity: 'Gondar University',
    studentProgram: 'Computer Science',
    category: 'GENERAL',
    priority: 'NORMAL',
    subject: 'Inquiry about upcoming Pre-Engineering Mock Exam schedule',
    status: 'ANSWERED',
    createdAgoMs: 18 * HOUR_MS,
    updatedAgoMs: 2 * HOUR_MS,
    messages: [
      {
        agoMs: 18 * HOUR_MS,
        from: 'STUDENT',
        text: 'Could the administration provide an estimate on when the 2026 Semester 2 Model Examination sets will be uploaded for Computer Science?',
      },
      {
        agoMs: 2 * HOUR_MS,
        from: 'ADMIN',
        text: 'Hello Dawit, the 2026 CS exam sets are currently in final review by instructors and are slated for release this Friday at 6:00 PM UTC+3.',
      },
    ],
  },
  {
    id: 't-107',
    studentId: 'ST007',
    studentName: 'Hanna Girma',
    studentIdentifier: '0977889900',
    studentUniversity: 'Hawassa University',
    studentProgram: 'Software Engineering',
    category: 'ACCESS',
    priority: 'NORMAL',
    subject: 'Offline sync not saving General Chemistry lesson 4',
    status: 'OPEN',
    createdAgoMs: 6 * HOUR_MS,
    updatedAgoMs: 6 * HOUR_MS,
    messages: [
      {
        agoMs: 6 * HOUR_MS,
        from: 'STUDENT',
        text: "Whenever I click download on Chapter 4 of General Chemistry, the progress bar finishes and says 'Saved', but when I switch off mobile data to test offline mode, it says 'Content unavailable offline'. Can you advise?",
      },
    ],
  },
];

let tickets: AdminTicket[] = [];
let seeded = false;

function ensureSeeded(now = Date.now()): void {
  if (seeded) return;
  tickets = SEED_TICKETS.map((seed) => {
    const createdAt = new Date(now - seed.createdAgoMs).toISOString();
    const updatedAt = new Date(now - seed.updatedAgoMs).toISOString();
    let msgCounter = 0;
    const messages: TicketMessage[] = seed.messages.map((m) => {
      msgCounter += 1;
      return {
        id: `msg-${seed.id}-${msgCounter}`,
        from: m.from,
        text: m.text,
        createdAt: new Date(now - m.agoMs).toISOString(),
      };
    });

    return {
      id: seed.id,
      studentId: seed.studentId,
      studentName: seed.studentName,
      studentIdentifier: seed.studentIdentifier,
      studentUniversity: seed.studentUniversity,
      studentProgram: seed.studentProgram,
      category: seed.category,
      priority: seed.priority,
      subject: seed.subject,
      status: seed.status,
      createdAt,
      updatedAt,
      messages,
    };
  });
  seeded = true;
}

export function listSupportTickets(
  query: Partial<TicketFilterQuery> = {},
  now = Date.now(),
): { tickets: AdminTicket[]; total: number } {
  ensureSeeded(now);

  let filtered = [...tickets];

  if (query.status) {
    filtered = filtered.filter((t) => t.status === query.status);
  }

  if (query.category && query.category !== 'ALL') {
    filtered = filtered.filter((t) => t.category === query.category);
  }

  if (query.priority) {
    filtered = filtered.filter((t) => t.priority === query.priority);
  }

  if (query.q) {
    const term = query.q.toLowerCase().trim();
    filtered = filtered.filter(
      (t) =>
        t.subject.toLowerCase().includes(term) ||
        t.studentName.toLowerCase().includes(term) ||
        t.studentIdentifier.toLowerCase().includes(term) ||
        t.studentId.toLowerCase().includes(term) ||
        t.messages.some((m) => m.text.toLowerCase().includes(term)),
    );
  }

  // Sort: Open first, then by latest update
  filtered.sort((a, b) => {
    if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
    if (b.status === 'OPEN' && a.status !== 'OPEN') return 1;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });

  const total = filtered.length;
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return { tickets: paginated, total };
}

export function getSupportTicket(id: string, now = Date.now()): AdminTicket | undefined {
  ensureSeeded(now);
  return tickets.find((t) => t.id === id);
}

export function replySupportTicket(
  id: string,
  input: ReplyTicketInput,
  now = Date.now(),
): AdminTicket {
  ensureSeeded(now);
  const index = tickets.findIndex((t) => t.id === id);
  const existing = tickets[index];
  if (!existing) {
    throw new Error(`Support ticket not found: ${id}`);
  }

  const nowIso = new Date(now).toISOString();
  const newMessage: TicketMessage = {
    id: `msg-${id}-${existing.messages.length + 1}`,
    from: 'ADMIN',
    text: input.message.trim(),
    createdAt: nowIso,
  };

  const updated: AdminTicket = {
    id: existing.id,
    studentId: existing.studentId,
    studentName: existing.studentName,
    studentIdentifier: existing.studentIdentifier,
    studentUniversity: existing.studentUniversity,
    studentProgram: existing.studentProgram,
    category: existing.category,
    priority: existing.priority,
    subject: existing.subject,
    status: 'ANSWERED',
    createdAt: existing.createdAt,
    updatedAt: nowIso,
    messages: [...existing.messages, newMessage],
  };

  tickets[index] = updated;

  recordAudit({
    actor: 'ADMIN',
    action: 'SUPPORT_TICKET_REPLIED',
    target: `Ticket ${existing.id} · ${existing.studentName}`,
    reason: input.message.slice(0, 60),
  });

  return updated;
}

export function setSupportTicketStatus(
  id: string,
  status: TicketStatus,
  now = Date.now(),
): AdminTicket {
  ensureSeeded(now);
  const index = tickets.findIndex((t) => t.id === id);
  const existing = tickets[index];
  if (!existing) {
    throw new Error(`Support ticket not found: ${id}`);
  }

  const updated: AdminTicket = {
    id: existing.id,
    studentId: existing.studentId,
    studentName: existing.studentName,
    studentIdentifier: existing.studentIdentifier,
    studentUniversity: existing.studentUniversity,
    studentProgram: existing.studentProgram,
    category: existing.category,
    priority: existing.priority,
    subject: existing.subject,
    status,
    createdAt: existing.createdAt,
    updatedAt: new Date(now).toISOString(),
    messages: existing.messages,
  };

  tickets[index] = updated;

  if (status === 'RESOLVED') {
    recordAudit({
      actor: 'ADMIN',
      action: 'SUPPORT_TICKET_RESOLVED',
      target: `Ticket ${existing.id} · ${existing.studentName}`,
    });
  }

  return updated;
}

export function getSupportStats(now = Date.now()): SupportStats {
  ensureSeeded(now);
  const total = tickets.length;
  const open = tickets.filter((t) => t.status === 'OPEN').length;
  const answered = tickets.filter((t) => t.status === 'ANSWERED').length;
  const resolved = tickets.filter((t) => t.status === 'RESOLVED').length;

  return { total, open, answered, resolved };
}
