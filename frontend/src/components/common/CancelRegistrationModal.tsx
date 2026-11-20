import { useState } from 'react';
import type { EventRegistration } from '../../types/registration';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { AlertTriangle } from 'lucide-react';
import { useStudent } from '../../contexts/StudentContext';

interface CancelRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: EventRegistration | null;
  onSuccess?: () => void;
}

export default function CancelRegistrationModal({
  isOpen,
  onClose,
  registration,
  onSuccess,
}: CancelRegistrationModalProps) {
  const { cancelRegistration, cancelWaitlist } = useStudent();
  const [reason, setReason] = useState('Schedule conflict with coursework');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!registration) return null;

  const isWaitlist = registration.status === 'waitlisted';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (isWaitlist) {
        await cancelWaitlist(registration.registrationId);
      } else {
        await cancelRegistration(registration.registrationId, reason);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isWaitlist ? 'Cancel Waitlist Entry' : 'Cancel Event Registration'}
      size="md"
    >
      <div className="flex flex-col gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-900 leading-relaxed">
            {isWaitlist ? (
              <span>
                Are you sure you want to surrender your waitlist spot for{' '}
                <strong className="font-semibold">{registration.eventTitle}</strong>?
              </span>
            ) : (
              <span>
                Cancelling will release your reserved seat for{' '}
                <strong className="font-semibold">{registration.eventTitle}</strong>. If there are students on
                the waitlist, the next student will be automatically promoted.
              </span>
            )}
          </div>
        </div>

        {!isWaitlist && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for cancellation (Optional)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
            >
              <option value="Schedule conflict with coursework">Schedule conflict with coursework</option>
              <option value="Personal / Medical reasons">Personal / Medical reasons</option>
              <option value="Exam preparation">Exam preparation</option>
              <option value="Registered by mistake">Registered by mistake</option>
              <option value="Other">Other reason</option>
            </select>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Keep My Seat
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            isLoading={isSubmitting}
          >
            {isWaitlist ? 'Leave Waitlist' : 'Confirm Cancellation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
