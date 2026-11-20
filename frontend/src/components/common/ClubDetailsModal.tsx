import React, { useState } from 'react';
import type { Club } from '../../types/club';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { Users, Mail, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { useStudent } from '../../contexts/StudentContext';
import { formatDate } from '../../utils';

interface ClubDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  club: Club | null;
}

export default function ClubDetailsModal({ isOpen, onClose, club }: ClubDetailsModalProps) {
  const { memberships, events, requestClubMembership } = useStudent();
  const [statement, setStatement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!club) return null;

  const currentMembership = memberships.find((m) => m.clubId === club.clubId);
  const clubEvents = events.filter((e) => e.clubId === club.clubId && e.status === 'published');

  const handleRequestMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await requestClubMembership(club.clubId, statement.trim() || undefined);
      setSuccessMsg(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit membership request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setSuccessMsg(null);
    setError(null);
    setStatement('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} title={club.name} size="lg">
      <div className="flex flex-col gap-4 text-slate-200">
        {/* Header Strip */}
        <div className="flex items-start gap-4 pb-4 border-b border-[#263650]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#3B82F6] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
            {club.shortName?.substring(0, 2) || club.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="primary" size="sm">{club.category}</Badge>
              {currentMembership ? (
                <Badge
                  variant={currentMembership.membershipStatus === 'approved' ? 'success' : 'amber'}
                  size="sm"
                  dot
                >
                  {currentMembership.membershipStatus === 'approved'
                    ? `Active ${currentMembership.memberRole}`
                    : 'Pending Coordinator Review'}
                </Badge>
              ) : (
                <Badge variant="teal" size="sm">Open for Membership</Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Department: {club.departmentName || 'General Campus'} · Founded {club.foundedDate || '2018'}
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">About Club</h4>
          <p className="text-sm text-slate-300 leading-relaxed">{club.description}</p>
        </div>

        {/* Quick Facts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[#17243B] p-3.5 rounded-xl border border-[#263650] text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-indigo-400 shrink-0" />
            <span><strong className="text-white">{club.memberCount}</strong> Members (Cap: {club.maxMembers || 200})</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-blue-400 shrink-0" />
            <span className="truncate">{club.contactEmail || 'club@campus.edu'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-cyan-400 shrink-0" />
            <span className="truncate">{club.meetingSchedule || 'Weekly sessions'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-rose-400 shrink-0" />
            <span className="truncate">{club.roomLocation || 'Student Center'}</span>
          </div>
        </div>

        {/* Upcoming Club Events */}
        {clubEvents.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Upcoming Club Events ({clubEvents.length})
            </h4>
            <div className="space-y-2">
              {clubEvents.map((ev) => (
                <div
                  key={ev.eventId}
                  className="bg-[#17243B] border border-[#263650] rounded-xl p-3 flex justify-between items-center text-xs"
                >
                  <div>
                    <p className="font-semibold text-white">{ev.title}</p>
                    <p className="text-slate-400 mt-0.5">{formatDate(ev.startTime)} · {ev.venue?.name ?? 'TBD'}</p>
                  </div>
                  <span className="text-indigo-400 font-semibold">{ev.registeredCount}/{ev.maxCapacity} seats</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join Request Form / Membership Status */}
        <div className="pt-3 border-t border-[#263650]">
          {successMsg ? (
            <div className="bg-emerald-950/40 border border-emerald-700/50 text-emerald-300 text-xs rounded-xl p-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          ) : currentMembership ? (
            <div className="bg-[#17243B] border border-[#263650] rounded-xl p-3 text-xs text-slate-300 flex items-center justify-between">
              <span>
                Membership Status:{' '}
                <strong className="text-white capitalize">{currentMembership.membershipStatus}</strong> (
                {currentMembership.memberRole})
              </span>
              <span className="text-slate-400">Joined {currentMembership.joinedAt}</span>
            </div>
          ) : (
            <form onSubmit={handleRequestMembership} className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold text-slate-300">Request Membership to this Club</h4>
              <textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="Briefly state your interest or prior experience (Optional)..."
                rows={2}
                className="w-full text-xs rounded-xl border border-[#263650] bg-[#17243B] p-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
              />
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  Submit Membership Request
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}
