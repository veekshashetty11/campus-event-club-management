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
  Check,
} from 'lucide-react';
import type { CampusEvent, EventApproval, ApprovalStage } from '../../types/event';

export default function AdminApprovalsPage() {
  const { user } = useAuth();
  const { events, approvals, decideEventApproval } = useManagement();

  const isAffairs = user?.role === 'student_affairs';
  const isAdmin = user?.role === 'administrator';

  const [activeStageTab, setActiveStageTab] = useState<ApprovalStage>(
    isAffairs ? 'student_affairs' : 'administrator'
  );
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [selectedApproval, setSelectedApproval] = useState<EventApproval | null>(null);

  // Decision Modal State
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | 'changes_requested' | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionAlert, setActionAlert] = useState<{ text: string; isError: boolean } | null>(null);

  // Approvals filtered by active stage
  const stageApprovals = useMemo(() => {
    return approvals.filter((a) => a.stage === activeStageTab);
  }, [approvals, activeStageTab]);

  const filteredApprovals = useMemo(() => {
    if (filterStatus === 'all') return stageApprovals;
    return stageApprovals.filter((a) => a.status === filterStatus);
  }, [stageApprovals, filterStatus]);

  const selectedEvent = useMemo(() => {
    if (!selectedApproval) return null;
    return events.find((e) => e.eventId === selectedApproval.eventId) || null;
  }, [selectedApproval, events]);

  // Previous approvals for the selected event (e.g. Club Advisor notes)
  const previousApprovals = useMemo(() => {
    if (!selectedApproval) return [];
    return approvals.filter(
      (a) => a.eventId === selectedApproval.eventId && a.approvalId !== selectedApproval.approvalId
    );
  }, [approvals, selectedApproval]);

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
          { label: 'Administrator', path: '/admin/dashboard' },
          { label: 'Event Approvals' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Multi-Level Event Approvals</h1>
          <p className="text-sm text-slate-400">
            Institutional governance and administrative sign-off for campus club events.
          </p>
        </div>

        {/* Stage Tabs (Level 2: Student Affairs vs Level 3: Final Admin) */}
        <div className="flex items-center gap-1.5 p-1 bg-[#17243B] rounded-xl border border-[#263650]">
          <button
            onClick={() => setActiveStageTab('student_affairs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStageTab === 'student_affairs'
                ? 'bg-[#111C32] text-brand-900 shadow-xs'
                : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            Level 2: Student Affairs
          </button>
          <button
            onClick={() => setActiveStageTab('administrator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeStageTab === 'administrator'
                ? 'bg-[#111C32] text-brand-900 shadow-xs'
                : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            Level 3: Administrator Final
          </button>
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

      {/* Filter Bar */}
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

      {/* Table of Approvals */}
      <Card className="overflow-hidden border border-[#263650]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#17243B] border-b border-[#263650] text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-5">Proposed Event</th>
                <th className="py-3.5 px-4">Club</th>
                <th className="py-3.5 px-4">Stage</th>
                <th className="py-3.5 px-4">Event Date</th>
                <th className="py-3.5 px-4">Budget</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263650]/60">
              {filteredApprovals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileCheck2 size={32} className="mx-auto mb-2 opacity-50 text-slate-300" />
                    <p className="font-medium text-slate-300">No event approvals in this queue</p>
                  </td>
                </tr>
              ) : (
                filteredApprovals.map((appr) => {
                  const evt = events.find((e) => e.eventId === appr.eventId);
                  return (
                    <tr key={appr.approvalId} className="hover:bg-[#17243B]/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-100">{evt?.title || 'Unknown Event'}</p>
                        <p className="text-xs text-slate-400">{evt?.category} • {evt?.venueName}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-300">{appr.clubName}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant="neutral" className="text-[11px] capitalize">
                          {appr.stage.replace('_', ' ')}
                        </Badge>
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
                          {appr.status === 'pending' ? 'Review & Sign' : 'Inspect'}
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
        title={`Administrative Review: ${selectedEvent?.title}`}
      >
        {selectedEvent && selectedApproval && (
          <div className="space-y-5 pt-2 max-h-[75vh] overflow-y-auto pr-1">
            {/* Quick Summary Banner */}
            <div className="p-4 rounded-xl bg-[#17243B] border border-[#263650] flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                <p className="text-slate-400">Club</p>
                <p className="text-sm font-bold text-slate-100">{selectedEvent.clubName}</p>
              </div>
              <div>
                <p className="text-slate-400">Venue</p>
                <p className="text-sm font-semibold text-slate-100">{selectedEvent.venueName}</p>
              </div>
              <div>
                <p className="text-slate-400">Budget Request</p>
                <p className="text-sm font-bold text-emerald-300">${selectedEvent.budget?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-slate-400">Capacity</p>
                <p className="text-sm font-semibold text-slate-100">{selectedEvent.capacity} seats</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description & Scope</h4>
              <p className="text-sm text-slate-300 leading-relaxed bg-[#17243B] p-3 rounded-xl border border-[#263650]">
                {selectedEvent.description || selectedEvent.shortDescription}
              </p>
            </div>

            {/* Previous Approval Notes (e.g. Faculty Advisor comments) */}
            {previousApprovals.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Prior Stage Feedback</h4>
                {previousApprovals.map((prev) => (
                  <div key={prev.approvalId} className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-teal-300 capitalize">{prev.stage.replace('_', ' ')}</span>
                      <span className="text-slate-400">{prev.reviewedAt ? new Date(prev.reviewedAt).toLocaleDateString() : ''}</span>
                    </div>
                    <p className="text-slate-300">{prev.comments || 'Approved without additional notes.'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Multi-level Workflow Stepper */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Workflow Progression</h4>
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
                  {activeStageTab === 'administrator'
                    ? 'Final Sign-Off (Publish Event)'
                    : 'Approve (Advance to Stage 3)'}
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
            ? activeStageTab === 'administrator'
              ? 'Confirm Final Administrative Approval'
              : 'Confirm Student Affairs Approval'
            : decisionType === 'changes_requested'
            ? 'Request Event Revision'
            : 'Reject Proposed Event'
        }
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-300">
            {decisionType === 'approved'
              ? activeStageTab === 'administrator'
                ? 'Final approval will automatically publish this event and open student registrations on campus.'
                : 'Approving this event will advance it to Level 3 (Administrator Final Review).'
              : decisionType === 'changes_requested'
              ? 'Detail the necessary revisions for the Club Coordinator.'
              : 'Provide an official administrative rationale for rejection.'}
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Administrative Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Institutional feedback, conditions, or clearance notes..."
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
              {isSubmitting ? 'Recording...' : 'Confirm Decision'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
