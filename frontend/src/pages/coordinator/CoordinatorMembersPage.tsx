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
  UserCheck,
  UserX,
  Shield,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import type { MemberRole } from '../../types/club';

export default function CoordinatorMembersPage() {
  const { user } = useAuth();
  const { clubs, memberships, updateMembershipStatus, updateMemberRole } = useManagement();

  const club = clubs.find((c) => c.clubId === user?.clubId) || clubs[0];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Role edit modal state
  const [roleModalMembership, setRoleModalMembership] = useState<{
    id: number;
    name: string;
    currentRole: MemberRole;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<MemberRole>('member');

  // Remove confirmation modal
  const [removeMembershipId, setRemoveMembershipId] = useState<{ id: number; name: string } | null>(null);

  // Filter memberships for coordinator's club
  const clubMembers = useMemo(() => {
    return memberships.filter((m) => m.clubId === club.clubId);
  }, [memberships, club.clubId]);

  const filteredMembers = useMemo(() => {
    return clubMembers.filter((m) => {
      const name = m.studentName || '';
      const email = m.studentEmail || '';
      const roll = m.rollNumber || '';
      const st = m.status || m.membershipStatus || 'approved';
      const rl = m.role || m.memberRole || 'member';

      const matchesSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase()) ||
        roll.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || st === statusFilter;
      const matchesRole = roleFilter === 'all' || rl === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [clubMembers, search, statusFilter, roleFilter]);

  const pendingCount = clubMembers.filter((m) => (m.status || m.membershipStatus) === 'pending').length;
  const approvedCount = clubMembers.filter((m) => (m.status || m.membershipStatus) === 'approved').length;

  const handleStatusChange = async (membershipId: number, status: 'approved' | 'rejected') => {
    try {
      const res = await updateMembershipStatus(membershipId, status);
      setActionMessage({
        text: res.message || `Member request ${status} successfully.`,
        isError: !res.success,
      });
    } catch (err: unknown) {
      setActionMessage({
        text: err instanceof Error ? err.message : 'Action failed',
        isError: true,
      });
    }
  };

  const handleSaveRole = async () => {
    if (!roleModalMembership) return;
    try {
      const res = await updateMemberRole(roleModalMembership.id, selectedRole);
      setActionMessage({
        text: res.message || 'Member role updated successfully.',
        isError: !res.success,
      });
      setRoleModalMembership(null);
    } catch (err: unknown) {
      setActionMessage({
        text: err instanceof Error ? err.message : 'Failed to update role',
        isError: true,
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMembershipId) return;
    try {
      const res = await updateMembershipStatus(removeMembershipId.id, 'rejected');
      setActionMessage({
        text: res.message || `${removeMembershipId.name} removed from club.`,
        isError: !res.success,
      });
      setRemoveMembershipId(null);
    } catch (err: unknown) {
      setActionMessage({
        text: err instanceof Error ? err.message : 'Failed to remove member',
        isError: true,
      });
    }
  };

  const getRoleBadgeVariant = (role: MemberRole) => {
    switch (role) {
      case 'president':
      case 'vice_president':
        return 'danger';
      case 'coordinator':
        return 'info';
      case 'core_member':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Coordinator', path: '/coordinator/dashboard' },
          { label: 'Member Roster' },
        ]}
      />

      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Club Member Roster</h1>
          <p className="text-sm text-slate-500">
            Manage student registrations, approval requests, and leadership roles for {club.name}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <Users size={15} />
            <span>{approvedCount} Active Members</span>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 animate-pulse">
              <Clock size={15} />
              <span>{pendingCount} Pending Approval</span>
            </div>
          )}
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border text-sm ${
            !actionMessage.isError
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {!actionMessage.isError ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search member, email, roll no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Filter size={14} /> Status:
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'approved' | 'pending' | 'rejected')}
              className="text-xs font-medium rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All Statuses ({clubMembers.length})</option>
              <option value="approved">Approved ({approvedCount})</option>
              <option value="pending">Pending ({pendingCount})</option>
              <option value="rejected">Rejected</option>
            </select>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 ml-2">
              Role:
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-200 bg-white py-1.5 px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All Roles</option>
              <option value="president">President</option>
              <option value="vice_president">Vice President</option>
              <option value="coordinator">Coordinator</option>
              <option value="core_member">Core Member</option>
              <option value="member">General Member</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Members Table */}
      <Card className="overflow-hidden border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Member</th>
                <th className="py-3.5 px-4">Roll Number</th>
                <th className="py-3.5 px-4">Club Role</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users size={32} className="mx-auto mb-2 opacity-50 text-slate-300" />
                    <p className="font-medium text-slate-600">No members found</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing your filters or search terms.</p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const name = m.studentName || 'Student Member';
                  const email = m.studentEmail || 'student@campus.edu';
                  const roll = m.rollNumber || 'N/A';
                  const role = (m.role || m.memberRole || 'member') as MemberRole;
                  const status = m.status || m.membershipStatus || 'approved';
                  const joined = m.joinedDate || m.joinedAt || '2026-09-01';

                  return (
                    <tr key={m.membershipId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{name}</p>
                            <p className="text-xs text-slate-400">{email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600">{roll}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={getRoleBadgeVariant(role)} className="capitalize">
                          {role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(joined).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            status === 'approved'
                              ? 'success'
                              : status === 'pending'
                              ? 'warning'
                              : 'neutral'
                          }
                          className="capitalize"
                        >
                          {status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStatusChange(m.membershipId, 'approved')}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Approve Member"
                            >
                              <UserCheck size={16} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(m.membershipId, 'rejected')}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                              title="Reject Member"
                            >
                              <UserX size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setRoleModalMembership({
                                  id: m.membershipId,
                                  name,
                                  currentRole: role,
                                });
                                setSelectedRole(role);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-brand-700 hover:bg-slate-100 transition-colors"
                              title="Change Role"
                            >
                              <Shield size={16} />
                            </button>
                            <button
                              onClick={() => setRemoveMembershipId({ id: m.membershipId, name })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remove Member"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role Change Modal */}
      <Modal
        isOpen={!!roleModalMembership}
        onClose={() => setRoleModalMembership(null)}
        title="Update Member Role"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600">
            Assign a designated leadership or team responsibility for{' '}
            <strong className="text-slate-800">{roleModalMembership?.name}</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Select Role
            </label>
            <div className="space-y-2">
              {[
                { id: 'member', label: 'General Member', desc: 'Can register for events and view club announcements.' },
                { id: 'core_member', label: 'Core Team Member', desc: 'Assists in event logistics and organizing.' },
                { id: 'coordinator', label: 'Event Coordinator', desc: 'Can create events, submit approvals, mark attendance.' },
                { id: 'vice_president', label: 'Vice President', desc: 'Assists club president with full team management.' },
              ].map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedRole === r.id
                      ? 'border-brand-600 bg-brand-50/50 text-brand-950 ring-1 ring-brand-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="club_role"
                    value={r.id}
                    checked={selectedRole === r.id}
                    onChange={() => setSelectedRole(r.id as MemberRole)}
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
            <Button variant="outline" onClick={() => setRoleModalMembership(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRole}>
              Save Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={!!removeMembershipId}
        onClose={() => setRemoveMembershipId(null)}
        title="Remove Member from Club"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600">
            Are you sure you want to remove <strong className="text-slate-800">{removeMembershipId?.name}</strong> from {club.name}? They will lose member access and perks.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setRemoveMembershipId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemoveMember}>
              Remove Member
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
