import React, { useState, useMemo } from 'react';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ApprovalTimeline from '../../components/common/ApprovalTimeline';
import {
  Calendar,
  Search,
  Filter,
  MapPin,
  Clock,
  Users,
  Eye,
} from 'lucide-react';
import type { CampusEvent, EventStatus } from '../../types/event';

export default function AdminEventsPage() {
  const { events, approvals, clubs } = useManagement();

  const [search, setSearch] = useState('');
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [inspectEvent, setInspectEvent] = useState<CampusEvent | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.venueName || e.venue?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        e.clubName.toLowerCase().includes(search.toLowerCase());
      const matchesClub = selectedClub === 'all' || e.clubId === Number(selectedClub);
      const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || e.status === selectedStatus;
      return matchesSearch && matchesClub && matchesCategory && matchesStatus;
    });
  }, [events, search, selectedClub, selectedCategory, selectedStatus]);

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'published':
        return <Badge variant="success">Published</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'pending_approval':
        return <Badge variant="warning">In Review</Badge>;
      case 'changes_requested':
        return <Badge variant="warning" className="bg-amber-100 text-amber-900 border-amber-300">Changes Requested</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'completed':
        return <Badge variant="neutral">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">Draft</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Administrator', path: '/admin/dashboard' },
          { label: 'Campus Events' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">University Event Directory</h1>
          <p className="text-sm text-slate-500">
            System-wide repository of student club events, workshops, hackathons, and seminars.
          </p>
        </div>
        <div className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700">
          {events.length} Total Registered Events
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search event, club..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <select
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 py-1.5 px-3 bg-white text-slate-700"
          >
            <option value="all">All Clubs</option>
            {clubs.map((c) => (
              <option key={c.clubId} value={c.clubId}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 py-1.5 px-3 bg-white text-slate-700"
          >
            <option value="all">All Categories</option>
            <option value="Technical">Technical</option>
            <option value="Cultural">Cultural</option>
            <option value="Sports">Sports</option>
            <option value="Workshop">Workshop</option>
            <option value="Seminar">Seminar</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 py-1.5 px-3 bg-white text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="approved">Approved</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </Card>

      {/* Events Table */}
      <Card className="overflow-hidden border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Event</th>
                <th className="py-3.5 px-4">Club</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Venue</th>
                <th className="py-3.5 px-4">Capacity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map((evt) => (
                <tr key={evt.eventId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-5">
                    <p className="font-semibold text-slate-900">{evt.title}</p>
                    <span className="text-xs text-slate-400">{evt.category}</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-700">{evt.clubName}</td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    <p className="font-medium">{evt.startDate ? new Date(evt.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (evt.eventDate || 'TBD')}</p>
                    <span className="text-[11px] text-slate-400">{evt.startTime}</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    <span className="font-medium text-slate-800">{evt.venueName || evt.venue?.name || 'Main Auditorium'}</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <span className="font-semibold text-slate-800">{evt.registeredCount}</span> / {evt.capacity}
                  </td>
                  <td className="py-3.5 px-4">{getStatusBadge(evt.status)}</td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => setInspectEvent(evt)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-slate-100 transition-colors"
                      title="Inspect event details"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inspect Modal */}
      <Modal isOpen={!!inspectEvent} onClose={() => setInspectEvent(null)} title={inspectEvent?.title || ''}>
        {inspectEvent && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-700">{inspectEvent.description}</p>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block">Organizing Club:</span>
                <span className="font-bold text-slate-800">{inspectEvent.clubName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Venue:</span>
                <span className="font-bold text-slate-800">{inspectEvent.venueName || inspectEvent.venue?.name || 'Main Auditorium'}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Workflow Audit</h4>
              <ApprovalTimeline
                currentStatus={inspectEvent.status}
                approvals={approvals.filter((a) => a.eventId === inspectEvent.eventId)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
