// apps/admin-web/src/modules/support/components/SupportTicketList.tsx
'use client';

import React from 'react';
import type { AdminTicket } from '@mastara/contracts';
import type { TicketCategory, TicketStatus } from '@mastara/domain';
import { agoText } from '@/core/format';
import { adminText } from '@/core/i18n';
import { Icon } from '@/shared/ui';
import styles from './Support.module.css';

interface SupportTicketListProps {
  tickets: AdminTicket[];
  selectedTicketId: string | null;
  onSelectTicket: (id: string) => void;
  statusFilter: TicketStatus | 'ALL';
  onStatusFilterChange: (status: TicketStatus | 'ALL') => void;
  categoryFilter: TicketCategory | 'ALL';
  onCategoryFilterChange: (cat: TicketCategory | 'ALL') => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  counts: {
    all: number;
    open: number;
    answered: number;
    resolved: number;
  };
}

export function SupportTicketList({
  tickets,
  selectedTicketId,
  onSelectTicket,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  searchQuery,
  onSearchQueryChange,
  counts,
}: SupportTicketListProps) {
  const now = new Date();

  return (
    <div className={styles.listPanel}>
      <div className={styles.listControls}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>
            <Icon name="search" size={16} />
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={adminText('admin.support.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
        </div>

        <div className={styles.filterTabs}>
          <button
            type="button"
            className={`${styles.filterTab} ${statusFilter === 'ALL' ? styles.filterTabActive : ''}`}
            onClick={() => onStatusFilterChange('ALL')}
          >
            {adminText('admin.support.tab.all')}
            <span className={styles.tabBadge}>{counts.all}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${statusFilter === 'OPEN' ? styles.filterTabActive : ''}`}
            onClick={() => onStatusFilterChange('OPEN')}
          >
            {adminText('admin.support.tab.open')}
            <span className={styles.tabBadge}>{counts.open}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${statusFilter === 'ANSWERED' ? styles.filterTabActive : ''}`}
            onClick={() => onStatusFilterChange('ANSWERED')}
          >
            {adminText('admin.support.tab.answered')}
            <span className={styles.tabBadge}>{counts.answered}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${statusFilter === 'RESOLVED' ? styles.filterTabActive : ''}`}
            onClick={() => onStatusFilterChange('RESOLVED')}
          >
            {adminText('admin.support.tab.resolved')}
            <span className={styles.tabBadge}>{counts.resolved}</span>
          </button>
        </div>

        <select
          className={styles.categorySelect}
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value as TicketCategory | 'ALL')}
        >
          <option value="ALL">{adminText('admin.support.category.all')}</option>
          <option value="PAYMENT">{adminText('admin.support.category.PAYMENT')}</option>
          <option value="DEVICE">{adminText('admin.support.category.DEVICE')}</option>
          <option value="ACCESS">{adminText('admin.support.category.ACCESS')}</option>
          <option value="EXAMS">{adminText('admin.support.category.EXAMS')}</option>
          <option value="GENERAL">{adminText('admin.support.category.GENERAL')}</option>
        </select>
      </div>

      <div className={styles.ticketScroll}>
        {tickets.length === 0 ? (
          <div className={styles.emptyList}>
            <Icon name="headset" size={32} />
            <p>{adminText('admin.support.empty')}</p>
          </div>
        ) : (
          tickets.map((ticket) => {
            const isSelected = ticket.id === selectedTicketId;
            const lastMsg = ticket.messages[ticket.messages.length - 1];
            const initials = ticket.studentName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={ticket.id}
                className={`${styles.ticketItem} ${isSelected ? styles.ticketItemActive : ''}`}
                onClick={() => onSelectTicket(ticket.id)}
              >
                <div className={styles.ticketTopRow}>
                  <div className={styles.studentMeta}>
                    <div className={styles.avatarMini}>{initials}</div>
                    <span className={styles.studentName}>{ticket.studentName}</span>
                  </div>
                  <span className={styles.ticketTime}>{agoText(ticket.updatedAt, now)}</span>
                </div>

                <h4 className={styles.ticketSubject}>{ticket.subject}</h4>
                {lastMsg && <p className={styles.ticketPreview}>{lastMsg.text}</p>}

                <div className={styles.ticketBottomRow}>
                  <div className={styles.tagGroup}>
                    {ticket.status === 'OPEN' && (
                      <span className={styles.badgeOpen}>{adminText('admin.support.tab.open')}</span>
                    )}
                    {ticket.status === 'ANSWERED' && (
                      <span className={styles.badgeAnswered}>{adminText('admin.support.tab.answered')}</span>
                    )}
                    {ticket.status === 'RESOLVED' && (
                      <span className={styles.badgeResolved}>{adminText('admin.support.tab.resolved')}</span>
                    )}
                    <span className={styles.categoryTag}>
                      {adminText(`admin.support.category.${ticket.category}` as any)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
