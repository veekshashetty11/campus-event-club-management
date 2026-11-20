import { useState } from 'react';
import type { CampusEvent } from '../../types/event';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStudent } from '../../contexts/StudentContext';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CampusEvent | null;
  onSuccess?: () => void;
}

export default function WaitlistModal({ isOpen, onClose, event, onSuccess }: WaitlistModalProps) {
  const { joinWaitlist } = useStudent();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedPosition, setJoinedPosition] = useState<number | null>(null);

  if (!event) return null;

  const currentQueue = event.waitlistCount || 0;
  const targetPosition = currentQueue + 1;

  const handleJoin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await joinWaitlist(event.eventId);
      setJoinedPosition(res.position ?? targetPosition);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join waitlist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setJoinedPosition(null);
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={joinedPosition ? 'Waitlist Confirmed' : 'Join Event Waitlist'}
      size="md"
    >
      {joinedPosition ? (
        <div className="flex flex-col items-center text-center py-4 text-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-950/60 text-amber-400 border border-amber-700/50 flex items-center justify-center mb-3 shadow-lg shadow-amber-950/50">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">You're on the Waitlist!</h3>
          <p className="text-sm text-slate-300 mt-1 max-w-sm leading-relaxed">
            You hold queue position <strong className="text-amber-400 font-bold">#{joinedPosition}</strong> for{' '}
            <strong className="text-white">{event.title}</strong>.
          </p>

          <div className="bg-[#17243B] border border-amber-800/40 rounded-xl p-3.5 text-xs text-amber-300 mt-4 mb-5 text-left flex items-start gap-2.5">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
            <div className="leading-relaxed">
              <strong className="text-amber-200">Automated Promotion:</strong> If an active registered attendee cancels their reservation, the system will automatically promote the next student in queue and notify you via email.
            </div>
          </div>

          <Button variant="primary" size="sm" onClick={handleClose}>
            Back to Dashboard
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-slate-200">
          <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3.5 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200 leading-relaxed">
              <strong className="text-amber-300">Event is at Maximum Capacity:</strong> All {event.maxCapacity} seats for{' '}
              <span className="font-semibold text-white">{event.title}</span> are currently occupied. You may join the waitlist queue below.
            </div>
          </div>

          <div className="bg-[#17243B] border border-[#263650] rounded-xl p-4 text-xs space-y-2.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Event Capacity:</span>
              <span className="font-semibold text-white">{event.maxCapacity} Seats</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Currently Registered:</span>
              <span className="font-semibold text-white">{event.registeredCount} (Full)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Waitlist Queue:</span>
              <span className="font-semibold text-amber-400">{currentQueue} Students waiting</span>
            </div>
            <div className="flex justify-between pt-2.5 border-t border-[#263650] text-sm">
              <span className="font-medium text-slate-300">Your Projected Position:</span>
              <span className="font-bold text-amber-400">#{targetPosition}</span>
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/50">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#263650]">
            <Button variant="secondary" size="sm" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Users size={15} />}
              onClick={handleJoin}
              isLoading={isSubmitting}
            >
              Confirm Waitlist (#{targetPosition})
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
