// apps/admin-web/src/modules/support/screens/SupportScreen.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { TicketCategory, TicketStatus } from '@mastara/domain';
import { adminText } from '@/core/i18n';
import { PageHeader, StateMessage } from '@/shared/ui';

import { supportApi } from '../api/support.api';
import { SupportTicketList } from '../components/SupportTicketList';
import { SupportThread } from '../components/SupportThread';
import { useSupportStats, useSupportTickets } from '../hooks/useSupportTickets';
import styles from '../components/Support.module.css';

export function SupportScreen() {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('OPEN');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const query = useMemo(
    () => ({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      category: categoryFilter === 'ALL' ? undefined : categoryFilter,
      q: searchQuery.trim() || undefined,
      page: 1,
      pageSize: 50,
    }),
    [statusFilter, categoryFilter, searchQuery],
  );

  const { data: listData, loading: listLoading, error: listError, reload: reloadList } = useSupportTickets(query);
  const { data: statsData, reload: reloadStats } = useSupportStats();

  const tickets = listData?.tickets ?? [];

  // Default select first ticket when loaded if none selected or selected not in list
  useEffect(() => {
    if (tickets.length > 0) {
      if (!selectedTicketId || !tickets.some((t) => t.id === selectedTicketId)) {
        setSelectedTicketId(tickets[0]!.id);
      }
    } else {
      setSelectedTicketId(null);
    }
  }, [tickets, selectedTicketId]);

  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) return null;
    return tickets.find((t) => t.id === selectedTicketId) ?? null;
  }, [tickets, selectedTicketId]);

  const counts = useMemo(() => {
    return {
      all: statsData?.total ?? 0,
      open: statsData?.open ?? 0,
      answered: statsData?.answered ?? 0,
      resolved: statsData?.resolved ?? 0,
    };
  }, [statsData]);

  const handleSendReply = async (text: string) => {
    if (!selectedTicketId) return;
    try {
      setActionBusy(true);
      await supportApi.reply(selectedTicketId, { message: text });
      reloadList();
      reloadStats();
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setActionBusy(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      setActionBusy(true);
      await supportApi.setStatus(id, 'RESOLVED');
      reloadList();
      reloadStats();
    } catch (err) {
      console.error('Failed to resolve ticket:', err);
    } finally {
      setActionBusy(false);
    }
  };

  const handleReopen = async (id: string) => {
    try {
      setActionBusy(true);
      await supportApi.setStatus(id, 'OPEN');
      reloadList();
      reloadStats();
    } catch (err) {
      console.error('Failed to reopen ticket:', err);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title={adminText('admin.support.title')}
        subtitle={adminText('admin.support.subtitle')}
      />


      {listError && (
        <StateMessage tone="alert">
          <span>Failed to load support tickets.</span>
          <button type="button" onClick={reloadList} className={styles.btnAction}>
            Retry
          </button>
        </StateMessage>
      )}

      <div className={styles.workspace}>
        <SupportTicketList
          tickets={tickets}
          selectedTicketId={selectedTicketId}
          onSelectTicket={setSelectedTicketId}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          counts={counts}
        />

        <SupportThread
          ticket={selectedTicket}
          onSendReply={handleSendReply}
          onResolve={handleResolve}
          onReopen={handleReopen}
          busy={actionBusy || listLoading}
        />
      </div>
    </div>
  );
}
