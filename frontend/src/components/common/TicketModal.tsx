import type { EventRegistration } from '../../types/registration';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { Calendar, Clock, MapPin, Printer } from 'lucide-react';
import { formatDate, formatTime } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: EventRegistration | null;
}

export default function TicketModal({ isOpen, onClose, registration }: TicketModalProps) {
  const { user } = useAuth();

  if (!registration) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Digital Event Pass" size="md">
      <div className="flex flex-col gap-4">
        {/* Ticket Card */}
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          {/* Top colored strip */}
          <div
            className="absolute top-0 left-0 right-0 h-2"
            style={{ backgroundColor: registration.eventCategoryColor || '#1b3b57' }}
          />

          <div className="flex justify-between items-start pt-1 mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Official Campus Pass
              </span>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {registration.eventTitle}
              </h3>
              <p className="text-xs text-brand-700 font-medium">{registration.clubName}</p>
            </div>
            <Badge variant="success" size="sm" dot>
              {registration.status.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Attendee</span>
              <span className="font-semibold text-slate-800">{user?.fullName ?? 'Samara Jenkins'}</span>
              <span className="text-slate-400 block text-[10px]">{user?.studentId ?? 'STU-2026-8841'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Department</span>
              <span className="font-semibold text-slate-800">{user?.departmentCode ?? 'IT'} / Year 3</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Date</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <Calendar size={11} className="text-slate-400" />
                {formatDate(registration.startTime)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Time</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <Clock size={11} className="text-slate-400" />
                {formatTime(registration.startTime)}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block text-[11px]">Venue</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <MapPin size={11} className="text-slate-400 shrink-0" />
                <span className="truncate">{registration.venueName ?? 'Campus Hall'}</span>
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center pt-4 pb-1">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center shadow-inner">
              {/* Simulated QR Pattern */}
              <div className="w-32 h-32 bg-slate-900 rounded-lg p-2 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-8 h-8 bg-white rounded-sm p-1">
                    <div className="w-full h-full bg-slate-900" />
                  </div>
                  <div className="w-8 h-8 bg-white rounded-sm p-1">
                    <div className="w-full h-full bg-slate-900" />
                  </div>
                </div>
                <div className="flex justify-center items-center">
                  <div className="text-[9px] font-mono text-white tracking-widest uppercase">
                    CAMPUS
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="w-8 h-8 bg-white rounded-sm p-1">
                    <div className="w-full h-full bg-slate-900" />
                  </div>
                  <div className="grid grid-cols-2 gap-1 w-8 h-8">
                    <div className="bg-white" />
                    <div className="bg-white" />
                    <div className="bg-white" />
                    <div className="bg-white" />
                  </div>
                </div>
              </div>
              <p className="text-[11px] font-mono font-bold text-slate-700 tracking-wider mt-2">
                {registration.ticketCode}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Scan this code at the registration desk for instant entry.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" leftIcon={<Printer size={15} />} onClick={handlePrint}>
            Print Pass
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
