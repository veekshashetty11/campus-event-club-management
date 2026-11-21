import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ApprovalTimeline from '../../components/common/ApprovalTimeline';
import {
  Calendar,
  PlusCircle,
  Search,
  Filter,
  MapPin,
  Clock,
  Edit,
  Send,
  Eye,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { CampusEvent, EventStatus } from '../../types/event';

export default function CoordinatorEventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { events, approvals, resubmitEvent } = useManagement();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEventForTimeline, setSelectedEventForTimeline] = useState<CampusEvent | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Filter events for this coordinator's club
  const clubEvents = useMemo(() => {
    if (!user?.clubId) return events;
    return events.filter((e) => e.clubId === user.clubId);
  }, [events, user?.clubId]);

  const filteredEvents = useMemo(() => {
    return clubEvents.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.venueName || e.venue?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clubEvents, search, statusFilter]);

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'published':
        return <Badge variant="success">Published</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'pending_approval':
        return <Badge variant="warning">In Review</Badge>;
      case 'changes_requested':
        return <Badge variant="warning" className="bg-amber-500/10 border-amber-500/20 text-amber-300">Changes Requested</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'completed':
        return <Badge variant="neutral">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="neutral" className="bg-[#263650]/60 text-slate-300">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">Draft</Badge>;
    }
  };

  const handleQuickSubmit = async (eventId: number) => {
    setSubmittingId(eventId);
    setMessage(null);
    try {
      const res = await resubmitEvent(eventId, {});
      setMessage({ text: res.message, isError: !res.success });
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : 'Submission failed',
        isError: true,
      });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Coordinator', path: '/coordinator/dashboard' },
          { label: 'Events List' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Club Events Directory</h1>
          <p className="text-sm text-slate-500">
            Create, manage, and track approval workflows for all your club events.
          </p>
        </div>
        <Link to="/coordinator/events/create">
          <Button variant="primary" className="shadow-sm">
            <PlusCircle size={16} className="mr-2" />
            Create New Event
          </Button>
        </Link>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border text-sm ${
            !message.isError
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {!message.isError ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
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
              placeholder="Search event title, venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[#263650] bg-[#17243B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-200"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Filter size={14} /> Status:
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium rounded-lg border border-[#263650] bg-[#17243B] py-1.5 px-3 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Events ({clubEvents.length})</option>
              <option value="draft">Drafts</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="changes_requested">Changes Requested</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Events Table */}
      <Card className="overflow-hidden border border-[#263650]/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#17243B] border-b border-[#263650] text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-5">Event</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Venue</th>
                <th className="py-3.5 px-4">Registrations</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263650]/60 text-sm">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Calendar size={32} className="mx-auto mb-2 opacity-50 text-slate-300" />
                    <p className="font-medium text-slate-400">No events found</p>
                    <p className="text-xs text-slate-400 mt-1">Create an event or clear your search criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const cap = evt.capacity || evt.maxCapacity || 100;
                  const percentFilled = Math.round((evt.registeredCount / cap) * 100);
                  const isDraft = evt.status === 'draft';

                  return (
                    <tr key={evt.eventId} className="hover:bg-[#17243B]/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={evt.bannerUrl}
                            alt=""
                            className="w-12 h-10 rounded-lg object-cover bg-[#17243B] shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=200&q=80';
                            }}
                          />
                          <div>
                            <p className="font-semibold text-slate-100 line-clamp-1">{evt.title}</p>
                            <span className="text-xs text-slate-400">{evt.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          <span>{new Date(evt.startDate || evt.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{evt.startTime} - {evt.endTime}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{evt.venueName || evt.venue?.name || 'TBD'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold text-slate-300">{evt.registeredCount}</span>
                            <span className="text-slate-400">/ {cap}</span>
                          </div>
                          <div className="w-full bg-[#263650] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percentFilled >= 100
                                  ? 'bg-rose-500'
                                  : percentFilled >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-600'
                              }`}
                              style={{ width: `${Math.min(percentFilled, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(evt.status)}</td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approval Timeline Inspector */}
                          <button
                            onClick={() => setSelectedEventForTimeline(evt)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-[#17243B] transition-colors"
                            title="View Approval Timeline"
                          >
                            <Eye size={16} />
                          </button>

                          {/* Edit Event */}
                          {(isDraft || evt.status === 'changes_requested') && (
                            <button
                              onClick={() => navigate(`/coordinator/events/edit/${evt.eventId}`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                              title="Edit / Revise Event"
                            >
                              <Edit size={16} />
                            </button>
                          )}

                          {/* Submit / Resubmit for Approval */}
                          {(isDraft || evt.status === 'changes_requested') && (
                            <button
                              onClick={() => handleQuickSubmit(evt.eventId)}
                              disabled={submittingId === evt.eventId}
                              className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors disabled:opacity-50"
                              title={evt.status === 'changes_requested' ? 'Resubmit Revisions' : 'Submit for Approval'}
                            >
                              <Send size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Approval Timeline Modal */}
      <Modal
        isOpen={!!selectedEventForTimeline}
        onClose={() => setSelectedEventForTimeline(null)}
        title={`Approval Progress: ${selectedEventForTimeline?.title}`}
      >
        {selectedEventForTimeline && (
          <div className="space-y-6 pt-2">
            {/* Event Summary Pill */}
            <div className="p-3.5 rounded-xl bg-[#17243B] border border-[#263650]/80 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Current Status</p>
                <div className="mt-0.5">{getStatusBadge(selectedEventForTimeline.status)}</div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Proposed Budget</p>
                <p className="text-sm font-bold text-slate-200">
                  ₹{selectedEventForTimeline.budget ? selectedEventForTimeline.budget.toLocaleString('en-IN') : '0'}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Multi-Level Workflow</h4>
              <ApprovalTimeline
                currentStatus={selectedEventForTimeline.status}
                approvals={approvals.filter((a) => a.eventId === selectedEventForTimeline.eventId)}
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-[#263650]/60">
              <Button variant="outline" onClick={() => setSelectedEventForTimeline(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
