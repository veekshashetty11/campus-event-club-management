import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useManagement } from '../../contexts/ManagementContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ApprovalTimeline from '../../components/common/ApprovalTimeline';
import {
  FileCheck2,
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Filter,
} from 'lucide-react';
import type { CampusEvent, EventApproval } from '../../types/event';

export default function AdvisorApprovalsPage() {
  const { user } = useAuth();
  const { events, approvals, clubs, decideEventApproval } = useManagement();

  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'changes_requested' | 'rejected' | 'all'>('pending');
  const [selectedApproval, setSelectedApproval] = useState<EventApproval | null>(null);

  // Decision Modal State
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | 'changes_requested' | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionAlert, setActionAlert] = useState<{ text: string; isError: boolean } | null>(null);

  // Advised clubs
  const advisedClubs = useMemo(() => {
    return clubs.filter(
      (c) =>
        c.advisorEmail === user?.email ||
        c.facultyAdvisorEmail === user?.email ||
        (c.advisorName || c.facultyAdvisorName || '').toLowerCase().includes('finch')
    );
  }, [clubs, user?.email]);

  const advisedClubIds = useMemo(() => advisedClubs.map((c) => c.clubId), [advisedClubs]);

  // Advisor-level approvals
  const advisorApprovals = useMemo(() => {
    const advisedClubNames = advisedClubs.map((c) => c.name.toLowerCase());
    return approvals.filter((a) => {
      if (a.stage !== 'club_advisor') return false;
      const targetClubId =
        a.clubId ??
        events.find((e) => e.eventId === a.eventId)?.clubId ??
        clubs.find((c) => c.name.toLowerCase() === (a.clubName || '').toLowerCase())?.clubId;

      if (targetClubId !== undefined && advisedClubIds.includes(targetClubId)) {
        return true;
      }
      return advisedClubNames.includes((a.clubName || '').toLowerCase());
    });
  }, [approvals, advisedClubIds, advisedClubs, events, clubs]);

  const filteredApprovals = useMemo(() => {
    if (filterStatus === 'all') return advisorApprovals;
    return advisorApprovals.filter((a) => a.status === filterStatus);
  }, [advisorApprovals, filterStatus]);

  const selectedEvent = useMemo(() => {
    if (!selectedApproval) return null;
    return events.find((e) => e.eventId === selectedApproval.eventId) || null;
  }, [selectedApproval, events]);

  const handleDecision = async () => {
    if (!selectedApproval || !decisionType) return;

    if ((decisionType === 'rejected' || decisionType === 'changes_requested') && !notes.trim()) {
      setActionAlert({ text: 'Please provide reviewer comments or explanation.', isError: true });
      return;
    }

    setIsSubmitting(true);
    setActionAlert(null);
    try {
      const res = await decideEventApproval(
        selectedApproval.approvalId,
        decisionType,
        notes,
        decisionType === 'rejected' ? notes : undefined,
        decisionType === 'changes_requested' ? notes : undefined
      );

      setActionAlert({ text: res.message, isError: !res.success });
      setDecisionType(null);
      setNotes('');
      setSelectedApproval(null);
    } catch (err: unknown) {
      setActionAlert({
        text: err instanceof Error ? err.message : 'Failed to record decision',
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'changes_requested':
        return <Badge variant="warning" className="bg-amber-500/10 text-amber-300 border-amber-500/20">Changes Requested</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <Breadcrumbs
        items={[
          { label: 'Advisor', path: '/advisor/dashboard' },
          { label: 'Event Approvals' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Level 1 Faculty Event Approvals</h1>
          <p className="text-sm text-slate-400">
            Review proposed club event budgets, academic scheduling, and facility prerequisites.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          {(['pending', 'approved', 'changes_requested', 'rejected', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filterStatus === s
                  ? 'bg-brand-800 text-white shadow-xs'
                  : 'text-slate-300 bg-[#17243B] border border-[#263650] hover:bg-[#17243B]'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {actionAlert && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border text-sm ${
            !actionAlert.isError
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {!actionAlert.isError ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{actionAlert.text}</span>
          </div>
          <button onClick={() => setActionAlert(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Table of Approvals */}
      <Card className="overflow-hidden border border-[#263650]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#17243B] border-b border-[#263650] text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-5">Proposed Event</th>
                <th className="py-3.5 px-4">Club</th>
                <th className="py-3.5 px-4">Submitted Date</th>
                <th className="py-3.5 px-4">Event Date</th>
                <th className="py-3.5 px-4">Budget</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263650]/60 text-sm">
              {filteredApprovals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileCheck2 size={32} className="mx-auto mb-2 opacity-50 text-slate-300" />
                    <p className="font-medium text-slate-300">No approval records in this view</p>
                  </td>
                </tr>
              ) : (
                filteredApprovals.map((appr) => {
                  const evt = events.find((e) => e.eventId === appr.eventId);
                  return (
                    <tr key={appr.approvalId} className="hover:bg-[#17243B]/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-100">{evt?.title || 'Unknown Event'}</p>
                        <p className="text-xs text-slate-400">{evt?.category}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-300">{appr.clubName}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {new Date(appr.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        {evt?.startDate ? new Date(evt.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-100">
                        ${evt?.budget ? evt.budget.toLocaleString() : '0'}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(appr.status)}</td>
                      <td className="py-3.5 px-5 text-right">
                        <Button
                          variant={appr.status === 'pending' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedApproval(appr)}
                        >
                          <Eye size={14} className="mr-1.5" />
                          {appr.status === 'pending' ? 'Review & Decide' : 'Inspect'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Event Details Modal */}
      <Modal
        isOpen={!!selectedApproval && !decisionType}
        onClose={() => setSelectedApproval(null)}
        title={`Review Event: ${selectedEvent?.title}`}
      >
        {selectedEvent && selectedApproval && (
          <div className="space-y-5 pt-2 max-h-[75vh] overflow-y-auto pr-1">
            {/* Quick Summary Pill */}
            <div className="p-4 rounded-xl bg-[#17243B] border border-[#263650] flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400">Organizing Club</p>
                <p className="text-sm font-bold text-slate-100">{selectedEvent.clubName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Venue</p>
                <p className="text-sm font-semibold text-slate-100">{selectedEvent.venueName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Requested Budget</p>
                <p className="text-sm font-bold text-emerald-300">${selectedEvent.budget?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <div>{getStatusBadge(selectedApproval.status)}</div>
              </div>
            </div>

            {/* Description & Objectives */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</h4>
              <p className="text-sm text-slate-300 leading-relaxed bg-[#17243B] p-3 rounded-xl border border-[#263650]">
                {selectedEvent.description || selectedEvent.shortDescription}
              </p>
            </div>

            {/* Logistics & Equipment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#17243B] border border-[#263650]">
                <span className="text-slate-400 block mb-0.5">Capacity & Waitlist:</span>
                <span className="font-semibold text-slate-100">
                  {selectedEvent.capacity} seats ({selectedEvent.isWaitlistEnabled ? 'Waitlist Enabled' : 'No Waitlist'})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#17243B] border border-[#263650]">
                <span className="text-slate-400 block mb-0.5">Required Equipment:</span>
                <span className="font-semibold text-slate-100">{selectedEvent.equipmentNeeded || 'Standard AV setup'}</span>
              </div>
            </div>

            {/* Approval Workflow Stepper */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Approval Pipeline</h4>
              <ApprovalTimeline
                currentStatus={selectedEvent.status}
                approvals={approvals.filter((a) => a.eventId === selectedEvent.eventId)}
              />
            </div>

            {/* Actions if currently pending */}
            {selectedApproval.status === 'pending' ? (
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#263650]/60">
                <Button variant="outline" onClick={() => setSelectedApproval(null)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  className="text-amber-300 border-amber-500/20 hover:bg-amber-500/10"
                  onClick={() => setDecisionType('changes_requested')}
                >
                  Request Changes
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setDecisionType('rejected')}
                >
                  Reject Event
                </Button>
                <Button
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setDecisionType('approved')}
                >
                  <CheckCircle2 size={16} className="mr-1.5" />
                  Approve (Advance to Stage 2)
                </Button>
              </div>
            ) : (
              <div className="flex justify-end pt-3 border-t border-[#263650]/60">
                <Button variant="outline" onClick={() => setSelectedApproval(null)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Decision Comments Modal */}
      <Modal
        isOpen={!!decisionType}
        onClose={() => setDecisionType(null)}
        title={
          decisionType === 'approved'
            ? 'Confirm Faculty Approval'
            : decisionType === 'changes_requested'
            ? 'Request Event Changes'
            : 'Reject Proposed Event'
        }
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-300">
            {decisionType === 'approved'
              ? 'Approving this event will advance it to Level 2 (Student Affairs & Dean Brody) for administrative review.'
              : decisionType === 'changes_requested'
              ? 'Please specify what modifications or clarifications the Club Coordinator must provide before approval.'
              : 'Provide an official rationale for rejecting this event.'}
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Reviewer Notes / Feedback
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                decisionType === 'approved'
                  ? 'Optional encouragement or faculty notes...'
                  : 'Required feedback for the coordinator...'
              }
              className="w-full text-sm rounded-xl border border-[#263650] bg-[#17243B] p-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#263650]/60">
            <Button variant="outline" onClick={() => setDecisionType(null)}>
              Back
            </Button>
            <Button
              variant={decisionType === 'approved' ? 'primary' : decisionType === 'rejected' ? 'danger' : 'secondary'}
              onClick={handleDecision}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Submit Decision'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
