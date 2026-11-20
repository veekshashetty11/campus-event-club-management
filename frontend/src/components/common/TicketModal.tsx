import type { EventRegistration } from '../../types/registration';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { Calendar, Clock, MapPin, Printer, ShieldCheck, Ticket as TicketIcon, CheckCircle2 } from 'lucide-react';
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
    <Modal isOpen={isOpen} onClose={onClose} title="Digital Boarding Pass" size="md">
      <div className="flex flex-col gap-5 text-slate-100">
        {/* Digital Boarding Pass Container */}
        <div className="relative bg-[#17243B] border border-[#263650] rounded-2xl overflow-hidden shadow-2xl">
          {/* Top Boarding Pass Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900/80 via-blue-900/70 to-indigo-950/90 p-4 border-b border-[#263650] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <TicketIcon size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                  Campus Digital E-Pass
                </p>
                <h4 className="text-xs font-bold text-white truncate max-w-[200px]">
                  {registration.clubName}
                </h4>
              </div>
            </div>

            <Badge variant="success" size="sm" dot glow>
              {registration.status.toUpperCase()}
            </Badge>
          </div>

          {/* Main Pass Body */}
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Event</p>
              <h3 className="text-base sm:text-lg font-black text-white leading-snug mt-0.5">
                {registration.eventTitle}
              </h3>
            </div>

            {/* Flight / Event Matrix Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#111C32] border border-[#263650] text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendee</span>
                <span className="font-bold text-white text-xs">{user?.fullName ?? 'Student Attendee'}</span>
                <span className="text-[10px] text-indigo-300 font-mono block">{user?.studentId ?? user?.rollNumber ?? 'ID-VERIFIED'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Pass / Reg ID</span>
                <span className="font-mono font-bold text-cyan-300 text-xs">
                  {registration.ticketCode || `REG-${registration.registrationId}`}
                </span>
                <span className="text-[10px] text-slate-400 block">Single Admission</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Date</span>
                <span className="font-semibold text-slate-200 flex items-center gap-1 mt-0.5">
                  <Calendar size={12} className="text-indigo-400" />
                  {formatDate(registration.startTime)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Time</span>
                <span className="font-semibold text-slate-200 flex items-center gap-1 mt-0.5">
                  <Clock size={12} className="text-blue-400" />
                  {formatTime(registration.startTime)}
                </span>
              </div>

              <div className="col-span-2 pt-1 border-t border-[#263650]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Venue Location</span>
                <span className="font-semibold text-slate-200 flex items-center gap-1 mt-0.5 truncate">
                  <MapPin size={12} className="text-rose-400 shrink-0" />
                  <span className="truncate">{registration.venueName ?? 'Campus Hall / Main Auditorium'}</span>
                </span>
              </div>
            </div>

            {/* Perforated Divider Line with Cutout Notches */}
            <div className="relative py-2 flex items-center">
              {/* Left cutout notch */}
              <div className="absolute -left-7 w-5 h-5 rounded-full bg-[#111C32] border-r border-[#263650]" />
              {/* Dashed line */}
              <div className="w-full border-t border-dashed border-[#263650]" />
              {/* Right cutout notch */}
              <div className="absolute -right-7 w-5 h-5 rounded-full bg-[#111C32] border-l border-[#263650]" />
            </div>

            {/* QR Code Verification Section */}
            <div className="flex flex-col items-center justify-center pt-1 pb-1">
              <div className="bg-white p-3 rounded-2xl shadow-lg flex flex-col items-center">
                {/* Visual QR Code pattern */}
                <div className="w-32 h-32 bg-slate-950 rounded-xl p-2.5 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-8 h-8 bg-white rounded-md p-1">
                      <div className="w-full h-full bg-slate-950" />
                    </div>
                    <div className="w-8 h-8 bg-white rounded-md p-1">
                      <div className="w-full h-full bg-slate-950" />
                    </div>
                  </div>
                  <div className="flex justify-center items-center">
                    <div className="text-[9px] font-mono font-black text-indigo-400 tracking-widest uppercase">
                      CAMPUS
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="w-8 h-8 bg-white rounded-md p-1">
                      <div className="w-full h-full bg-slate-950" />
                    </div>
                    <div className="grid grid-cols-2 gap-1 w-8 h-8">
                      <div className="bg-white rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-white rounded-xs" />
                    </div>
                  </div>
                </div>

                <p className="text-[11px] font-mono font-bold text-slate-800 tracking-wider mt-2">
                  {registration.ticketCode || `PASS-${registration.registrationId}`}
                </p>
              </div>

              {/* Mock Label Notice */}
              <div className="flex items-center gap-1.5 mt-3 text-[11px] text-amber-400/90 font-medium bg-amber-950/30 px-3 py-1 rounded-full border border-amber-800/40">
                <ShieldCheck size={13} className="shrink-0" />
                <span>Simulated verification pass · Mock ticket preview</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="secondary" size="sm" leftIcon={<Printer size={15} />} onClick={handlePrint}>
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
