import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStudent } from '../../contexts/StudentContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import RegistrationModal from '../../components/common/RegistrationModal';
import WaitlistModal from '../../components/common/WaitlistModal';
import CancelRegistrationModal from '../../components/common/CancelRegistrationModal';
import TicketModal from '../../components/common/TicketModal';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  FileText,
  Target,
  ShieldAlert,
  ArrowLeft,
  Ticket,
} from 'lucide-react';
import { formatDate, formatTime, capacityPercent } from '../../utils';

export default function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { getEvent, getRegistrationForEvent } = useStudent();

  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const event = getEvent(Number(eventId));
  const registration = getRegistrationForEvent(Number(eventId));

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <AlertCircle size={40} className="text-red-400 mb-2" />
        <h2 className="text-xl font-bold text-slate-800">Event Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          The event you requested could not be located in the campus database.
        </p>
        <Link to="/student/events">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft size={14} />}>
            Back to Browse Events
          </Button>
        </Link>
      </div>
    );
  }

  const now = new Date();
  const deadlinePassed = now > new Date(event.registrationDeadline);
  const eventPassed = event.status === 'completed' || now > new Date(event.endTime);
  const spotsLeft = event.maxCapacity - event.registeredCount;
  const isFull = spotsLeft <= 0;
  const filledPct = capacityPercent(event.registeredCount, event.maxCapacity);

  // Status button logic
  const isRegistered = registration?.status === 'registered';
  const isWaitlisted = registration?.status === 'waitlisted';

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      <Breadcrumbs
        items={[
          { label: 'Student', path: '/student/dashboard' },
          { label: 'Browse Events', path: '/student/events' },
          { label: event.title },
        ]}
      />

      {/* Hero Poster Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-brand-900 shadow-md min-h-[220px] sm:min-h-[280px] flex items-end">
        {event.bannerUrl && (
          <img
            src={event.bannerUrl}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-overlay"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/60 to-transparent" />

        <div className="relative z-10 p-6 sm:p-8 w-full text-white">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md text-white shadow-sm"
              style={{ backgroundColor: event.categoryColor || '#0d9488' }}
            >
              {event.category}
            </span>
            {eventPassed ? (
              <Badge variant="default" size="sm">Completed Event</Badge>
            ) : isRegistered ? (
              <Badge variant="success" size="sm" dot>Registered Attendee</Badge>
            ) : isWaitlisted ? (
              <Badge variant="amber" size="sm" dot>Waitlisted (#{registration?.waitlistPosition})</Badge>
            ) : isFull ? (
              <Badge variant="danger" size="sm">Capacity Reached</Badge>
            ) : (
              <Badge variant="teal" size="sm">Registration Open</Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
            {event.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 flex items-center gap-2">
            <span>Organized by <strong>{event.clubName}</strong></span>
            <span>·</span>
            <span>Earn <strong>+{event.pointsAwarded}</strong> Campus Points</span>
          </p>
        </div>
      </div>

      {/* Main Grid: Left Details & Right Action Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Full Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card padding="lg">
            <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
              <FileText size={18} className="text-brand-700" />
              Event Overview
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </Card>

          {/* Objectives */}
          {event.objectives && event.objectives.length > 0 && (
            <Card padding="lg">
              <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Target size={18} className="text-teal-600" />
                Key Objectives & Learning Outcomes
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                {event.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle size={15} className="text-teal-600 shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Eligibility & Rules */}
          <Card padding="lg">
            <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-600" />
              Eligibility & Guidelines
            </h3>
            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <strong className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Eligibility Criteria
                </strong>
                <p>{event.eligibility || 'Open to all currently enrolled campus students.'}</p>
              </div>

              {event.rules && event.rules.length > 0 && (
                <div className="pt-2">
                  <strong className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Event Rules & Instructions
                  </strong>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    {Array.isArray(event.rules)
                      ? event.rules.map((rule: string, idx: number) => <li key={idx}>{rule}</li>)
                      : <li>{event.rules}</li>}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          {/* Coordinator & Contact */}
          <Card padding="lg">
            <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Users size={18} className="text-brand-700" />
              Coordinator & Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-400 block">Event Coordinator</span>
                <span className="font-semibold text-slate-800">{event.coordinatorName || event.organizerName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Contact Email</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                  <Mail size={13} className="text-slate-400" />
                  {event.coordinatorEmail || event.organizerEmail}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Phone Helpline</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-400" />
                  {event.coordinatorPhone || '+1-555-0104'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Column: Schedule, Capacity & Dynamic Action Box */}
        <div className="space-y-5">
          {/* Action Box */}
          <Card padding="lg" className="border-t-4 border-t-brand-800 shadow-card">
            <h3 className="text-base font-bold text-slate-900 mb-3">Event Registration</h3>

            {/* Capacity Gauge */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Capacity Filled</span>
                <span>{event.registeredCount} / {event.maxCapacity} ({filledPct}%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={[
                    'h-full rounded-full transition-all duration-300',
                    filledPct >= 100 ? 'bg-red-500' : filledPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500',
                  ].join(' ')}
                  style={{ width: `${filledPct}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                {isFull ? (
                  <span className="text-red-600 font-semibold">
                    Event is full ({event.waitlistCount} waiting in queue)
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold">{spotsLeft} seats remaining</span>
                )}
              </p>
            </div>

            {/* Dynamic Registration State Actions */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              {eventPassed ? (
                <div className="bg-slate-100 p-3 rounded-xl text-center text-xs text-slate-500 font-medium">
                  This event concluded on {formatDate(event.endTime)}.
                </div>
              ) : isRegistered ? (
                <div className="space-y-2">
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                    <span>You are registered! Your seat is secured.</span>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    leftIcon={<Ticket size={16} />}
                    onClick={() => setIsTicketModalOpen(true)}
                  >
                    View E-Ticket
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-red-600 hover:bg-red-50"
                    onClick={() => setIsCancelModalOpen(true)}
                  >
                    Cancel Registration
                  </Button>
                </div>
              ) : isWaitlisted ? (
                <div className="space-y-2">
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs flex items-start gap-2">
                    <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Waitlisted at #{registration?.waitlistPosition}</strong>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        You will be promoted automatically if another student cancels.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-slate-600"
                    onClick={() => setIsCancelModalOpen(true)}
                  >
                    Leave Waitlist
                  </Button>
                </div>
              ) : deadlinePassed ? (
                <div className="bg-slate-100 p-3 rounded-xl text-center text-xs text-slate-500 font-medium">
                  Registration closed on {formatDate(event.registrationDeadline)}.
                </div>
              ) : isFull ? (
                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full"
                    leftIcon={<Users size={16} />}
                    onClick={() => setIsWaitlistModalOpen(true)}
                  >
                    Join Waitlist (#{(event.waitlistCount || 0) + 1})
                  </Button>
                  <p className="text-[11px] text-slate-400 text-center">
                    Auto-promotes if a registered attendee cancels.
                  </p>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => setIsRegModalOpen(true)}
                >
                  Register Now
                </Button>
              )}
            </div>
          </Card>

          {/* Time & Venue Info Box */}
          <Card padding="md" className="space-y-3.5 text-xs text-slate-600">
            <h4 className="font-bold text-slate-800 text-sm">Schedule & Location</h4>

            <div className="flex items-start gap-2.5">
              <Calendar size={15} className="text-brand-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 block">Date</span>
                <span>{formatDate(event.startTime)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock size={15} className="text-brand-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 block">Timing</span>
                <span>{formatTime(event.startTime)} – {formatTime(event.endTime)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin size={15} className="text-brand-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 block">Location</span>
                <span>{event.isOnline ? 'Online via Web Link' : (event.venue?.name ?? 'Campus Venue')}</span>
                {event.venue && (
                  <span className="text-slate-400 block text-[11px]">
                    {event.venue.building}, {event.venue.roomNumber}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
              <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 block">Registration Deadline</span>
                <span className="text-amber-700 font-medium">{formatDate(event.registrationDeadline)} at 11:59 PM</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <RegistrationModal
        isOpen={isRegModalOpen}
        onClose={() => setIsRegModalOpen(false)}
        event={event}
      />
      <WaitlistModal
        isOpen={isWaitlistModalOpen}
        onClose={() => setIsWaitlistModalOpen(false)}
        event={event}
      />
      <CancelRegistrationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        registration={registration ?? null}
      />
      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        registration={registration ?? null}
      />
    </div>
  );
}
