import { useState, useMemo } from 'react';
import { Search, Ticket, CheckCircle2, Sparkles } from 'lucide-react';
import { useStudent } from '../../contexts/StudentContext';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import TicketModal from '../../components/common/TicketModal';
import CancelRegistrationModal from '../../components/common/CancelRegistrationModal';
import type { EventRegistration } from '../../types/registration';
import { formatDate, formatTime } from '../../utils';
import { Link } from 'react-router-dom';

type FilterTab = 'all' | 'upcoming' | 'completed' | 'waitlisted' | 'cancelled';

export default function StudentRegistrationsPage() {
  const { registrations, simulateWaitlistPromotion } = useStudent();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<EventRegistration | null>(null);
  const [selectedCancel, setSelectedCancel] = useState<EventRegistration | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSimulatingPromo, setIsSimulatingPromo] = useState(false);

  // Tab counts
  const counts = useMemo(() => {
    const now = new Date();
    return {
      all: registrations.length,
      upcoming: registrations.filter((r) => r.status === 'registered' && new Date(r.startTime) > now).length,
      completed: registrations.filter((r) => r.status === 'attended' || (r.status === 'registered' && new Date(r.endTime) <= now)).length,
      waitlisted: registrations.filter((r) => r.status === 'waitlisted').length,
      cancelled: registrations.filter((r) => r.status === 'cancelled').length,
    };
  }, [registrations]);

  // Filtered registrations
  const filtered = useMemo(() => {
    const now = new Date();
    return registrations.filter((reg) => {
      // Tab matching
      let matchTab = true;
      if (activeTab === 'upcoming') {
        matchTab = reg.status === 'registered' && new Date(reg.startTime) > now;
      } else if (activeTab === 'completed') {
        matchTab = reg.status === 'attended' || (reg.status === 'registered' && new Date(reg.endTime) <= now);
      } else if (activeTab === 'waitlisted') {
        matchTab = reg.status === 'waitlisted';
      } else if (activeTab === 'cancelled') {
        matchTab = reg.status === 'cancelled';
      }

      // Keyword search
      const s = search.toLowerCase();
      const matchSearch =
        search === '' ||
        reg.eventTitle.toLowerCase().includes(s) ||
        reg.clubName.toLowerCase().includes(s) ||
        reg.ticketCode.toLowerCase().includes(s);

      return matchTab && matchSearch;
    });
  }, [registrations, activeTab, search]);

  const handleSimulatePromotion = async (eventId: number) => {
    setIsSimulatingPromo(true);
    try {
      const res = await simulateWaitlistPromotion(eventId);
      if (res.success) {
        setActionFeedback(`🎉 ${res.message}`);
      } else {
        setActionFeedback('No waitlist candidates could be promoted at this time.');
      }
      setTimeout(() => setActionFeedback(null), 8000);
    } catch (err: unknown) {
      setActionFeedback(err instanceof Error ? err.message : 'Simulation failed.');
    } finally {
      setIsSimulatingPromo(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12 text-slate-100">
      <Breadcrumbs
        items={[{ label: 'Student', path: '/student/dashboard' }, { label: 'My Registrations' }]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">My Event Registrations</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage your digital check-in passes, track waitlist status, and view past attendance.
          </p>
        </div>

        <Link to="/student/events">
          <Button variant="primary" size="sm">
            Browse More Events
          </Button>
        </Link>
      </div>

      {/* Feedback Alert */}
      {actionFeedback && (
        <div className="bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 p-4 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Filter Tabs & Search Card */}
      <Card padding="sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold">
            {[
              { id: 'all', label: 'All Registrations', count: counts.all },
              { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
              { id: 'completed', label: 'Completed', count: counts.completed },
              { id: 'waitlisted', label: 'Waitlisted', count: counts.waitlisted },
              { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={[
                  'px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2',
                  activeTab === tab.id
                    ? 'bg-[#4F46E5] text-white shadow-[0_0_12px_rgba(79,70,229,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-[#17243B]',
                ].join(' ')}
              >
                <span>{tab.label}</span>
                <span
                  className={[
                    'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                    activeTab === tab.id
                      ? 'bg-indigo-950 text-indigo-200 border border-indigo-400/40'
                      : 'bg-[#17243B] text-slate-400 border border-[#263650]',
                  ].join(' ')}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by event or ticket code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#263650] bg-[#17243B] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>
      </Card>

      {/* Registrations Table / Card List */}
      {filtered.length === 0 ? (
        <Card className="text-center py-16 text-slate-400">
          <Ticket size={36} className="mx-auto mb-2 text-slate-500" />
          <p className="text-base font-bold text-white">No registrations found in this category.</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Browse our campus events directory to register for upcoming hackathons, workshops, and seminars.
          </p>
          <Link to="/student/events">
            <Button variant="primary" size="sm">
              Discover Events
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="bg-[#111C32] rounded-2xl border border-[#263650] shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-[#17243B] border-b border-[#263650] text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <th className="text-left px-5 py-3.5">Event & Club</th>
                  <th className="text-left px-4 py-3.5 whitespace-nowrap">Event Date & Time</th>
                  <th className="text-left px-4 py-3.5 whitespace-nowrap">Venue</th>
                  <th className="text-left px-4 py-3.5">Status</th>
                  <th className="text-left px-4 py-3.5">Attendance</th>
                  <th className="text-right px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263650]/50">
                {filtered.map((reg) => {
                  const isRegistered = reg.status === 'registered';
                  const isWaitlist = reg.status === 'waitlisted';
                  const isAttended = reg.status === 'attended';
                  const isCancelled = reg.status === 'cancelled';

                  return (
                    <tr key={reg.registrationId} className="hover:bg-[#17243B]/60 transition-colors">
                      {/* Event & Club */}
                      <td className="px-5 py-4">
                        <Link
                          to={`/student/events/${reg.eventId}`}
                          className="font-bold text-white hover:text-indigo-400 line-clamp-1 transition-colors"
                        >
                          {reg.eventTitle}
                        </Link>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span>{reg.clubName}</span>
                          <span>·</span>
                          <span className="font-mono text-[11px] text-cyan-400">{reg.ticketCode}</span>
                        </p>
                      </td>

                      {/* Date & Time */}
                      <td className="px-4 py-4 text-xs text-slate-300 whitespace-nowrap">
                        <div className="font-semibold text-white">{formatDate(reg.startTime)}</div>
                        <div className="text-slate-400">{formatTime(reg.startTime)}</div>
                      </td>

                      {/* Venue */}
                      <td className="px-4 py-4 text-xs text-slate-300 whitespace-nowrap">
                        <span className="truncate max-w-[140px] block">{reg.venueName || 'Campus Venue'}</span>
                      </td>

                      {/* Registration Status */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isRegistered ? (
                          <Badge variant="success" size="sm" dot glow>
                            Confirmed Pass
                          </Badge>
                        ) : isWaitlist ? (
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant="amber" size="sm" dot glow>
                              Waitlist Position #{reg.waitlistPosition ?? 1}
                            </Badge>
                            <button
                              onClick={() => handleSimulatePromotion(reg.eventId)}
                              disabled={isSimulatingPromo}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 font-semibold"
                              title="Click to simulate an opening and test automatic waitlist promotion!"
                            >
                              <Sparkles size={10} />
                              Simulate Promotion
                            </button>
                          </div>
                        ) : isAttended ? (
                          <Badge variant="teal" size="sm" dot>
                            Attended
                          </Badge>
                        ) : isCancelled ? (
                          <Badge variant="danger" size="sm">
                            Cancelled
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">
                            {reg.status}
                          </Badge>
                        )}
                      </td>

                      {/* Attendance */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isAttended ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
                            <CheckCircle2 size={12} className="text-emerald-400" />
                            Verified Present
                          </span>
                        ) : isRegistered ? (
                          <span className="text-xs text-slate-400">Scheduled</span>
                        ) : isWaitlist ? (
                          <span className="text-xs text-amber-400 italic">Pending seat</span>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isRegistered && (
                            <Button
                              variant="outline"
                              size="xs"
                              leftIcon={<Ticket size={13} />}
                              onClick={() => setSelectedTicket(reg)}
                            >
                              View Ticket
                            </Button>
                          )}

                          {isWaitlist && (
                            <Link to={`/student/events/${reg.eventId}`}>
                              <Button variant="outline" size="xs">
                                Event Info
                              </Button>
                            </Link>
                          )}

                          {(isRegistered || isWaitlist) && (
                            <Button
                              variant="ghost"
                              size="xs"
                              className="text-rose-400 hover:bg-rose-950/30 hover:text-rose-300"
                              onClick={() => setSelectedCancel(reg)}
                            >
                              {isWaitlist ? 'Leave' : 'Cancel'}
                            </Button>
                          )}

                          {isAttended && (
                            <Link to="/student/certificates">
                              <Button variant="secondary" size="xs">
                                Certificate
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      <TicketModal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        registration={selectedTicket}
      />

      {/* Cancel Confirmation Modal */}
      <CancelRegistrationModal
        isOpen={!!selectedCancel}
        onClose={() => setSelectedCancel(null)}
        registration={selectedCancel}
        onSuccess={() => {
          setActionFeedback('Registration cancelled successfully. Seat returned to pool.');
          setTimeout(() => setActionFeedback(null), 5000);
        }}
      />
    </div>
  );
}
