// apps/admin-web/src/modules/admins/screens/AdminsAndRolesScreen.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader, Icon, Modal } from '@/shared/ui';
import {
  createAdmin,
  deleteAdmin,
  fetchAdmins,
  setupAdminTotp,
  updateAdmin,
  verifyAdminTotp,
} from '../api/adminsApi';
import type {
  AdminRoleType,
  AdminUserRecord,
  CreateAdminPayload,
  TotpSetupResponse,
  UpdateAdminPayload,
} from '../types';
import styles from '../components/AdminsAndRoles.module.css';

export function AdminsAndRolesScreen() {
  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminRoleType>('ALL');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState<AdminUserRecord | null>(null);
  const [totpAdmin, setTotpAdmin] = useState<AdminUserRecord | null>(null);
  const [totpData, setTotpData] = useState<TotpSetupResponse | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState<string | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateAdminPayload>({
    email: '',
    password: '',
    admin_role: 'OPERATIONS_ADMIN',
    full_name: '',
    phone_number: '',
    is_active: true,
  });
  const [editForm, setEditForm] = useState<UpdateAdminPayload>({
    email: '',
    admin_role: 'OPERATIONS_ADMIN',
    full_name: '',
    phone_number: '',
    is_active: true,
    password: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const data = await fetchAdmins();
      setAdmins(data);
    } catch (err: unknown) {
      console.error('Failed to load admins', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = admins.length;
    const superCount = admins.filter((a) => a.admin_role === 'SUPER_ADMIN').length;
    const academicCount = admins.filter((a) => a.admin_role === 'ACADEMIC_ADMIN').length;
    const operationsCount = admins.filter((a) => a.admin_role === 'OPERATIONS_ADMIN').length;
    return { total, superCount, academicCount, operationsCount };
  }, [admins]);

  // Filtered admins
  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      const matchesRole = roleFilter === 'ALL' || a.admin_role === roleFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.email.toLowerCase().includes(q) ||
        (a.full_name && a.full_name.toLowerCase().includes(q)) ||
        (a.phone_number && a.phone_number.includes(q));
      return matchesRole && matchesSearch;
    });
  }, [admins, roleFilter, search]);

  // Handlers
  const handleOpenCreate = () => {
    setFormError(null);
    setCreateForm({
      email: '',
      password: '',
      admin_role: 'OPERATIONS_ADMIN',
      full_name: '',
      phone_number: '',
      is_active: true,
    });
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password) {
      setFormError('Email and password are required');
      return;
    }
    try {
      setActionLoading(true);
      setFormError(null);
      const nameParts = (createForm.full_name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Admin';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      await createAdmin({
        ...createForm,
        first_name: firstName,
        last_name: lastName,
      } as any);
      setCreateModalOpen(false);
      await loadAdmins();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create administrator';
      setFormError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (admin: AdminUserRecord) => {
    setFormError(null);
    setEditAdmin(admin);
    const resolvedName = admin.full_name || ((admin as any).firstName ? `${(admin as any).firstName} ${(admin as any).lastName || ''}`.trim() : '');
    setEditForm({
      email: admin.email,
      admin_role: admin.admin_role || (admin as any).adminRole || 'OPERATIONS_ADMIN',
      full_name: resolvedName,
      phone_number: admin.phone_number || (admin as any).phone || '',
      is_active: admin.is_active !== undefined ? admin.is_active : (admin as any).isActive ?? true,
      password: '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAdmin) return;
    try {
      setActionLoading(true);
      setFormError(null);
      const nameParts = (editForm.full_name || '').trim().split(/\s+/);
      const payload: any = {
        email: editForm.email,
        admin_role: editForm.admin_role,
        full_name: editForm.full_name,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        phone_number: editForm.phone_number,
        is_active: editForm.is_active,
      };
      if (editForm.password?.trim()) {
        payload.password = editForm.password.trim();
      }
      await updateAdmin(editAdmin.id, payload);
      setEditAdmin(null);
      await loadAdmins();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update administrator';
      setFormError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (admin: AdminUserRecord) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete administrator "${admin.email}"? This action cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await deleteAdmin(admin.id);
      await loadAdmins();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete administrator';
      alert(msg);
    }
  };

  const handleOpenTotp = async (admin: AdminUserRecord) => {
    setTotpAdmin(admin);
    setTotpCode('');
    setTotpError(null);
    try {
      setActionLoading(true);
      const setup = await setupAdminTotp(admin.id);
      setTotpData(setup);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate TOTP secret';
      setTotpError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpAdmin || !totpCode.trim()) return;
    try {
      setActionLoading(true);
      setTotpError(null);
      await verifyAdminTotp(totpAdmin.id, totpCode.trim());
      setTotpAdmin(null);
      setTotpData(null);
      await loadAdmins();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid verification code';
      setTotpError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const renderRoleBadge = (role: AdminRoleType) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className={styles.roleBadgeSuper}>Super Admin</span>;
      case 'ACADEMIC_ADMIN':
        return <span className={styles.roleBadgeAcademic}>Academic Admin</span>;
      case 'OPERATIONS_ADMIN':
        return <span className={styles.roleBadgeOperations}>Operations Admin</span>;
      default:
        return <span>{role}</span>;
    }
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title="Admins & Roles"
        subtitle="Manage platform administrator accounts, role assignments, and multi-factor authentication."
      />

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Administrators</span>
            <span className={styles.statIcon}>
              <Icon name="users" size={20} />
            </span>
          </div>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statSubtext}>Configured admin accounts</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Super Admins</span>
            <span className={styles.statIcon}>
              <Icon name="shieldCheck" size={20} />
            </span>
          </div>
          <span className={styles.statValue}>{stats.superCount}</span>
          <span className={styles.statSubtext}>Full system authority</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Academic Admins</span>
            <span className={styles.statIcon}>
              <Icon name="graduationCap" size={20} />
            </span>
          </div>
          <span className={styles.statValue}>{stats.academicCount}</span>
          <span className={styles.statSubtext}>Courses, content & quizzes</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Operations Admins</span>
            <span className={styles.statIcon}>
              <Icon name="creditCard" size={20} />
            </span>
          </div>
          <span className={styles.statValue}>{stats.operationsCount}</span>
          <span className={styles.statSubtext}>Students, payments & support</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Icon name="search" size={18} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filterControls}>
          <select
            className={styles.roleSelect}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | AdminRoleType)}
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ACADEMIC_ADMIN">Academic Admin</option>
            <option value="OPERATIONS_ADMIN">Operations Admin</option>
          </select>

          <button type="button" className={styles.createButton} onClick={handleOpenCreate}>
            <Icon name="plus" size={16} />
            New Administrator
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Loading administrators...</div>
        ) : filteredAdmins.length === 0 ? (
          <div className={styles.emptyState}>No administrators found matching your criteria.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Administrator</th>
                <th>Role</th>
                <th>Status</th>
                <th>2FA (TOTP)</th>
                <th>Last Login</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    <div className={styles.adminName}>
                      {admin.full_name || ((admin as any).firstName ? `${(admin as any).firstName} ${(admin as any).lastName || ''}`.trim() : null) || 'Unnamed Admin'}
                    </div>
                    <div className={styles.adminEmail}>{admin.email}</div>
                  </td>
                  <td>{renderRoleBadge(admin.admin_role || (admin as any).adminRole)}</td>
                  <td>
                    {(admin.is_active !== undefined ? admin.is_active : (admin as any).isActive) ? (
                      <span className={styles.statusActive}>
                        <span className={`${styles.dot} ${styles.dotActive}`} />
                        Active
                      </span>
                    ) : (
                      <span className={styles.statusInactive}>
                        <span className={`${styles.dot} ${styles.dotInactive}`} />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td>
                    {admin.totp_enabled ? (
                      <span className={styles.totpEnabledBadge}>Enabled</span>
                    ) : (
                      <span className={styles.totpDisabledBadge}>Disabled</span>
                    )}
                  </td>
                  <td>
                    {admin.last_login_at
                      ? new Date(admin.last_login_at).toLocaleString()
                      : 'Never'}
                  </td>
                  <td>
                    <div className={styles.actionsCell} style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => handleOpenTotp(admin)}
                        title="Configure Two-Factor Authentication"
                      >
                        2FA
                      </button>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => handleOpenEdit(admin)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(admin)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <Modal
          title="Create Administrator"
          onClose={() => setCreateModalOpen(false)}
        >
          <form className={styles.form} onSubmit={handleCreateSubmit}>
            {formError && <div className={styles.errorBanner}>{formError}</div>}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Full Name</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="e.g. Abebe Bikila"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email Address *</label>
              <input
                type="email"
                required
                className={styles.formInput}
                placeholder="admin@mastara.edu"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Initial Password *</label>
              <input
                type="password"
                required
                className={styles.formInput}
                placeholder="Minimum 8 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phone Number</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="+251 91 123 4567"
                value={createForm.phone_number}
                onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Administrative Role</label>
              <select
                className={styles.formInput}
                value={createForm.admin_role}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    admin_role: e.target.value as AdminRoleType,
                  })
                }
              >
                <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
                <option value="ACADEMIC_ADMIN">Academic Admin (Courses, Content, Tests)</option>
                <option value="OPERATIONS_ADMIN">Operations Admin (Students, Payments, Support)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formCheckboxLabel}>
                <input
                  type="checkbox"
                  checked={createForm.is_active}
                  onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                />
                Account Active
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn} disabled={actionLoading}>
                {actionLoading ? 'Creating...' : 'Create Administrator'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editAdmin && (
        <Modal
          title={`Edit Administrator (${editAdmin.email})`}
          onClose={() => setEditAdmin(null)}
        >
          <form className={styles.form} onSubmit={handleEditSubmit}>
            {formError && <div className={styles.errorBanner}>{formError}</div>}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Full Name</label>
              <input
                type="text"
                className={styles.formInput}
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email Address</label>
              <input
                type="email"
                required
                className={styles.formInput}
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Reset Password (leave empty to keep current)</label>
              <input
                type="password"
                className={styles.formInput}
                placeholder="New password (optional)"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phone Number</label>
              <input
                type="text"
                className={styles.formInput}
                value={editForm.phone_number}
                onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Administrative Role</label>
              <select
                className={styles.formInput}
                value={editForm.admin_role}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    admin_role: e.target.value as AdminRoleType,
                  })
                }
              >
                <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
                <option value="ACADEMIC_ADMIN">Academic Admin (Courses, Content, Tests)</option>
                <option value="OPERATIONS_ADMIN">Operations Admin (Students, Payments, Support)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formCheckboxLabel}>
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                />
                Account Active
              </label>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setEditAdmin(null)}
              >
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* TOTP Modal */}
      {totpAdmin && (
        <Modal
          title={`Setup 2-Factor Authentication (${totpAdmin.email})`}
          onClose={() => {
            setTotpAdmin(null);
            setTotpData(null);
          }}
        >
          <form className={styles.totpContainer} onSubmit={handleVerifyTotp}>
            {totpError && <div className={styles.errorBanner}>{totpError}</div>}

            <p className={styles.totpHelp}>
              Scan the setup URI or enter this secret key into Google Authenticator or your 2FA app of choice:
            </p>

            {totpData ? (
              <div className={styles.totpSecretBox}>{totpData.secret}</div>
            ) : (
              <div>Generating key...</div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Enter 6-digit verification code</label>
              <input
                type="text"
                maxLength={6}
                required
                className={styles.formInput}
                placeholder="123456"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
              />
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => {
                  setTotpAdmin(null);
                  setTotpData(null);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={actionLoading || !totpData || !totpCode.trim()}
              >
                {actionLoading ? 'Verifying...' : 'Verify & Enable 2FA'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
