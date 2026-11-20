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
    } catch (err: any) {
      setError(err?.message || 'Failed to join waitlist.');
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
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">You're on the Waitlist!</h3>
          <p className="text-sm text-slate-600 mt-1 max-w-sm">
            You hold position <strong className="text-brand-900 font-bold">#{joinedPosition}</strong> for{' '}
            <strong className="text-slate-800">{event.title}</strong>.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 mt-4 mb-5 text-left flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <div>
              <strong>Automated Promotion:</strong> If an active attendee cancels their registration, the
              system will automatically promote the next waitlisted student and notify you.
            </div>
          </div>

          <Button variant="primary" size="sm" onClick={handleClose}>
            Back to Dashboard
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong>Event is at Maximum Capacity:</strong> All {event.maxCapacity} seats for{' '}
              <span className="font-semibold">{event.title}</span> are currently occupied. You may join the waitlist queue below.
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Event Capacity:</span>
              <span className="font-semibold text-slate-800">{event.maxCapacity} Seats</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Currently Registered:</span>
              <span className="font-semibold text-slate-800">{event.registeredCount} (Full)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Waitlist Queue:</span>
              <span className="font-semibold text-amber-700">{currentQueue} Students waiting</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
              <span className="font-medium text-slate-700">Your Projected Position:</span>
              <span className="font-bold text-brand-900">#{targetPosition}</span>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="secondary"
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
