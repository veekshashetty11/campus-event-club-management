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
    } catch (err: any) {
      setError(err?.message || 'Failed to submit membership request.');
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
      <div className="flex flex-col gap-4">
        {/* Header Strip */}
        <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-brand-800 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
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
            <p className="text-xs text-slate-500 mt-1">
              Department: {club.departmentName || 'General Campus'} · Founded {club.foundedDate || '2018'}
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">About Club</h4>
          <p className="text-sm text-slate-700 leading-relaxed">{club.description}</p>
        </div>

        {/* Quick Facts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-slate-400 shrink-0" />
            <span><strong>{club.memberCount}</strong> Members (Cap: {club.maxMembers || 200})</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-slate-400 shrink-0" />
            <span className="truncate">{club.contactEmail || 'club@campus.edu'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-slate-400 shrink-0" />
            <span className="truncate">{club.meetingSchedule || 'Weekly sessions'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-slate-400 shrink-0" />
            <span className="truncate">{club.roomLocation || 'Student Center'}</span>
          </div>
        </div>

        {/* Upcoming Club Events */}
        {clubEvents.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Upcoming Club Events ({clubEvents.length})
            </h4>
            <div className="space-y-2">
              {clubEvents.map((ev) => (
                <div
                  key={ev.eventId}
                  className="bg-white border border-slate-200 rounded-lg p-2.5 flex justify-between items-center text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{ev.title}</p>
                    <p className="text-slate-400 mt-0.5">{formatDate(ev.startTime)} · {ev.venue?.name ?? 'TBD'}</p>
                  </div>
                  <span className="text-brand-700 font-medium">{ev.registeredCount}/{ev.maxCapacity} seats</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join Request Form / Membership Status */}
        <div className="pt-3 border-t border-slate-100">
          {successMsg ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          ) : currentMembership ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center justify-between">
              <span>
                Membership Status:{' '}
                <strong className="text-slate-800 capitalize">{currentMembership.membershipStatus}</strong> (
                {currentMembership.memberRole})
              </span>
              <span className="text-slate-400">Joined {currentMembership.joinedAt}</span>
            </div>
          ) : (
            <form onSubmit={handleRequestMembership} className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold text-slate-700">Request Membership to this Club</h4>
              <textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="Briefly state your interest or prior experience (Optional)..."
                rows={2}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex justify-end">
                <Button type="submit" variant="secondary" size="sm" isLoading={isSubmitting}>
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
