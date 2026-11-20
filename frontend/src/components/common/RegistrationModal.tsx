import React, { useState } from 'react';
import type { CampusEvent } from '../../types/event';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Calendar, MapPin, Users, CheckCircle2, Ticket, Sparkles, PartyPopper } from 'lucide-react';
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete registration.');
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
      title={successTicket ? 'Registration Confirmed!' : 'Confirm Event Registration'}
      size="lg"
    >
      {successTicket ? (
        <div className="flex flex-col items-center text-center py-4 relative overflow-hidden">
          {/* Subtle Confetti & Celebration Glow Animation */}
          <div className="relative mb-5">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 celebration-badge">
              <PartyPopper size={40} className="animate-bounce" />
            </div>
            {/* Sparkle elements */}
            <Sparkles size={20} className="absolute -top-2 -right-2 text-yellow-400 animate-spin" style={{ animationDuration: '4s' }} />
            <Sparkles size={16} className="absolute -bottom-1 -left-2 text-cyan-300 animate-pulse" />
          </div>

          <h3 className="text-2xl font-black text-white mb-1.5 tracking-tight">
            You're Confirmed!
          </h3>
          <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Your admission seat for <strong className="text-white font-bold">{event.title}</strong> has been secured and registered in the system.
          </p>

          <div className="w-full bg-[#17243B] border border-[#263650] rounded-2xl p-5 mb-6 flex flex-col items-center shadow-lg">
            <span className="text-[11px] uppercase tracking-widest text-indigo-400 font-bold mb-1.5">
              Digital E-Ticket Pass
            </span>
            <span className="text-xl font-mono font-black text-white tracking-widest bg-[#111C32] px-5 py-2 rounded-xl border border-indigo-500/40 shadow-inner">
              {successTicket}
            </span>
            <p className="text-xs text-slate-400 mt-2.5">
              Available instantly under "My Registrations" with your mobile check-in QR pass.
            </p>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="secondary" onClick={handleModalClose} className="flex-1 sm:flex-initial">
              Close
            </Button>
            <Link to="/student/registrations" className="flex-1 sm:flex-initial">
              <Button variant="primary" leftIcon={<Ticket size={16} />} className="w-full">
                View My Passes
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRegister} className="flex flex-col gap-4 text-slate-200">
          {/* Event Quick Overview */}
          <div className="bg-[#17243B] border border-[#263650] rounded-xl p-4 flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase text-indigo-400 tracking-wider">
              {event.category}
            </span>
            <h4 className="font-bold text-white text-base leading-snug">{event.title}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300 mt-1">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-indigo-400 shrink-0" />
                <span>
                  {formatDate(event.startTime)} · {formatTime(event.startTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-blue-400 shrink-0" />
                <span className="truncate">{event.isOnline ? '🌐 Online Event' : (event.venue?.name ?? 'Venue TBD')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-emerald-400 shrink-0" />
                <span className="truncate">By {event.clubName}</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-emerald-400">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{event.maxCapacity - event.registeredCount} seats remaining</span>
              </div>
            </div>
          </div>

          {/* Form Options */}
          <div className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Dietary Preference (if refreshments served)
              </label>
              <select
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                className="w-full text-xs rounded-xl border border-[#263650] bg-[#17243B] text-slate-100 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <option value="Standard">Standard / No preference</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Halal">Halal</option>
                <option value="Kosher">Kosher</option>
                <option value="Gluten-Free">Gluten-Free</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Special Requests or Accessibility Accommodations
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Let the club coordinators know if you require special seating, wheelchair access, or audio assistance..."
                className="w-full text-xs rounded-xl border border-[#263650] bg-[#17243B] text-slate-100 p-2.5 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
              />
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="agree-rules"
                type="checkbox"
                checked={agreeRules}
                onChange={(e) => setAgreeRules(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#263650] bg-[#17243B] text-indigo-600 focus:ring-indigo-500/40 accent-indigo-600"
              />
              <label htmlFor="agree-rules" className="text-xs text-slate-400 select-none cursor-pointer">
                I understand that attendance will be recorded via QR pass, and I agree to adhere to university campus code of conduct during this event.
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/50 text-xs text-rose-300 flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#263650]">
            <Button variant="secondary" size="sm" type="button" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Confirm Registration
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
