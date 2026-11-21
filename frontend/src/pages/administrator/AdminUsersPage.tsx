import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import {
  Users,
  Search,
  Filter,
  Shield,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { User, UserRole } from '../../types/auth';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { users, updateUserStatus, updateUserRole } = useManagement();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUserForRole, setSelectedUserForRole] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.rollNumber && u.rollNumber.toLowerCase().includes(search.toLowerCase()));
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleToggleStatus = async (user: User) => {
    setMessage(null);
    const uid = user.id || user.userId;
    const curId = currentUser?.id || currentUser?.userId;
    if (uid === curId) {
      setMessage({ text: 'Safety Violation: You cannot deactivate your own administrative account.', isError: true });
      return;
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await updateUserStatus(uid, nextStatus);
      setMessage({ text: res.message, isError: !res.success });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to update user status',
        isError: true,
      });
    }
  };

  const handleSaveRole = async () => {
    if (!selectedUserForRole) return;
    setMessage(null);

    const targetId = selectedUserForRole.id || selectedUserForRole.userId;
    const curId = currentUser?.id || currentUser?.userId;

    if (targetId === curId && newRole !== 'administrator') {
      setMessage({ text: 'Safety Violation: You cannot remove administrator permissions from your own account.', isError: true });
      setSelectedUserForRole(null);
      return;
    }

    try {
      const res = await updateUserRole(targetId, newRole);
      setMessage({ text: res.message, isError: !res.success });
      setSelectedUserForRole(null);
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to update user role',
        isError: true,
      });
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'administrator':
        return 'danger';
      case 'student_affairs':
      case 'club_advisor':
        return 'warning';
      case 'event_coordinator':
      case 'club_president':
        return 'info';
      case 'venue_manager':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Administrator', path: '/admin/dashboard' },
          { label: 'User Directory' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional User Directory</h1>
          <p className="text-sm text-slate-500">
            RBAC governance, account access management, and role assignments across the campus platform.
          </p>
        </div>
        <div className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700">
          {users.length} Active System Users
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border text-sm ${
            !message.isError
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {!message.isError ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, email, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Filter size={14} /> Role:
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-slate-700"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="event_coordinator">Club Coordinator</option>
              <option value="club_advisor">Faculty Advisor</option>
              <option value="student_affairs">Dean of Student Affairs</option>
              <option value="administrator">Administrator</option>
              <option value="venue_manager">Venue Manager</option>
            </select>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 ml-2">
              Status:
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">User Account</th>
                <th className="py-3.5 px-4">Identifier / Roll #</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isCurrent = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {u.fullName}
                            {isCurrent && (
                              <span className="text-[10px] bg-brand-100 text-brand-800 font-bold px-1.5 py-0.2 rounded">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600">{u.rollNumber || 'STAFF-ID'}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={getRoleBadgeVariant(u.role)} className="capitalize">
                        {u.roleDisplayName}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.status === 'active' ? 'success' : 'neutral'} className="capitalize">
                        {u.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedUserForRole(u);
                            setNewRole(u.role);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-slate-100 transition-colors"
                          title="Change User Role"
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isCurrent}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isCurrent
                              ? 'text-slate-200 cursor-not-allowed'
                              : u.status === 'active'
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={isCurrent ? 'Cannot modify your own status' : u.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {u.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role Assignment Modal */}
      <Modal
        isOpen={!!selectedUserForRole}
        onClose={() => setSelectedUserForRole(null)}
        title="Update System RBAC Role"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600">
            Reassign system access level for <strong className="text-slate-800">{selectedUserForRole?.fullName}</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Select Designated Role
            </label>
            <div className="space-y-2">
              {[
                { id: 'student', label: 'Student', desc: 'Registers for events, joins clubs, views certificates.' },
                { id: 'event_coordinator', label: 'Club Coordinator', desc: 'Creates events, manages club roster and budget.' },
                { id: 'club_advisor', label: 'Faculty Advisor', desc: 'Level 1 event approvals, chapter oversight.' },
                { id: 'student_affairs', label: 'Dean of Student Affairs', desc: 'Level 2 institutional approvals, policy oversight.' },
                { id: 'administrator', label: 'Administrator', desc: 'Level 3 final approval, user RBAC, audit logging.' },
                { id: 'venue_manager', label: 'Venue Manager', desc: 'Venue and equipment booking approvals.' },
              ].map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    newRole === r.id
                      ? 'border-brand-600 bg-brand-50/50 text-brand-950 ring-1 ring-brand-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="system_role"
                    value={r.id}
                    checked={newRole === r.id}
                    onChange={() => setNewRole(r.id as UserRole)}
                    className="mt-1 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <p className="text-sm font-semibold">{r.label}</p>
                    <p className="text-xs text-slate-500">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setSelectedUserForRole(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRole}>
              Apply Role Change
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
