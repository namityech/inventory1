import React, { useState, useEffect } from 'react';
import {
  Users, Plus, ShieldCheck, UserCheck, Edit2, History,
  RefreshCw, CheckCircle, Lock, Phone, Mail
} from 'lucide-react';
import { User, AuditLog, UserRole } from '../../types/inventory';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';

export const UsersView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // User modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF' as UserRole,
    phone: '',
    is_active: 1
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, lRes] = await Promise.all([
        api.getUsers(),
        api.getAuditLogs()
      ]);
      setUsers(uRes.users);
      setLogs(lRes.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewUser = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'STAFF',
      phone: '',
      is_active: 1
    });
    setError(null);
    setUserModalOpen(true);
  };

  const openEditUser = (u: User) => {
    setEditingUser(u);
    setUserForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      phone: u.phone || '',
      is_active: 1
    });
    setError(null);
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) return;

    if (!editingUser && !userForm.password) {
      setError('Password is required for new accounts');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, userForm);
      } else {
        await api.createUser(userForm);
      }
      setUserModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <span>Role Permissions & Immutable Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Role-based access control (RBAC) and non-repudiable inventory action ledger
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeTab === 'users' && (
            <button
              onClick={openNewUser}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create User Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>User Accounts & Roles ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>System Audit Log ({logs.length})</span>
        </button>
      </div>

      {/* TAB 1: USER ACCOUNTS */}
      {activeTab === 'users' && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">User Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Assigned Role</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Permissions Scope</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {u.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${
                        u.role === 'ADMIN'
                          ? 'text-purple-600'
                          : u.role === 'INVENTORY_MANAGER'
                          ? 'text-teal-600'
                          : 'text-blue-600'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {u.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {u.role === 'ADMIN'
                        ? 'Full Application Administration, Users & Settings'
                        : u.role === 'INVENTORY_MANAGER'
                        ? 'Product, Batch, FEFO, Purchase Orders, Waste Disposal'
                        : 'Stock View, Sales/Usage Dispense, Expiry Tracking'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditUser(u)}
                        className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Immutable System Activity Log
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every critical event, stock modification, waste disposal, and authentication change is recorded
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              Showing last {logs.length} actions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action Type</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No audit events logged.
                    </td>
                  </tr>
                ) : (
                  logs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                        {new Date(l.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-teal-700 dark:text-teal-400">
                        {l.action}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                        {l.entity}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {l.user_name || 'System'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-md truncate">
                        {l.details || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USER MODAL */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? `Edit User: ${editingUser.name}` : 'Provision New System User'}
        subtitle="Configure role permissions and contact profile"
        maxWidth="md"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={userForm.name}
              onChange={e => setUserForm({ ...userForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={userForm.email}
              onChange={e => setUserForm({ ...userForm, email: e.target.value })}
              disabled={Boolean(editingUser)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password {editingUser ? '(Leave blank to retain current)' : '*'}
            </label>
            <input
              type="password"
              value={userForm.password}
              onChange={e => setUserForm({ ...userForm, password: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              System Role *
            </label>
            <select
              value={userForm.role}
              onChange={e => setUserForm({ ...userForm, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="STAFF">Staff (POS, View Stock, Expiry Alerts)</option>
              <option value="INVENTORY_MANAGER">Inventory Manager (Batches, FEFO, Restock POs, Disposal)</option>
              <option value="ADMIN">Administrator (Full Access & User Management)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={userForm.phone}
              onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setUserModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              {submitting ? 'Saving User...' : editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
