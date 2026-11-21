import React, { useState } from 'react';
import type { CampusEvent, EventApproval, EventStatus } from '../../types/event';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  User,
  Calendar,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
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

  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  const toggleStage = (idx: number) => {
    setExpandedStage((prev) => (prev === idx ? null : idx));
  };

  const stages = [
    {
      level: 0,
      title: '1. Student Coordinator Submission',
      role: 'Student Coordinator',
      assignedTo: event?.organizerName || event?.coordinatorName || 'Chris Martinez',
      date: event?.submissionDate ? formatDate(event.submissionDate) : 'Initial Draft',
      status: 'approved',
      comments: 'Event proposal drafted and submitted with venue and equipment requisitions.',
      approver: event?.organizerName || event?.coordinatorName || 'Chris Martinez',
    },
    {
      level: 1,
      title: '2. Faculty Advisor Review',
      role: 'Faculty Advisor',
      assignedTo: 'Prof. Alistair Finch',
      date: advisorApproval?.decidedAt ? formatDate(advisorApproval.decidedAt) : (advisorApproval ? 'In Review' : 'Upcoming'),
      status: advisorApproval?.status || (eventStatus === 'draft' ? 'not_started' : 'pending'),
      comments: advisorApproval?.comments,
      rejectionReason: advisorApproval?.rejectionReason,
      changesRequested: advisorApproval?.requestedChanges,
      approver: advisorApproval?.approverName,
    },
    {
      level: 2,
      title: '3. Student Affairs Review',
      role: 'Student Affairs',
      assignedTo: 'Dean Marcus Brody',
      date: affairsApproval?.decidedAt ? formatDate(affairsApproval.decidedAt) : (affairsApproval ? 'In Review' : 'Upcoming'),
      status: affairsApproval?.status || (advisorApproval?.status === 'approved' ? 'pending' : 'not_started'),
      comments: affairsApproval?.comments,
      rejectionReason: affairsApproval?.rejectionReason,
      changesRequested: affairsApproval?.requestedChanges,
      approver: affairsApproval?.approverName,
    },
    {
      level: 3,
      title: '4. Campus Administrator Final Approval',
      role: 'Campus Administrator',
      assignedTo: 'Dr. Eleanor Vance',
      date: adminApproval?.decidedAt ? formatDate(adminApproval.decidedAt) : (adminApproval ? 'In Review' : 'Upcoming'),
      status: adminApproval?.status || (affairsApproval?.status === 'approved' ? 'pending' : 'not_started'),
      comments: adminApproval?.comments,
      rejectionReason: adminApproval?.rejectionReason,
      changesRequested: adminApproval?.requestedChanges,
      approver: adminApproval?.approverName,
    },
  ];

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 size={18} className="text-emerald-400" />;
      case 'pending':
      case 'in_review':
        return <Clock size={18} className="text-amber-400 animate-pulse" />;
      case 'changes_requested':
        return <AlertTriangle size={18} className="text-amber-400" />;
      case 'rejected':
        return <XCircle size={18} className="text-rose-400" />;
      default:
        return <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success" size="sm">Approved</Badge>;
      case 'pending':
        return <Badge variant="amber" size="sm" dot>Pending Review</Badge>;
      case 'in_review':
        return <Badge variant="primary" size="sm" dot>In Review</Badge>;
      case 'changes_requested':
        return <Badge variant="warning" size="sm">Changes Requested</Badge>;
      case 'rejected':
        return <Badge variant="danger" size="sm">Rejected</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Not Started</Badge>;
    }
  };

  // Calculate completed stages for header progress bar
  const completedCount = stages.filter((s) => s.status === 'approved').length;
  const progressPercent = Math.round((completedCount / stages.length) * 100);

  return (
    <div className="bg-[#111C32] rounded-2xl border border-[#263650] shadow-xl p-5 sm:p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#263650]">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} className="text-indigo-400" />
            <h3 className="font-bold text-white text-base">Interactive Event Approval Pipeline</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track multi-level institutional authorization in sequential hierarchy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {eventStatus === 'published' ? (
            <Badge variant="success" size="md">Published & Active</Badge>
          ) : eventStatus === 'changes_requested' ? (
            <Badge variant="warning" size="md">Modifications Required</Badge>
          ) : eventStatus === 'rejected' ? (
            <Badge variant="danger" size="md">Proposal Rejected</Badge>
          ) : eventStatus === 'draft' ? (
            <Badge variant="neutral" size="md">Draft Mode</Badge>
          ) : (
            <Badge variant="amber" size="md" dot>Approval In Progress</Badge>
          )}
        </div>
      </div>

      {/* ── Approval Roles & Sequential Stages Legend with Generous Spacing ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#17243B]/80 border border-[#263650] my-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
          Institutional Approval Sequence & Roles:
        </p>
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-4 text-xs font-semibold">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-200">
            <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
            <span>Student Coordinator</span>
          </div>

          <span className="text-slate-500 font-bold text-sm px-1">→</span>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>Faculty Advisor</span>
          </div>

          <span className="text-slate-500 font-bold text-sm px-1">→</span>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span>Student Affairs</span>
          </div>

          <span className="text-slate-500 font-bold text-sm px-1">→</span>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-200">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
            <span>Campus Administrator</span>
          </div>
        </div>
      </div>

      {/* Connected Top Progress Stepper (Desktop) */}
      <div className="hidden md:block my-2">
        <div className="relative flex items-center justify-between">
          {/* Track line behind steps */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-[#17243B] border border-[#263650] rounded-full z-0">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {stages.map((stage, idx) => {
            const isApproved = stage.status === 'approved';
            const isPending = stage.status === 'pending';
            const isRejected = stage.status === 'rejected';
            const isChanges = stage.status === 'changes_requested';

            return (
              <div
                key={idx}
                onClick={() => toggleStage(idx)}
                className="relative z-10 flex flex-col items-center cursor-pointer group px-2"
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                    isApproved
                      ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/20 text-emerald-400'
                      : isPending
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 ring-4 ring-amber-500/20 shadow-md animate-pulse'
                      : isRejected
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 ring-4 ring-rose-500/20'
                      : isChanges
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                      : 'bg-[#17243B] border-[#263650] text-slate-500 group-hover:border-slate-400'
                  }`}
                >
                  {getStepIcon(stage.status)}
                </div>
                <span className="text-xs font-bold text-slate-200 mt-2.5 text-center leading-tight">
                  Stage {idx + 1}
                </span>
                <span className="text-[11px] font-medium text-slate-300 text-center mt-1 px-1.5 leading-snug">
                  {stage.role}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vertical Interactive Stage Cards */}
      <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#263650]">
        {stages.map((stage, idx) => {
          const isExpanded = expandedStage === idx || stage.status === 'changes_requested' || stage.status === 'rejected';
          const isRejected = stage.status === 'rejected';

          return (
            <div key={idx} className="relative group">
              {/* Step Node */}
              <div
                className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#17243B] border flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${
                  isRejected ? 'border-rose-500/50 text-rose-400' : 'border-[#263650]'
                }`}
              >
                {getStepIcon(stage.status)}
              </div>

              {/* Stage Card */}
              <div
                onClick={() => toggleStage(idx)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isRejected
                    ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50 shadow-md'
                    : isExpanded
                    ? 'bg-[#17243B] border-indigo-500/40 shadow-lg'
                    : 'bg-[#17243B]/60 hover:bg-[#17243B] border-[#263650]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-white text-sm">{stage.title}</h4>
                    {getStatusBadge(stage.status)}
                    <span className="text-[11px] font-mono text-slate-400">({stage.role})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">{stage.date}</span>
                    <button type="button" className="text-slate-400 hover:text-white p-0.5" aria-label="Toggle details">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-1">
                  Assigned Reviewer: <strong className="text-slate-200">{stage.assignedTo}</strong>
                  {stage.approver && stage.approver !== stage.assignedTo && ` (Decided by: ${stage.approver})`}
                </p>

                {/* Expandable details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[#263650]/60 space-y-2.5 text-xs animate-fadeIn">
                    {stage.comments && (
                      <div className="text-slate-200 bg-[#0D1426] p-3 rounded-lg border border-[#263650]">
                        <span className="font-semibold text-slate-400 block mb-0.5 flex items-center gap-1.5">
                          <MessageSquare size={12} className="text-indigo-400" />
                          Reviewer Assessment & Notes:
                        </span>
                        {stage.comments}
                      </div>
                    )}

                    {stage.changesRequested && (
                      <div className="text-amber-200 bg-amber-950/40 p-3 rounded-lg border border-amber-500/40">
                        <span className="font-bold text-amber-400 block mb-0.5 flex items-center gap-1.5">
                          <AlertTriangle size={12} />
                          Action Required by Coordinator:
                        </span>
                        {stage.changesRequested}
                      </div>
                    )}

                    {stage.rejectionReason && (
                      <div className="text-rose-200 bg-rose-950/40 p-3 rounded-lg border border-rose-500/40">
                        <span className="font-bold text-rose-400 block mb-0.5 flex items-center gap-1.5">
                          <ShieldAlert size={12} />
                          Rejection Justification:
                        </span>
                        {stage.rejectionReason}
                      </div>
                    )}

                    {!stage.comments && !stage.changesRequested && !stage.rejectionReason && (
                      <p className="text-slate-500 italic">No additional reviewer notes recorded for this stage.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
