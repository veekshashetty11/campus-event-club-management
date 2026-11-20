import React, { useState } from 'react';
import type { CampusEvent } from '../../types/event';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Calendar, MapPin, Users, AlertCircle, CheckCircle2, Ticket } from 'lucide-react';
import { formatDate, formatTime } from '../../utils';
import { useStudent } from '../../contexts/StudentContext';
import { Link } from 'react-router-dom';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CampusEvent | null;
  onSuccess?: () => void;
}

export default function RegistrationModal({
  isOpen,
  onClose,
  event,
  onSuccess,
}: RegistrationModalProps) {
  const { registerForEvent } = useStudent();
  const [dietary, setDietary] = useState('Standard');
  const [notes, setNotes] = useState('');
  const [agreeRules, setAgreeRules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTicket, setSuccessTicket] = useState<string | null>(null);

  if (!event) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeRules) {
      setError('Please acknowledge the event guidelines to complete registration.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await registerForEvent(event.eventId, {
        dietaryPreferences: dietary,
        specialNotes: notes.trim() || undefined,
      });
      setSuccessTicket(res.ticketCode ?? 'TKT-CONFIRMED');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to complete registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setSuccessTicket(null);
    setError(null);
    setAgreeRules(false);
    setNotes('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={successTicket ? 'Registration Successful!' : 'Confirm Event Registration'}
      size="lg"
    >
      {successTicket ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-1">You're All Set!</h3>
          <p className="text-sm text-slate-600 max-w-md mb-5">
            Your seat for <strong className="text-slate-800">{event.title}</strong> has been secured.
          </p>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex flex-col items-center">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Digital E-Ticket Pass
            </span>
            <span className="text-lg font-mono font-bold text-brand-900 tracking-wider bg-white px-4 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              {successTicket}
            </span>
            <p className="text-xs text-slate-500 mt-2">
              Present this code or QR pass at the venue entrance during check-in.
            </p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={handleModalClose} className="flex-1 sm:flex-initial">
              Close
            </Button>
            <Link to="/student/registrations" className="flex-1 sm:flex-initial">
              <Button variant="primary" leftIcon={<Ticket size={16} />} className="w-full">
                View My Registrations
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          {/* Event Quick Overview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase text-brand-700 tracking-wider">
              {event.category}
            </span>
            <h4 className="font-bold text-slate-900 text-base">{event.title}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 mt-1">
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <span>
                  {formatDate(event.startTime)} · {formatTime(event.startTime)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">{event.isOnline ? 'Online Event' : (event.venue?.name ?? 'TBD')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={13} className="text-slate-400 shrink-0" />
                <span className="truncate">Organized by {event.clubName}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-emerald-700">
                <span>{event.maxCapacity - event.registeredCount} spots available</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Options */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dietary Preference (for event refreshments)
              </label>
              <select
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500"
              >
                <option value="Standard">Standard</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Gluten-Free">Gluten-Free</option>
                <option value="Not Applicable">Not Applicable</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Special Requirements or Questions (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Accessibility needs, bringing specialized hardware..."
                rows={2}
                className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500"
              />
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none mt-1">
              <input
                type="checkbox"
                checked={agreeRules}
                onChange={(e) => setAgreeRules(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-600 leading-snug">
                I agree to the campus conduct code and understand that attendance will be recorded via my student ID.
              </span>
            </label>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={handleModalClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Confirm Registration
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
