import type { CampusEvent, EventApproval, EventStatus } from '../../types/event';
import { CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import Badge from './Badge';
import { formatDate } from '../../utils';

interface ApprovalTimelineProps {
  event?: CampusEvent;
  currentStatus?: EventStatus;
  approvals?: EventApproval[];
}

export default function ApprovalTimeline({ event, currentStatus, approvals = [] }: ApprovalTimelineProps) {
  const eventStatus = event?.status || currentStatus || 'draft';
  const eventApprovals = event ? approvals.filter((a) => a.eventId === event.eventId) : approvals;

  const advisorApproval = eventApprovals.find((a) => a.level === 1 || a.stage === 'club_advisor');
  const affairsApproval = eventApprovals.find((a) => a.level === 2 || a.stage === 'student_affairs');
  const adminApproval = eventApprovals.find((a) => a.level === 3 || a.stage === 'administrator');

  const steps = [
    {
      level: 0,
      title: 'Coordinator Submission',
      subtitle: event?.organizerName || 'Chris Martinez',
      date: event?.submissionDate ? formatDate(event.submissionDate) : 'Submitted',
      status: 'completed',
      comments: 'Event proposal drafted and submitted with initial budget & venue requirements.',
    },
    {
      level: 1,
      title: 'Level 1: Club Advisor',
      subtitle: 'Prof. Alistair Finch',
      date: advisorApproval?.decidedAt ? formatDate(advisorApproval.decidedAt) : (advisorApproval ? 'Pending Review' : 'Upcoming'),
      status: advisorApproval?.status || (eventStatus === 'draft' ? 'upcoming' : 'pending'),
      comments: advisorApproval?.comments,
      rejectionReason: advisorApproval?.rejectionReason,
      changesRequested: advisorApproval?.requestedChanges,
      approver: advisorApproval?.approverName,
    },
    {
      level: 2,
      title: 'Level 2: Student Affairs',
      subtitle: 'Dean Marcus Brody',
      date: affairsApproval?.decidedAt ? formatDate(affairsApproval.decidedAt) : (affairsApproval ? 'Pending Review' : 'Upcoming'),
      status: affairsApproval?.status || (advisorApproval?.status === 'approved' ? 'pending' : 'upcoming'),
      comments: affairsApproval?.comments,
      rejectionReason: affairsApproval?.rejectionReason,
      changesRequested: affairsApproval?.requestedChanges,
      approver: affairsApproval?.approverName,
    },
    {
      level: 3,
      title: 'Level 3: Administrator (Final)',
      subtitle: 'Dr. Eleanor Vance',
      date: adminApproval?.decidedAt ? formatDate(adminApproval.decidedAt) : (adminApproval ? 'Pending Review' : 'Upcoming'),
      status: adminApproval?.status || (affairsApproval?.status === 'approved' ? 'pending' : 'upcoming'),
      comments: adminApproval?.comments,
      rejectionReason: adminApproval?.rejectionReason,
      changesRequested: adminApproval?.requestedChanges,
      approver: adminApproval?.approverName,
    },
  ];

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle2 size={18} className="text-emerald-600" />;
      case 'pending':
        return <Clock size={18} className="text-amber-500 animate-pulse" />;
      case 'changes_requested':
        return <AlertTriangle size={18} className="text-orange-500" />;
      case 'rejected':
        return <XCircle size={18} className="text-red-500" />;
      default:
        return <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <Badge variant="success" size="sm">Approved</Badge>;
      case 'pending':
        return <Badge variant="amber" size="sm" dot>Pending Review</Badge>;
      case 'changes_requested':
        return <Badge variant="warning" size="sm">Changes Requested</Badge>;
      case 'rejected':
        return <Badge variant="danger" size="sm">Rejected</Badge>;
      default:
        return <Badge variant="default" size="sm">Upcoming</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Multi-Level Event Approval Workflow</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Coordinator Submission → Club Advisor (L1) → Student Affairs (L2) → Final Executive Sign-off (L3)
          </p>
        </div>
        <div>
          {eventStatus === 'published' ? (
            <Badge variant="success" size="md">Published & Active</Badge>
          ) : eventStatus === 'changes_requested' ? (
            <Badge variant="warning" size="md">Modifications Required</Badge>
          ) : eventStatus === 'rejected' ? (
            <Badge variant="danger" size="md">Proposal Rejected</Badge>
          ) : eventStatus === 'draft' ? (
            <Badge variant="default" size="md">Draft Mode</Badge>
          ) : (
            <Badge variant="amber" size="md" dot>Approval In Progress</Badge>
          )}
        </div>
      </div>

      {/* Stepper Grid */}
      <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {steps.map((step, idx) => (
          <div key={idx} className="relative group">
            {/* Step Icon Node */}
            <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center">
              {getStepIcon(step.status)}
            </div>

            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 transition-all hover:bg-slate-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{step.title}</h4>
                  {getStatusBadge(step.status)}
                </div>
                <span className="text-xs text-slate-400 font-medium">{step.date}</span>
              </div>

              <p className="text-xs text-slate-500 font-medium mb-1">
                Designated Reviewer: <strong className="text-slate-700">{step.subtitle}</strong>
                {step.approver && ` (Decided by: ${step.approver})`}
              </p>

              {/* Feedback Comments */}
              {step.comments && (
                <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 mt-2">
                  <span className="font-semibold text-slate-500 block mb-0.5">Reviewer Notes:</span>
                  {step.comments}
                </div>
              )}

              {/* Requested Changes Alert */}
              {step.changesRequested && (
                <div className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2">
                  <span className="font-bold text-amber-700 block mb-0.5">Action Required by Coordinator:</span>
                  {step.changesRequested}
                </div>
              )}

              {/* Rejection Reason Alert */}
              {step.rejectionReason && (
                <div className="text-xs text-red-900 bg-red-50 p-2.5 rounded-lg border border-red-200 mt-2">
                  <span className="font-bold text-red-700 block mb-0.5">Rejection Justification:</span>
                  {step.rejectionReason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
