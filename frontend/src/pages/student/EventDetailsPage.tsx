import { useState, useMemo } from 'react';
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
import SimilarEventsSection from '../../components/events/SimilarEventsSection';
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
  Mic,
  Coffee,
  Flag,
  Award,
  Sparkles,
  CheckCircle2,
  CalendarRange,
} from 'lucide-react';
import { formatDate, formatTime, capacityPercent } from '../../utils';

export default function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { getEvent, getRegistrationForEvent, events } = useStudent();

  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const event = getEvent(Number(eventId));
  const registration = getRegistrationForEvent(Number(eventId));

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center text-slate-100">
        <AlertCircle size={40} className="text-rose-400 mb-2" />
        <h2 className="text-xl font-bold text-white">Event Not Found</h2>
        <p className="text-sm text-slate-400 mt-1 mb-4">
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

  // Schedule timeline milestones derived from event times
  const scheduleMilestones = useMemo(() => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const currentTime = new Date();

    const startMs = start.getTime();
    const duration = Math.max(3600000, end.getTime() - startMs);

    const m1 = new Date(startMs);
    const m2 = new Date(startMs + duration * 0.15);
    const m3 = new Date(startMs + duration * 0.45);
    const m4 = new Date(startMs + duration * 0.65);
    const m5 = new Date(startMs + duration * 0.85);
    const m6 = new Date(end.getTime());

    const isDone = (time: Date) => currentTime > time;
    const isOngoing = (s: Date, e: Date) => currentTime >= s && currentTime <= e;

    return [
      {
        id: 's1',
        time: formatTime(m1.toISOString()),
        title: 'Check-in & Registration Desk Open',
        description: 'Verify digital e-tickets and collect official name tags and event materials.',
        speaker: 'Campus Event Coordinators',
        location: event.venue?.name || 'Main Foyer',
        icon: <Clock size={16} className="text-cyan-400" />,
        status: isDone(m2) ? 'completed' : isOngoing(m1, m2) ? 'active' : 'upcoming',
      },
      {
        id: 's2',
        time: formatTime(m2.toISOString()),
        title: 'Opening Remarks & Keynote Address',
        description: `Welcome speech by ${event.clubName} student executive committee and guest keynote.`,
        speaker: event.coordinatorName || 'Faculty Sponsor',
        location: event.venue?.name || 'Auditorium',
        icon: <Mic size={16} className="text-indigo-400" />,
        status: isDone(m3) ? 'completed' : isOngoing(m2, m3) ? 'active' : 'upcoming',
      },
      {
        id: 's3',
        time: formatTime(m3.toISOString()),
        title: 'Core Workshop & Collaborative Session',
        description: `In-depth interactive track covering ${event.category.toLowerCase()} skills, team challenges, and practical exercises.`,
        speaker: 'Lead Instructor & Facilitators',
        location: event.venue?.name || 'Session Hall',
        icon: <Sparkles size={16} className="text-amber-400" />,
        status: isDone(m4) ? 'completed' : isOngoing(m3, m4) ? 'active' : 'upcoming',
      },
      {
        id: 's4',
        time: formatTime(m4.toISOString()),
        title: 'Networking & Refreshment Intermission',
        description: 'Open discussion with peer members, refreshments, and sponsor booth exploration.',
        speaker: 'All Attendees',
        location: 'Dining Lounge',
        icon: <Coffee size={16} className="text-emerald-400" />,
        status: isDone(m5) ? 'completed' : isOngoing(m4, m5) ? 'active' : 'upcoming',
      },
      {
        id: 's5',
        time: formatTime(m5.toISOString()),
        title: 'Project Showcase & Q&A Panel',
        description: 'Student presentations, peer critique, and panel discussion with mentors.',
        speaker: 'Panel Judges & Mentors',
        location: event.venue?.name || 'Main Hall',
        icon: <Flag size={16} className="text-rose-400" />,
        status: isDone(m6) ? 'completed' : isOngoing(m5, m6) ? 'active' : 'upcoming',
      },
      {
        id: 's6',
        time: formatTime(m6.toISOString()),
        title: 'Valedictory & Certificate Verification',
        description: `Official event wrap-up, check-out confirmation, and awarding of +${event.pointsAwarded || 15} activity points.`,
        speaker: 'Organizing Committee',
        location: event.venue?.name || 'Auditorium',
        icon: <Award size={16} className="text-yellow-400" />,
        status: isDone(m6) ? 'completed' : 'upcoming',
      },
    ];
  }, [event]);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12 text-slate-100">
      <Breadcrumbs
        items={[
          { label: 'Student', path: '/student/dashboard' },
          { label: 'Browse Events', path: '/student/events' },
          { label: event.title },
        ]}
      />

      {/* Hero Poster Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#111C32] via-[#17243B] to-[#0D1426] border border-[#263650] shadow-2xl min-h-[220px] sm:min-h-[280px] flex items-end">
        {event.bannerUrl && (
          <img
            src={event.bannerUrl}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080D1B] via-[#080D1B]/70 to-transparent" />

        <div className="relative z-10 p-6 sm:p-8 w-full text-white">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-white shadow-sm"
              style={{ backgroundColor: event.categoryColor || '#4F46E5' }}
            >
              {event.category}
            </span>
            {eventPassed ? (
              <Badge variant="default" size="sm">Completed Event</Badge>
            ) : isRegistered ? (
              <Badge variant="success" size="sm" dot glow>Registered Attendee</Badge>
            ) : isWaitlisted ? (
              <Badge variant="amber" size="sm" dot glow>Waitlisted (#{registration?.waitlistPosition})</Badge>
            ) : isFull ? (
              <Badge variant="danger" size="sm">Capacity Reached</Badge>
            ) : (
              <Badge variant="teal" size="sm">Registration Open</Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
            {event.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 flex items-center gap-2">
            <span>Organized by <strong className="text-white">{event.clubName}</strong></span>
            <span>·</span>
            <span>Earn <strong className="text-amber-400">+{event.pointsAwarded}</strong> Campus Points</span>
          </p>
        </div>
      </div>

      {/* Main Grid: Left Details & Right Action Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Full Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card padding="lg">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <FileText size={18} className="text-indigo-400" />
              Event Overview
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </Card>

          {/* Interactive Event Schedule Timeline */}
          <Card padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#263650]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarRange size={18} className="text-indigo-400" />
                  Interactive Event Schedule Timeline
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological schedule of keynote sessions, workshops, networking, and certificate awarding.
                </p>
              </div>
              <Badge variant="primary" size="sm">
                {formatDate(event.startTime)}
              </Badge>
            </div>

            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#263650]">
              {scheduleMilestones.map((m, idx) => (
                <div key={m.id} className="relative group">
                  {/* Connected timeline node */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full border flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${
                      m.status === 'completed'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : m.status === 'active'
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/40 animate-pulse'
                        : 'bg-[#17243B] border-[#263650] text-slate-400'
                    }`}
                  >
                    {m.status === 'completed' ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : (
                      m.icon
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      m.status === 'active'
                        ? 'bg-[#17243B] border-indigo-500/50 shadow-lg shadow-indigo-950/40'
                        : 'bg-[#17243B]/60 hover:bg-[#17243B] border-[#263650]/70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
                          {m.time}
                        </span>
                        <h4 className="font-bold text-white text-sm">{m.title}</h4>
                      </div>

                      {m.status === 'completed' ? (
                        <Badge variant="success" size="sm">Completed</Badge>
                      ) : m.status === 'active' ? (
                        <Badge variant="primary" size="sm" dot glow>Active Now</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Scheduled</Badge>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mt-1">
                      {m.description}
                    </p>

                    <div className="flex items-center gap-4 mt-2.5 pt-2 border-t border-[#263650]/60 text-[11px] text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users size={12} className="text-indigo-400" />
                        <span className="text-slate-300 font-medium">{m.speaker}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-rose-400" />
                        <span className="text-slate-300">{m.location}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Objectives */}
          {event.objectives && event.objectives.length > 0 && (
            <Card padding="lg">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Target size={18} className="text-cyan-400" />
                Key Objectives & Learning Outcomes
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                {event.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Eligibility & Rules */}
          <Card padding="lg">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-400" />
              Eligibility & Guidelines
            </h3>
            <div className="space-y-3.5 text-sm text-slate-300">
              <div>
                <strong className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">
                  Eligibility Criteria
                </strong>
                <p>{event.eligibility || 'Open to all currently enrolled campus students.'}</p>
              </div>

              {event.rules && (
                <div className="pt-2 border-t border-[#263650]">
                  <strong className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">
                    Event Rules & Instructions
                  </strong>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
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
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Users size={18} className="text-indigo-400" />
              Coordinator & Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm bg-[#17243B] p-4 rounded-xl border border-[#263650]">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Event Coordinator</span>
                <span className="font-semibold text-white">{event.coordinatorName || event.organizerName}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Contact Email</span>
                <span className="font-semibold text-white flex items-center gap-1.5 truncate">
                  <Mail size={13} className="text-indigo-400" />
                  {event.coordinatorEmail || event.organizerEmail}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Phone Helpline</span>
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Phone size={13} className="text-cyan-400" />
                  {event.coordinatorPhone || '+1-555-0104'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Column: Schedule, Capacity & Dynamic Action Box */}
        <div className="space-y-5">
          {/* Action Box */}
          <Card padding="lg" className="border-t-4 border-t-indigo-500 shadow-xl">
            <h3 className="text-base font-bold text-white mb-3">Event Registration</h3>

            {/* Capacity Gauge */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-slate-300 font-semibold">
                <span>Capacity Filled</span>
                <span>{event.registeredCount} / {event.maxCapacity} ({filledPct}%)</span>
              </div>
              <div className="w-full h-2 bg-[#17243B] rounded-full overflow-hidden border border-[#263650]">
                <div
                  className={[
                    'h-full rounded-full transition-all duration-300',
                    filledPct >= 100 ? 'bg-rose-500' : filledPct >= 80 ? 'bg-amber-400' : 'bg-emerald-400',
                  ].join(' ')}
                  style={{ width: `${filledPct}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">
                {isFull ? (
                  <span className="text-rose-400 font-bold">
                    Event is full ({event.waitlistCount} waiting in queue)
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold">{spotsLeft} seats remaining</span>
                )}
              </p>
            </div>

            {/* Dynamic Registration State Actions */}
            <div className="space-y-2.5 pt-3 border-t border-[#263650]">
              {eventPassed ? (
                <div className="bg-[#17243B] p-3 rounded-xl text-center text-xs text-slate-400 font-medium">
                  This event concluded on {formatDate(event.endTime)}.
                </div>
              ) : isRegistered ? (
                <div className="space-y-2">
                  <div className="bg-emerald-950/40 border border-emerald-700/50 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                    <span>You are registered! Your seat is secured.</span>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    leftIcon={<Ticket size={16} />}
                    onClick={() => setIsTicketModalOpen(true)}
                  >
                    View Digital Pass
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-rose-400 hover:bg-rose-950/30"
                    onClick={() => setIsCancelModalOpen(true)}
                  >
                    Cancel Registration
                  </Button>
                </div>
              ) : isWaitlisted ? (
                <div className="space-y-2">
                  <div className="bg-amber-950/40 border border-amber-700/50 text-amber-200 p-3 rounded-xl text-xs flex items-start gap-2">
                    <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-300">Waitlisted at #{registration?.waitlistPosition}</strong>
                      <p className="text-[11px] text-amber-200/80 mt-0.5">
                        You will be promoted automatically if another student cancels.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-slate-300"
                    onClick={() => setIsCancelModalOpen(true)}
                  >
                    Leave Waitlist
                  </Button>
                </div>
              ) : deadlinePassed ? (
                <div className="bg-[#17243B] p-3 rounded-xl text-center text-xs text-slate-400 font-medium">
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
          <Card padding="md" className="space-y-3.5 text-xs text-slate-300">
            <h4 className="font-bold text-white text-sm">Schedule & Location</h4>

            <div className="flex items-start gap-2.5">
              <Calendar size={15} className="text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">Date</span>
                <span>{formatDate(event.startTime)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock size={15} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">Timing</span>
                <span>{formatTime(event.startTime)} – {formatTime(event.endTime)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">Location</span>
                <span>{event.isOnline ? 'Online via Web Link' : (event.venue?.name ?? 'Campus Venue')}</span>
                {event.venue && (
                  <span className="text-slate-400 block text-[11px]">
                    {event.venue.building}, {event.venue.roomNumber}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-2 border-t border-[#263650]">
              <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">Registration Deadline</span>
                <span className="text-amber-300 font-semibold">{formatDate(event.registrationDeadline)} at 11:59 PM</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* AI Similar Events Recommendations */}
      <SimilarEventsSection currentEvent={event} allEvents={events} />

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
